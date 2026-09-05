import { CSSProperties, FormEvent, useEffect, useState } from 'react';

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
  /*
   * Held as text, not a number. As a number input, clearing the field produced
   * Number('') === 0, which pinned a 0 in the box that could not be deleted —
   * the only way to reach 1 was to overwrite. Text lets the field pass through
   * empty on the way to another value, and the steppers mean a phone never
   * needs the keyboard at all.
   */
  const [partyLimit, setPartyLimit] = useState('2');
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

  const spaces = Math.min(12, Math.max(1, Number(partyLimit) || 1));
  // functional, so two quick taps advance two steps rather than sharing a value
  const step = (by: number) =>
    setPartyLimit((current) => String(Math.min(12, Math.max(1, (Number(current) || 1) + by))));

  async function add(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) { setStatus('Escribe el nombre de la invitación.'); return; }
    setBusy(true);
    setStatus('Creando la invitación…');
    try {
      const response = await fetch('/api/admin-guests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, partyLimit: spaces, plusOneAllowed }),
      });
      if (!response.ok) throw new Error('add');
      const data = await response.json() as { guest: PortalGuest; code: string; linkToken: string };
      setGuests((list) => [...list, data.guest]);
      setIssued((map) => ({ ...map, [data.guest.id]: { code: data.code, linkToken: data.linkToken } }));
      setName('');
      setPartyLimit('2');
      setPlusOneAllowed(false);
      setStatus(`Invitación creada para ${data.guest.name}.`);
    } catch {
      setStatus('No pudimos crear la invitación. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  /*
   * The link and the code, and nothing else. It used to compose a sentence,
   * but the couple write to each guest in their own words — a greeting from us
   * would have to be deleted before every single send.
   */
  function messageFor(entry: Issued) {
    return `${inviteLink(entry.linkToken)}
Código: ${entry.code}`;
  }

  async function share(guest: PortalGuest, entry: Issued) {
    const text = messageFor(entry);
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
        <div className="guest-portal-narrow">
          <span className="guest-portal-field-label" id="espacios-label">Espacios</span>
          <div className="guest-portal-stepper">
            <button type="button" onClick={() => step(-1)} disabled={spaces <= 1} aria-label="Un espacio menos">−</button>
            <input
              inputMode="numeric"
              aria-labelledby="espacios-label"
              value={partyLimit}
              onChange={(event) => setPartyLimit(event.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
              onBlur={() => setPartyLimit(String(spaces))}
            />
            <button type="button" onClick={() => step(1)} disabled={spaces >= 12} aria-label="Un espacio más">+</button>
          </div>
        </div>
        <label className="guest-portal-check">
          <input type="checkbox" checked={plusOneAllowed} onChange={(event) => setPlusOneAllowed(event.target.checked)}/>
          <span>Puede traer acompañante</span>
        </label>
        <button disabled={busy}>{busy ? 'Creando…' : 'Crear invitación'}</button>
      </form>

      <ul className="guest-portal-list">
        {guests.map((guest, row) => {
          const entry = issued[guest.id];
          return (
            <li
              key={guest.id}
              className={entry ? 'is-issued' : undefined}
              /* staggers the ink down the list, so it reads as one hand writing */
              style={{ '--row': Math.min(row, 14) } as CSSProperties}
            >
              <div className="guest-portal-who">
                <b className="ink-write">{guest.name}</b>
                <span>{guest.partyLimit} {guest.partyLimit === 1 ? 'espacio' : 'espacios'}{guest.plusOneAllowed ? ' · con acompañante' : ''}</span>
              </div>

              {entry ? (
                <div className="guest-portal-issued">
                  <p className="guest-portal-code"><span>Código</span><code>{entry.code}</code></p>
                  <p className="guest-portal-link"><span>Enlace</span><code>{inviteLink(entry.linkToken)}</code></p>
                  <div className="guest-portal-actions">
                    <button type="button" onClick={() => share(guest, entry)}>Compartir</button>
                    <button type="button" onClick={() => copy(guest.id, messageFor(entry))}>
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
