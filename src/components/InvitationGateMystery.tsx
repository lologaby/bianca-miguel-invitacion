import { FormEvent, useEffect, useRef, useState } from 'react';
import { localDemoInvitation, type InvitationPayload } from '../types/invitation';
import './mystery-gate.css';

interface Props { onReveal: (invitation: InvitationPayload) => void; }

export function InvitationGate({ onReveal }: Props) {
  const [code, setCode] = useState('');
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);

  async function authorize(body: { code?: string; linkToken?: string }) {
    setBusy(true);
    setStatus(body.linkToken ? 'Abriendo…' : 'Comprobando tu código…');
    try {
      const response = await fetch('/api/guest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('invalid');
      onReveal(await response.json() as InvitationPayload);
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
    const url = new URL(window.location.href);
    const token = url.searchParams.get('invite');
    if (token) {
      setLinkToken(token);
      url.searchParams.delete('invite');
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
      return;
    }
    if (isLocal) return;
    void fetch('/api/session', { headers: { accept: 'application/json' } }).then(async (response) => {
      if (response.ok && response.headers.get('content-type')?.includes('application/json')) onReveal(await response.json() as InvitationPayload);
    }).catch(() => undefined);
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
      onReveal(localDemoInvitation);
      return;
    }
    void authorize({ code: value });
  }

  function revealCode() {
    setShowCode(true);
    window.setTimeout(() => input.current?.focus(), 0);
  }

  return (
    <main className="private-gate mystery-gate">
      <div className="private-gate-mark mystery-seal" aria-hidden="true"><span /></div>
      <section aria-labelledby="gate-title">
        <h1 id="gate-title">Algo especial<br/><i>te espera.</i></h1>
        <p className="private-gate-copy">Hay un momento guardado detrás de esta puerta. Ábrelo cuando estés listo.</p>

        {linkToken && !showCode ? (
          <div className="mystery-actions">
            <button className="mystery-reveal" type="button" disabled={busy} onClick={() => void authorize({ linkToken })}>
              <span>{busy ? 'Abriendo…' : 'Descubrir'}</span><b aria-hidden="true">→</b>
            </button>
            <button className="code-toggle" type="button" onClick={revealCode}>Usar un código</button>
          </div>
        ) : !showCode ? (
          <button className="mystery-reveal" type="button" onClick={revealCode}>
            <span>Tengo un código</span><b aria-hidden="true">→</b>
          </button>
        ) : (
          <form className="mystery-code-form" onSubmit={submit}>
            <label htmlFor="guest-code">Tu código</label>
            <div>
              <input ref={input} id="guest-code" autoComplete="one-time-code" inputMode="text" value={code} onChange={(event) => setCode(event.target.value)} maxLength={32} disabled={busy}/>
              <button disabled={busy}>{busy ? 'Abriendo…' : 'Continuar'}</button>
            </div>
            {isLocal && <small>Prueba local: <code>INVITACION-DEMO</code></small>}
          </form>
        )}
        <p className="form-status" role="status" aria-live="polite">{status}</p>
      </section>
      <p className="private-note">Solo para quien recibió la señal.</p>
    </main>
  );
}
