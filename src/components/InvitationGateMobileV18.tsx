import { FormEvent, useEffect, useRef, useState } from 'react';
import { localDemoInvitation, type InvitationPayload } from '../types/invitation';
import { InvitationEnvelope } from './InvitationEnvelope';
import './mystery-gate.css';

interface Props { onReveal: (invitation: InvitationPayload) => void; }

type ReviewMode = 'entrada' | 'sobre' | null;

export function InvitationGate({ onReveal }: Props) {
  const reviewMode = new URL(window.location.href).searchParams.get('vista') as ReviewMode;
  const [code, setCode] = useState('');
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(reviewMode === 'entrada');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [opening, setOpening] = useState(false);
  const [pendingInvitation, setPendingInvitation] = useState<InvitationPayload | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const pending = useRef<InvitationPayload | null>(null);
  const finished = useRef(false);
  const fallbackTimer = useRef<number | null>(null);
  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);

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
    setPendingInvitation(invitation);
    setCode('');
    setLinkToken(null);
    setStatus('Invitación confirmada. Abriendo…');
    setOpening(true);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    fallbackTimer.current = window.setTimeout(finishReveal, reducedMotion ? 260 : 2900);
  }

  async function authorize(body: { code?: string; linkToken?: string }) {
    setBusy(true);
    setStatus(body.linkToken ? 'Preparando…' : 'Comprobando tu código…');
    try {
      const response = await fetch('/api/guest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('invalid');
      beginEnvelopeReveal(await response.json() as InvitationPayload);
    } catch {
      setStatus(body.linkToken
        ? 'Este enlace ya no está activo. Puedes usar el código que recibiste.'
        : 'Ese código no coincide. Revísalo e intenta otra vez.');
      if (body.linkToken) setShowCode(true);
      window.setTimeout(() => input.current?.focus(), 0);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    const url = new URL(window.location.href);
    const token = url.searchParams.get('invite');
    if (token) {
      setLinkToken(token);
      url.searchParams.delete('invite');
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
      return;
    }
    if (isLocal || reviewMode === 'entrada') return;
    void fetch('/api/session', { headers: { accept: 'application/json' } }).then(async (response) => {
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) return;
      const invitation = await response.json() as InvitationPayload;
      if (reviewMode === 'sobre') beginEnvelopeReveal(invitation);
      else onReveal(invitation);
    }).catch(() => undefined);
  }, []);

  useEffect(() => () => {
    if (fallbackTimer.current !== null) window.clearTimeout(fallbackTimer.current);
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = code.trim();
    if (!value) {
      setStatus('Escribe el código que recibiste.');
      input.current?.focus();
      return;
    }
    if (isLocal && value.toUpperCase() === 'INVITACION-DEMO') {
      beginEnvelopeReveal(localDemoInvitation);
      return;
    }
    void authorize({ code: value });
  }

  function revealCode() {
    setShowCode(true);
    window.setTimeout(() => input.current?.focus(), 0);
  }

  return (
    <main className={`private-gate mystery-gate${opening ? ' is-opening' : ''}`}>
      <div className="private-gate-mark mystery-seal" aria-hidden="true"><span /></div>
      <section aria-labelledby="gate-title" aria-hidden={opening || undefined}>
        <h1 id="gate-title">Algo especial<br/><i>te espera.</i></h1>
        <p className="private-gate-copy">Hay un momento guardado detrás de esta puerta. Ábrelo cuando estés listo.</p>

        {linkToken && !showCode ? (
          <div className="mystery-actions">
            <button className="mystery-reveal" type="button" disabled={busy || opening} onClick={() => void authorize({ linkToken })}>
              <span>{busy ? 'Preparando…' : 'Descubrir'}</span><b aria-hidden="true">→</b>
            </button>
            <button className="code-toggle" type="button" disabled={opening} onClick={revealCode}>Usar un código</button>
          </div>
        ) : !showCode ? (
          <button className="mystery-reveal" type="button" disabled={opening} onClick={revealCode}>
            <span>Tengo un código</span><b aria-hidden="true">→</b>
          </button>
        ) : (
          <form className="mystery-code-form" onSubmit={submit}>
            <label htmlFor="guest-code">Tu código</label>
            <div>
              <input ref={input} id="guest-code" autoComplete="one-time-code" inputMode="text" value={code} onChange={(event) => setCode(event.target.value)} maxLength={32} disabled={busy || opening}/>
              <button disabled={busy || opening}>{busy ? 'Comprobando…' : 'Abrir'}</button>
            </div>
            {isLocal && <small>Prueba local: <code>INVITACION-DEMO</code></small>}
          </form>
        )}
        <p className="form-status" role="status" aria-live="polite">{status}</p>
      </section>
      <p className="private-note">Solo para quien recibió la señal.</p>

      {opening && pendingInvitation ? <InvitationEnvelope invitation={pendingInvitation} onComplete={finishReveal} /> : null}
    </main>
  );
}
