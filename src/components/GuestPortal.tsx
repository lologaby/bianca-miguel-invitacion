import { CSSProperties, FormEvent, useCallback, useEffect, useRef, useState } from 'react';

interface PortalGuest {
  id: string;
  name: string;
  partyLimit: number;
  plusOneAllowed: boolean;
  editable: boolean;
}

interface Issued { code: string; linkToken: string }
const inviteLink = (token: string) => `${window.location.origin}${import.meta.env.BASE_URL}?invite=${token}`;

/* Bound the full request, including the response body, and discard work after
 * unmount. One request at a time prevents a late list from replacing an add. */
export function useAdminRequest(onBusyChange?: (busy: boolean) => void) {
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  const active = useRef<{ controller: AbortController; timer: number } | null>(null);
  const notify = useRef(onBusyChange);
  notify.current = onBusyChange;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (active.current) {
        window.clearTimeout(active.current.timer);
        active.current.controller.abort();
        active.current = null;
        notify.current?.(false);
      }
    };
  }, []);

  const run = useCallback(async <T,>(work: (signal: AbortSignal) => Promise<T>) => {
    if (active.current || !mounted.current) return null;
    const controller = new AbortController();
    const ticket = { controller, timer: window.setTimeout(() => controller.abort(), 12000) };
    active.current = ticket;
    setBusy(true);
    notify.current?.(true);
    try {
      const data = await work(controller.signal);
      return mounted.current && active.current === ticket ? { ok: true as const, data } : null;
    } catch (error) {
      return mounted.current && active.current === ticket ? { ok: false as const, error } : null;
    } finally {
      window.clearTimeout(ticket.timer);
      if (mounted.current && active.current === ticket) {
        active.current = null;
        setBusy(false);
        notify.current?.(false);
      }
    }
  }, []);

  return { busy, run };
}

