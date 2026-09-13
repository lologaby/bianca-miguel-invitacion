import { FormEvent, useEffect, useRef, useState } from 'react';
import type { Guest, SavedRsvp } from '../types/invitation';
import './rsvp.css';

function AnswerMark() {
  return <svg className="rsvp-answer-mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <circle className="rsvp-answer-mark__ring" cx="12" cy="12" r="10"/>
    <circle className="rsvp-answer-mark__dot" cx="12" cy="12" r="4"/>
  </svg>;
}

function isSavedRsvp(value: unknown): value is SavedRsvp {
  if (!value || typeof value !== 'object') return false;
  const record = value as SavedRsvp;
  return (record.attendance === 'yes' || record.attendance === 'no')
    && Number.isInteger(record.partySize) && record.partySize >= 0
    && typeof record.plusOneName === 'string' && typeof record.updatedAt === 'string'
    && (record.attendeeNames === undefined || (Array.isArray(record.attendeeNames) && record.attendeeNames.every(name => typeof name === 'string')));
}

export function RsvpForm({ guest, response }: { guest: Guest; response?: SavedRsvp | null }) {
  const isLocalPreview = ['localhost', '127.0.0.1'].includes(window.location.hostname) || import.meta.env.VITE_DEMO_PREVIEW === '1';
  const previewKey = 'wedding-rsvp-preview:' + guest.name;
  const [saved, setSaved] = useState<SavedRsvp | null>(() => {
    if (isSavedRsvp(response)) return response;
    if (!isLocalPreview) return null;
    try { const value: unknown = JSON.parse(localStorage.getItem(previewKey) || 'null'); return isSavedRsvp(value) ? value : null; }
    catch { return null; }
  });
  const receipt = useRef<HTMLHeadingElement>(null);
  const submitted = useRef(false);
  useEffect(() => { if (saved && submitted.current) receipt.current?.focus({ preventScroll: true }); }, [saved]);
  const [attendance, setAttendance] = useState<'yes' | 'no' | ''>('');
  const [partySize, setPartySize] = useState(1);
  const [names, setNames] = useState<string[]>([]);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || saved) return;
    if (!attendance) return setStatus('Indique si podrá acompañarnos.');
    const form = new FormData(event.currentTarget);
    const attendeeNames = attendance === 'yes' ? form.getAll('attendeeName').map(name => String(name).trim()) : [];
    if (attendance === 'yes' && (attendeeNames.length !== partySize || attendeeNames.some(name => !name || name.length > 80))) {
      setStatus('Escriba el nombre de cada persona que asistirá.');
      const fields = event.currentTarget.querySelectorAll<HTMLInputElement>('input[name="attendeeName"]');
      [...fields].find(input => !input.value.trim())?.focus();
      return;
    }
    const body = {
      attendance, partySize: attendance === 'yes' ? partySize : 0, attendeeNames,
      dietary: attendance === 'yes' ? String(form.get('dietary') || '') : '',
      accessibility: attendance === 'yes' ? String(form.get('accessibility') || '') : '',
    };
    setBusy(true);
    setStatus('Guardando su respuesta…');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    try {
      let result: SavedRsvp;
      if (isLocalPreview) {
        result = { ...body, plusOneName: '', updatedAt: new Date().toISOString() };
        localStorage.setItem(previewKey, JSON.stringify(result));
      } else {
        const request = await fetch('/api/rsvp', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal });
        if (!request.headers.get('content-type')?.includes('application/json')) throw new Error('No pudimos guardar su respuesta. Inténtelo nuevamente.');
        const data = await request.json() as { rsvp?: unknown; error?: { message?: string } };
        if (!request.ok) throw new Error(data.error?.message || 'No pudimos guardar su respuesta. Inténtelo nuevamente.');
        if (!isSavedRsvp(data.rsvp)) throw new Error('No pudimos verificar su respuesta. Inténtelo nuevamente.');
        result = data.rsvp;
      }
      submitted.current = true;
      setSaved(result);
      setStatus('');
    } catch (error) {
      setStatus(error instanceof Error && error.name !== 'AbortError' && error.message !== 'Failed to fetch'
        ? error.message : 'No pudimos guardar su respuesta. Inténtelo nuevamente.');
    } finally {
      window.clearTimeout(timeout);
      setBusy(false);
    }
  }

  if (saved) return <div className="rsvp-form">
    <section className="rsvp-receipt" aria-labelledby="rsvp-receipt-title">
      <svg className="rsvp-receipt-mark" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18"/><path d="m12 20 5 5 11-11"/></svg>
      <div className="form-heading">
        <h2 id="rsvp-receipt-title" ref={receipt} tabIndex={-1}>{saved.attendance === 'yes' ? 'Su asistencia está confirmada.' : 'Gracias por responder.'}</h2>
        <p>{saved.attendance === 'yes' ? 'Nos alegrará compartir este día con usted.' : 'Hemos recibido que no podrá acompañarnos.'}</p>
      </div>
      <dl>
        <div><dt>Invitación</dt><dd>{guest.name}</dd></div>
        {saved.attendance === 'yes' && saved.partySize > 0 && <div><dt>Asistentes</dt><dd>{saved.partySize} {saved.partySize === 1 ? 'persona' : 'personas'}</dd></div>}
        {saved.attendance === 'yes' && (saved.attendeeNames?.length
          ? <div><dt>Nombres de asistentes</dt><dd><ol className="rsvp-saved-names">{saved.attendeeNames.map((name, index) => <li key={index}>{name}</li>)}</ol></dd></div>
          : saved.plusOneName ? <div><dt>Nombre registrado</dt><dd>{saved.plusOneName}</dd></div> : null)}
      </dl>
      <p className="rsvp-receipt-note">{isLocalPreview ? 'Respuesta guardada solo en esta demostración.' : 'Su respuesta quedó guardada. No necesita confirmarla de nuevo.'}</p>
    </section>
  </div>;

  return <form className="rsvp-form" onSubmit={submit}>
    <div className="form-heading"><h2>{guest.name},<br/>¿nos acompañará?</h2><p>Hemos reservado {guest.partyLimit} {guest.partyLimit === 1 ? 'lugar' : 'lugares'} para su invitación.</p></div>
    <fieldset className="attendance-fieldset" disabled={busy}>
      <legend>Seleccione su respuesta</legend>
      <div className="attendance-options">
        <label className="attendance-card yes-card"><input type="radio" name="attendance" value="yes" onChange={() => setAttendance('yes')}/><AnswerMark/><span><b>Sí, allí estaré</b><small>Confirmo mi asistencia</small></span></label>
        <label className="attendance-card no-card"><input type="radio" name="attendance" value="no" onChange={() => setAttendance('no')}/><AnswerMark/><span><b>No podré asistir</b><small>Gracias por invitarme</small></span></label>
      </div>
    </fieldset>
    {attendance === 'yes' && <div className="conditional-fields">
      <label>Número de asistentes<select disabled={busy} name="partySize" value={partySize} onChange={event => setPartySize(Number(event.target.value))}>{Array.from({ length: guest.partyLimit }, (_, index) => <option key={index + 1}>{index + 1}</option>)}</select></label>
      <fieldset className="rsvp-attendees" disabled={busy} aria-describedby="rsvp-attendees-note">
        <legend>{partySize === 1 ? 'Nombre del asistente' : 'Nombres de los asistentes'}</legend>
        <p id="rsvp-attendees-note">Incluya a cada persona que asistirá, también a usted si nos acompaña.</p>
        <div className="rsvp-attendee-fields">{Array.from({ length: partySize }, (_, index) => <label key={index}>
          {partySize === 1 ? 'Nombre y apellido' : `Asistente ${index + 1}`}
          <input name="attendeeName" required maxLength={80} autoComplete={index === 0 ? 'name' : 'off'} placeholder="Nombre y apellido" value={names[index] || ''} onChange={event => setNames(current => { const next = [...current]; next[index] = event.target.value; return next; })}/>
        </label>)}</div>
      </fieldset>
      <details className="rsvp-more"><summary>Alergias o accesibilidad</summary><div><label>Alergias o necesidades alimentarias<textarea disabled={busy} name="dietary" rows={3} maxLength={300}/></label><label>Necesidades de accesibilidad<textarea disabled={busy} name="accessibility" rows={3} maxLength={300}/></label></div></details>
    </div>}
    <button className={`button wine rsvp-submit${attendance ? ' is-ready' : ''}`} disabled={busy || !attendance}>
      <span>{busy ? 'Guardando…' : attendance === 'no' ? 'Enviar respuesta' : 'Confirmar asistencia'}</span>
      <svg className="rsvp-submit-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 12h15m-5-5 5 5-5 5"/></svg>
    </button>
    <p className="form-status" role="status" aria-live="polite">{status}</p>
  </form>;
}
