import { FormEvent, useEffect, useState } from 'react';

interface PortalGuest {
  id: string;
  name: string;
  partyLimit: number;
  plusOneAllowed: boolean;
  editable: boolean;
}

/*
 * A code exists in readable form exactly once: in the response that creates it.
 * The server keeps only its SHA-256, so this is held in memory beside the guest
 * and is gone on reload — which is why the card says so out loud.
 */
interface Issued { code: string; linkToken: string }

const inviteLink = (token: string) => `${window.location.origin}${import.meta.env.BASE_URL}?invite=${token}`;

export function GuestPortal() {
  const [guests, setGuests] = useState<PortalGuest[]>([]);
  const [issued, setIssued] = useState<Record<string, Issued>>({});
  const [name, setName] = useState('');
  const [partyLimit, setPartyLimit] = useState(2);
  const [plusOneAllowed, setPlusOneAllowed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [copied, setCopied] = useState('');

  async function load() {
    try {
      const response = await fetch('/api/admin-guests', { headers: { accept: 'application/json' } });
      if (!response.ok) throw new Error('load');
      const data = await response.json() as { guests: PortalGuest[] };
      setGuests(data.guests);
    } catch {
      setStatus('No pudimos cargar la lista de invitados.');
    }
  }

  useEffect(() => { void load(); }, []);

  async function add(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) { setStatus('Escribe el nombre de la invitación.'); return; }
    setBusy(true);
    setStatus('Creando la invitación…');
    try {
      const response = await fetch('/api/admin-guests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, partyLimit, plusOneAllowed }),
      });
      if (!response.ok) throw new Error('add');
      const data = await response.json() as { guest: PortalGuest; code: string; linkToken: string };
      setGuests((list) => [...list, data.guest]);
      setIssued((map) => ({ ...map, [data.guest.id]: { code: data.code, linkToken: data.linkToken } }));
      setName('');
      setPartyLimit(2);
      setPlusOneAllowed(false);
      setStatus(`Invitación creada para ${data.guest.name}.`);
    } catch {
      setStatus('No pudimos crear la invitación. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  function messageFor(guest: PortalGuest, entry: Issued) {
    return `${guest.name}: su invitación está aquí — ${inviteLink(entry.linkToken)}\nSi el enlace no abre, el código es ${entry.code}.`;
  }

  async function share(guest: PortalGuest, entry: Issued) {
    const text = messageFor(guest, entry);
    // the platform sheet where there is one — WhatsApp, Mensajes, Mail — and the
    // clipboard everywhere else, which is every desktop browser
    if (navigator.share) {
      try {
        await navigator.share({ title: `Invitación para ${guest.name}`, text });
        return;
      } catch {
        return; // the person dismissed the sheet; that is not an error
      }
    }
    await copy(guest.id, text);
  }

  async function copy(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied(''), 2200);
    } catch {
      setStatus('No pudimos copiar. Selecciona el texto y cópialo a mano.');
    }
  }

  return (
    <section className="guest-portal">
      <header className="guest-portal-head">
        <h2>Invitados</h2>
        <p>{guests.length} {guests.length === 1 ? 'invitación' : 'invitaciones'}</p>
      </header>

      <form className="guest-portal-add" onSubmit={add}>
        <label>
          <span>Nombre de la invitación</span>
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder="Familia Rodríguez" required/>
        </label>
        <label className="guest-portal-narrow">
          <span>Lugares</span>
          <input type="number" min={1} max={12} value={partyLimit} onChange={(event) => setPartyLimit(Number(event.target.value))}/>
        </label>
        <label className="guest-portal-check">
          <input type="checkbox" checked={plusOneAllowed} onChange={(event) => setPlusOneAllowed(event.target.checked)}/>
          <span>Puede traer acompañante</span>
        </label>
        <button disabled={busy}>{busy ? 'Creando…' : 'Crear invitación'}</button>
      </form>

      <ul className="guest-portal-list">
        {guests.map((guest) => {
          const entry = issued[guest.id];
          return (
            <li key={guest.id} className={entry ? 'is-issued' : undefined}>
              <div className="guest-portal-who">
                <b>{guest.name}</b>
                <span>{guest.partyLimit} {guest.partyLimit === 1 ? 'lugar' : 'lugares'}{guest.plusOneAllowed ? ' · con acompañante' : ''}</span>
              </div>

              {entry ? (
                <div className="guest-portal-issued">
                  <p className="guest-portal-code"><span>Código</span><code>{entry.code}</code></p>
                  <p className="guest-portal-link"><span>Enlace</span><code>{inviteLink(entry.linkToken)}</code></p>
                  <div className="guest-portal-actions">
                    <button type="button" onClick={() => share(guest, entry)}>Compartir</button>
                    <button type="button" onClick={() => copy(guest.id, messageFor(guest, entry))}>
                      {copied === guest.id ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                  <small>Guárdalo ahora: el código no se puede volver a mostrar.</small>
                </div>
              ) : (
                <span className="guest-portal-note">
                  {guest.editable ? 'Código entregado' : 'Desde la lista del hosting'}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <p className="admin-status" role="status" aria-live="polite">{status}</p>
    </section>
  );
}
