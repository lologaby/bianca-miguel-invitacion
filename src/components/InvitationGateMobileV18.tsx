import { FormEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { localDemoInvitation, type InvitationPayload } from '../types/invitation';
import { InvitationEnvelope } from './InvitationEnvelope';
import './mystery-gate.css';

interface Props { onReveal: (invitation: InvitationPayload) => void; }

type ReviewMode = 'entrada' | 'sobre' | null;

function EntryArrow() {
  return <svg className="gate-action-arrow" viewBox="0 0 24 16" aria-hidden="true"><path d="M2 8h19m-6-5 6 5-6 5" /></svg>;
}

export function InvitationGate({ onReveal }: Props) {
  const initialUrl = new URL(window.location.href);
  const reviewMode = initialUrl.searchParams.get('vista') as ReviewMode;
  const initialLinkToken = initialUrl.searchParams.get('invite');
  const [code, setCode] = useState('');
  const [linkToken, setLinkToken] = useState<string | null>(initialLinkToken);
  const [showCode, setShowCode] = useState(reviewMode === 'entrada' || !initialLinkToken);
  const [status, setStatus] = useState('');
  const [hasError, setHasError] = useState(false);
  const [invalidCode, setInvalidCode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [opening, setOpening] = useState(false);
  const [pendingInvitation, setPendingInvitation] = useState<InvitationPayload | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const composition = useRef<HTMLElement>(null);
  const pending = useRef<InvitationPayload | null>(null);
  const finished = useRef(false);
  const fallbackTimer = useRef<number | null>(null);
  const authorizationRequest = useRef<AbortController | null>(null);
  const sessionRequest = useRef<AbortController | null>(null);
  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  /*
   * Design-preview builds (GitHub Pages) have no API behind them, so the gate
   * could never open and the invitation could never be reviewed. With this flag
   * the demo invitation is shown straight away — and only ever the demo, which
   * carries placeholder venues and no real number.
   */
  const isDemoBuild = import.meta.env.VITE_DEMO_PREVIEW === '1';

  /*
   * Both of these used to reveal from a useEffect, which runs AFTER paint: the
   * gate drew a full dark screen — wax seal and all — for one frame and then
   * vanished. That flash is the "pop" a guest reports. Decide it here and
   * reveal in a layout effect, so the gate is never painted at all.
   */
  const skipGate = (isDemoBuild && !reviewMode)
    || ((isLocal || isDemoBuild) && initialUrl.searchParams.get('qa') === 'content');

  /*
   * A guest who already holds a session cookie used to watch the whole gate —
   * dark screen, envelope, wax seal — paint for as long as /api/session took
   * and then vanish. That is the "pop" a guest sees on reopening the link.
   * Hold a plain background until the answer is in, so nothing pops.
   */
  const [checkingSession, setCheckingSession] = useState(
    !skipGate && !isLocal && !isDemoBuild && reviewMode !== 'entrada' && !initialLinkToken,
  );

  useLayoutEffect(() => {
    if (skipGate) onReveal(localDemoInvitation);
  }, []);

  function finishReveal() {
    if (finished.current || !pending.current) return;
    finished.current = true;
    if (fallbackTimer.current !== null) window.clearTimeout(fallbackTimer.current);
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    onReveal(pending.current);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' }));
  }

  function beginEnvelopeReveal(invitation: InvitationPayload) {
    pending.current = invitation;
    /*
     * Reduced motion means no envelope, not a fast one. Mounting it for 260ms
     * and tearing it down again is the same "pop": a dark screen with a wax
     * seal that appears and disappears inside a third of a second.
     */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finishReveal();
      return;
    }
    input.current?.blur();
    const envelope = composition.current?.querySelector('.stationery-envelope');
    if (envelope && composition.current) {
      const rect = envelope.getBoundingClientRect();
      composition.current.style.setProperty('--envelope-origin-x', (rect.x + rect.width / 2 - window.innerWidth / 2) + 'px');
      composition.current.style.setProperty('--envelope-origin-y', (rect.y + rect.height / 2 - window.innerHeight / 2) + 'px');
    }
    setPendingInvitation(invitation);
    setCode('');
    setLinkToken(null);
    setHasError(false);
    setStatus('Invitación confirmada. Abriendo…');
    setOpening(true);
    fallbackTimer.current = window.setTimeout(finishReveal, 4600);
  }

  async function authorize(body: { code?: string; linkToken?: string }) {
    if (authorizationRequest.current || opening) return;
    sessionRequest.current?.abort();
    sessionRequest.current = null;
    setCheckingSession(false);
    const controller = new AbortController();
    authorizationRequest.current = controller;
    let timedOut = false;
    const timeout = window.setTimeout(() => { timedOut = true; controller.abort(); }, 12000);
    setBusy(true);
    setHasError(false);
    setInvalidCode(false);
    setStatus(body.linkToken ? 'Preparando tu sobre…' : 'Comprobando tu código…');
    try {
      const response = await fetch('/api/guest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (response.status === 401 || response.status === 403) throw new Error('invalid');
      if (response.status === 429) throw new Error('rate-limit');
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('unavailable');
      const invitation = await response.json() as InvitationPayload;
      if (authorizationRequest.current !== controller) return;
      beginEnvelopeReveal(invitation);
    } catch (error) {
      if (authorizationRequest.current !== controller) return;
      const invalid = error instanceof Error && error.message === 'invalid';
      const rateLimited = error instanceof Error && error.message === 'rate-limit';
      setHasError(true);
      setInvalidCode(invalid && !body.linkToken);
      setStatus(invalid
        ? (body.linkToken
          ? 'Este enlace ya no está activo. Puedes usar el código que recibiste.'
          : 'Ese código no coincide. Revísalo e inténtalo de nuevo.')
        : rateLimited
          ? 'Hemos recibido varios intentos. Espera un momento e inténtalo de nuevo.'
          : timedOut
            ? 'La conexión está tardando más de lo esperado. Puedes intentarlo de nuevo.'
            : 'No pudimos conectar para abrir tu invitación. Inténtalo de nuevo en un momento.');
      if (invalid && body.linkToken) setShowCode(true);
      if (!body.linkToken || invalid) window.setTimeout(() => input.current?.focus(), 0);
    } finally {
      window.clearTimeout(timeout);
      if (authorizationRequest.current === controller) {
        authorizationRequest.current = null;
        setBusy(false);
      }
    }
  }

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    const url = new URL(window.location.href);
    // ?vista=entrada and ?vista=sobre stay reachable so both screens can be reviewed
    if (skipGate) return;
    const token = url.searchParams.get('invite');
    if (token) {
      setLinkToken(token);
      url.searchParams.delete('invite');
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
      return;
    }
    if (isLocal || isDemoBuild || reviewMode === 'entrada') return;
    const controller = new AbortController();
    sessionRequest.current = controller;
    let timedOut = false;
    // Show the access controls promptly; cancel this lookup if the guest uses them.
    const guard = window.setTimeout(() => setCheckingSession(false), 2500);
    const timeout = window.setTimeout(() => { timedOut = true; controller.abort(); }, 12000);
    void fetch('/api/session', { headers: { accept: 'application/json' }, signal: controller.signal }).then(async (response) => {
      if (sessionRequest.current !== controller) return;
      if (response.status === 401) { setCheckingSession(false); return; }
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('unavailable');
      const invitation = await response.json() as InvitationPayload;
      if (sessionRequest.current !== controller) return;
      setCheckingSession(false);
      if (reviewMode === 'sobre') beginEnvelopeReveal(invitation);
      else onReveal(invitation);
    }).catch(() => {
      if (sessionRequest.current !== controller || (controller.signal.aborted && !timedOut)) return;
      setCheckingSession(false);
      setHasError(true);
      setStatus('No pudimos recuperar tu invitación. Puedes entrar con el código que recibiste.');
    }).finally(() => {
      window.clearTimeout(guard);
      window.clearTimeout(timeout);
      if (sessionRequest.current === controller) sessionRequest.current = null;
    });
    return () => {
      if (sessionRequest.current === controller) sessionRequest.current = null;
      controller.abort();
      window.clearTimeout(guard);
      window.clearTimeout(timeout);
    };
  }, []);

  useEffect(() => () => {
    if (fallbackTimer.current !== null) window.clearTimeout(fallbackTimer.current);
    authorizationRequest.current?.abort();
    authorizationRequest.current = null;
  }, []);

  useEffect(() => {
    if (!opening) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finishWithoutMotion = () => { if (preference.matches) finishReveal(); };
    preference.addEventListener('change', finishWithoutMotion);
    return () => preference.removeEventListener('change', finishWithoutMotion);
  }, [opening]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || opening) return;
    const value = code.trim();
    if (!value) {
      setHasError(true);
      setInvalidCode(true);
      setStatus('Escribe el código que recibiste.');
      input.current?.focus();
      return;
    }
    if ((isLocal || isDemoBuild) && value.toUpperCase() === 'INVITACION-DEMO') {
      beginEnvelopeReveal(localDemoInvitation);
      return;
    }
    void authorize({ code: value });
  }

  function revealCode() {
    setHasError(false);
    setInvalidCode(false);
    setStatus('');
    setShowCode(true);
    window.setTimeout(() => input.current?.focus(), 0);
  }

  if (skipGate) return null;
  // the background alone — no envelope, no seal, nothing to pop
  if (checkingSession) return <main className="private-gate mystery-gate is-checking" aria-busy="true" />;

  return (
    <main className={'private-gate mystery-gate' + (opening ? ' is-opening' : '') + (hasError ? ' has-error' : '')}>
      <section ref={composition} className="mystery-gate-composition" aria-labelledby="gate-title">
        <div className="mystery-intro" aria-hidden={opening || undefined}>
          <h1 id="gate-title">Algo especial<br/><i>te espera.</i></h1>
        </div>

        <InvitationEnvelope invitation={pendingInvitation} opening={opening} onComplete={finishReveal} />

        <div className="mystery-access" aria-hidden={opening || undefined}>
          <p className="private-gate-copy">{linkToken && !showCode ? 'Abre el sobre para descubrir tu invitación.' : 'Ingresa el código que recibiste para abrir el sobre.'}</p>

          {linkToken && !showCode ? (
            <div className="mystery-actions">
              <button className="mystery-reveal" type="button" disabled={busy || opening} onClick={() => void authorize({ linkToken })}>
                <span>{busy ? 'Preparando…' : 'Abrir el sobre'}</span><EntryArrow />
              </button>
              <button className="code-toggle" type="button" disabled={busy || opening} onClick={revealCode}>Usar un código</button>
            </div>
          ) : !showCode ? (
            <button className="mystery-reveal" type="button" disabled={opening} onClick={revealCode}>
              <span>Escribir el código</span><EntryArrow />
            </button>
          ) : (
            <form className="mystery-code-form" onSubmit={submit}>
              <label htmlFor="guest-code">Código de invitación</label>
              <div>
                <input
                  ref={input}
                  id="guest-code"
                  autoComplete="one-time-code"
                  inputMode="text"
                  aria-invalid={invalidCode || undefined}
                  aria-describedby="guest-code-status"
                  spellCheck={false}
                  value={code}
                  onChange={(event) => {
                    setCode(event.target.value);
                    if (hasError) { setHasError(false); setInvalidCode(false); setStatus(''); }
                  }}
                  maxLength={32}
                  disabled={busy || opening}
                />
                <button disabled={busy || opening}><span>{busy ? 'Comprobando…' : 'Abrir sobre'}</span><EntryArrow /></button>
              </div>
              {(isLocal || isDemoBuild) && <small>Prueba: <code>INVITACION-DEMO</code></small>}
            </form>
          )}
          <p id="guest-code-status" className="form-status" role="status" aria-live="polite">{status}</p>
        </div>
      </section>
      <p className="private-note" aria-hidden={opening || undefined}>Solo para quien recibió esta invitación.</p>
    </main>
  );
}
