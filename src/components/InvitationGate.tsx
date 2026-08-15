import { FormEvent, useEffect, useRef, useState } from 'react';
import { localDemoInvitation, type InvitationPayload } from '../types/invitation';

interface Props { onReveal: (invitation: InvitationPayload) => void; }

export function InvitationGate({ onReveal }: Props) {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);

  async function authorize(body: { code?: string; linkToken?: string }) {
    setBusy(true);
    setStatus(body.linkToken ? 'Abriendo tu invitación…' : 'Verificando tu código…');
    try {
      const response = await fetch('/api/guest', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('invalid');
      onReveal(await response.json() as InvitationPayload);
    } catch {
      setStatus(body.linkToken ? 'Este enlace no está activo. Usa el código de tu invitación.' : 'Ese código no coincide con una invitación. Revísalo e intenta otra vez.');
      input.current?.focus();
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const url = new URL(window.location.href);
    const linkToken = url.searchParams.get('invite');
    if (linkToken) {
      url.searchParams.delete('invite');
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
      void authorize({ linkToken });
      return;
    }
    if (isLocal) { input.current?.focus(); return; }
    void fetch('/api/session', { headers: { accept: 'application/json' } }).then(async (response) => {
      if (response.ok && response.headers.get('content-type')?.includes('application/json')) onReveal(await response.json() as InvitationPayload);
      else input.current?.focus();
    }).catch(() => input.current?.focus());
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = code.trim();
    if (!value) { setStatus('Escribe el código que recibiste con tu invitación.'); input.current?.focus(); return; }
    if (isLocal && value.toUpperCase() === 'INVITACION-DEMO') { onReveal(localDemoInvitation); return; }
    void authorize({ code: value });
  }

  return (
    <main className="private-gate">
      <div className="private-gate-mark" aria-hidden="true"><span></span></div>
      <section aria-labelledby="gate-title">
        <p>Acceso para invitados</p>
        <h1 id="gate-title">Invitación<br/><i>privada.</i></h1>
        <p className="private-gate-copy">Introduce el código que recibiste. Los detalles de la celebración solo estarán visibles para invitados validados.</p>
        <form onSubmit={submit}>
          <label htmlFor="guest-code">Código de invitación</label>
          <div>
            <input ref={input} id="guest-code" autoComplete="one-time-code" inputMode="text" value={code} onChange={(event) => setCode(event.target.value)} maxLength={32} disabled={busy}/>
            <button disabled={busy}>{busy ? 'Abriendo…' : 'Ver invitación'}</button>
          </div>
          {isLocal && <small>Prueba local: <code>INVITACION-DEMO</code></small>}
          <p className="form-status" role="status" aria-live="polite">{status}</p>
        </form>
      </section>
      <p className="private-note">Cada invitación es personal.</p>
    </main>
  );
}