export function GuestPortal({ disabled = false, onBusyChange }: { disabled?: boolean; onBusyChange?: (busy: boolean) => void }) {
  const [guests, setGuests] = useState<PortalGuest[]>([]);
  const [issued, setIssued] = useState<Record<string, Issued>>({});
  const [name, setName] = useState('');
  const [partyLimit, setPartyLimit] = useState('2');
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [action, setAction] = useState<'add' | 'delete' | null>(null);
  const [status, setStatus] = useState('Cargando invitados…');
  const [copied, setCopied] = useState('');
  const [confirming, setConfirming] = useState('');
  const copyTimer = useRef<number | undefined>(undefined);
  const { busy, run } = useAdminRequest(onBusyChange);
  const locked = disabled || busy || loading;

  const load = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    setStatus('Cargando invitados…');
    const result = await run(async (signal) => {
      const response = await fetch('/api/admin-guests', { signal, headers: { accept: 'application/json' } });
      if (!response.ok) throw new Error('load');
      const data = await response.json() as { guests: PortalGuest[] };
      if (!Array.isArray(data.guests)) throw new Error('load');
      return data.guests;
    });
    if (!result) return;
    setLoading(false);
    if (result.ok) {
      setGuests(result.data);
      setStatus('');
    } else {
      setLoadFailed(true);
      setStatus('No pudimos cargar la lista de invitados. Vuelve a intentarlo.');
    }
  }, [run]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => () => window.clearTimeout(copyTimer.current), []);

  const spaces = Math.min(12, Math.max(1, Number(partyLimit) || 1));
  const step = (by: number) => setPartyLimit((current) => String(Math.min(12, Math.max(1, (Number(current) || 1) + by))));

  async function add(event: FormEvent) {
    event.preventDefault();
    if (locked || loadFailed) return;
    if (!name.trim()) { setStatus('Escribe el nombre de la invitación.'); return; }
    setAction('add');
    setStatus('Creando la invitación…');
    const result = await run(async (signal) => {
      const response = await fetch('/api/admin-guests', {
        method: 'POST', signal,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, partyLimit: spaces, plusOneAllowed: false }),
      });
      if (!response.ok) throw new Error('add');
      return await response.json() as { guest: PortalGuest; code: string; linkToken: string };
    });
    if (!result) return;
    setAction(null);
    if (result.ok) {
      const data = result.data;
      setGuests((list) => [...list.filter((guest) => guest.id !== data.guest.id), data.guest]);
      setIssued((map) => ({ ...map, [data.guest.id]: { code: data.code, linkToken: data.linkToken } }));
      setName('');
      setPartyLimit('2');
      setStatus(`Invitación creada para ${data.guest.name}.`);
    } else {
      setStatus('No pudimos completar la creación. Actualiza la lista antes de volver a crearla para comprobar si se guardó.');
      setLoadFailed(true);
    }
  }

  function messageFor(entry: Issued) {
    return `${inviteLink(entry.linkToken)}\nCódigo: ${entry.code}`;
  }

  async function share(guest: PortalGuest, entry: Issued) {
    const text = messageFor(entry);
    if (navigator.share) {
      try { await navigator.share({ title: `Invitación para ${guest.name}`, text }); } catch { /* dismissed */ }
      return;
    }
    await copy(guest.id, text);
  }

  async function remove(guest: PortalGuest) {
    if (locked) return;
    setAction('delete');
    setStatus('Eliminando invitación…');
    const result = await run(async (signal) => {
      const response = await fetch(`/api/admin-guests?id=${encodeURIComponent(guest.id)}`, {
        method: 'DELETE', signal, headers: { accept: 'application/json' },
      });
      if (!response.ok) throw new Error('delete');
    });
    if (!result) return;
    setAction(null);
    if (result.ok) {
      setGuests((list) => list.filter((item) => item.id !== guest.id));
      setIssued(({ [guest.id]: _gone, ...rest }) => rest);
      setConfirming('');
      setStatus(`${guest.name} se eliminó de la lista.`);
    } else {
      setStatus('No pudimos comprobar la eliminación. Actualiza la lista para revisar su estado.');
      setLoadFailed(true);
    }
  }

  async function copy(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(''), 2200);
    } catch { setStatus('No pudimos copiar. Selecciona el texto y cópialo a mano.'); }
  }

  return (
    <section className="guest-portal" aria-busy={busy || loading}>
      <header className="guest-portal-head">
        <h2>Invitados</h2>
        <p>{loading ? 'Cargando…' : `${guests.length} ${guests.length === 1 ? 'invitación' : 'invitaciones'}`}</p>
      </header>

      <form className="guest-portal-add" onSubmit={add}>
        <label>
          <span>Nombre de la invitación</span>
          <input value={name} disabled={locked || loadFailed} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder="Familia Rodríguez" required/>
        </label>
        <div className="guest-portal-narrow">
          <span className="guest-portal-field-label" id="espacios-label">Espacios</span>
          <div className="guest-portal-stepper">
            <button type="button" onClick={() => step(-1)} disabled={locked || loadFailed || spaces <= 1} aria-label="Un espacio menos">−</button>
            <input inputMode="numeric" aria-labelledby="espacios-label" aria-describedby="espacios-help" value={partyLimit} disabled={locked || loadFailed}
              onChange={(event) => setPartyLimit(event.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
              onBlur={() => setPartyLimit(String(spaces))}/>
            <button type="button" onClick={() => step(1)} disabled={locked || loadFailed || spaces >= 12} aria-label="Un espacio más">+</button>
          </div>
        </div>
        <button type="submit" disabled={locked || loadFailed}>{action === 'add' ? 'Creando…' : 'Crear invitación'}</button>
        <p className="guest-portal-capacity-note" id="espacios-help">Los espacios son el total de personas invitadas, incluida la persona titular. Al confirmar, escribirán el nombre de cada asistente.</p>
      </form>

      {loadFailed ? <div className="guest-portal-retry"><p>{status}</p><button type="button" disabled={locked} onClick={() => void load()}>Actualizar lista</button></div> : null}

      <ul className="guest-portal-list">
        {guests.map((guest, row) => {
          const entry = issued[guest.id];
          return <li key={guest.id} className={entry ? 'is-issued' : undefined} style={{ '--row': Math.min(row, 14) } as CSSProperties}>
            <div className="guest-portal-who">
              <b className="ink-write">{guest.name}</b>
              <span>{guest.partyLimit} {guest.partyLimit === 1 ? 'espacio en total' : 'espacios en total'}</span>
            </div>
            {entry ? <div className="guest-portal-issued">
              <p className="guest-portal-code"><span>Código</span><code>{entry.code}</code></p>
              <p className="guest-portal-link"><span>Enlace</span><code>{inviteLink(entry.linkToken)}</code></p>
              <div className="guest-portal-actions">
                <button type="button" disabled={locked} onClick={() => share(guest, entry)}>Compartir</button>
                <button type="button" disabled={locked} onClick={() => copy(guest.id, messageFor(entry))}>{copied === guest.id ? 'Copiado' : 'Copiar'}</button>
              </div>
              <small>Guárdalo ahora: el código no se puede volver a mostrar.</small>
            </div> : null}
            <div className="guest-portal-remove">
              {confirming === guest.id ? <>
                <span>Su enlace y su código dejarán de funcionar.</span>
                <button type="button" className="is-danger" onClick={() => remove(guest)} disabled={locked || loadFailed}>{action === 'delete' ? 'Eliminando…' : 'Sí, eliminar'}</button>
                <button type="button" disabled={locked} onClick={() => setConfirming('')}>Conservar</button>
              </> : <button type="button" disabled={locked || loadFailed} onClick={() => setConfirming(guest.id)}>Eliminar</button>}
            </div>
          </li>;
        })}
      </ul>
      <p className="admin-status" role="status" aria-live="polite">{status}</p>
    </section>
  );
}
