import { FormEvent, useState } from 'react';
import type { Guest } from '../types/invitation';
import './rsvp.css';

export function RsvpForm({ guest }: { guest: Guest }) {
  const [attendance, setAttendance] = useState<'yes' | 'no' | ''>('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const isLocalPreview = ['localhost', '127.0.0.1'].includes(window.location.hostname);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!attendance) return setStatus('Indique si podrá acompañarnos.');
    setBusy(true);
    setStatus('Guardando su respuesta…');
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());

    if (isLocalPreview) {
      await new Promise((resolve) => window.setTimeout(resolve, 350));
      window.localStorage.setItem('wedding-rsvp-preview', JSON.stringify({ ...body, savedAt: new Date().toISOString() }));
      setStatus(attendance === 'yes' ? 'Su asistencia quedó registrada en esta prueba.' : 'Gracias por avisarnos. Esta respuesta es solo una prueba local.');
      setBusy(false);
      return;
    }

    try {
      const response = await fetch('/api/rsvp', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('submit');
      setStatus(attendance === 'yes' ? '¡Gracias! Su lugar quedó confirmado.' : 'Gracias por avisarnos.');
    } catch {
      setStatus('No pudimos guardar su respuesta. Inténtelo nuevamente.');
    } finally {
      setBusy(false);
    }
  }

  return <form className="rsvp-form" onSubmit={submit}>
    <div className="form-heading"><h2>{guest.name},<br/>¿nos acompañará?</h2><p>Hemos reservado {guest.partyLimit} {guest.partyLimit === 1 ? 'lugar' : 'lugares'} para su invitación.</p></div>
    <fieldset className="attendance-fieldset" disabled={busy}>
      <legend>Seleccione su respuesta</legend>
      <div className="attendance-options">
        <label className="attendance-card yes-card"><input type="radio" name="attendance" value="yes" onChange={() => setAttendance('yes')}/><span className="choice-mark" aria-hidden="true">✓</span><span><b>Sí, allí estaré</b><small>Confirmo mi asistencia</small></span></label>
        <label className="attendance-card no-card"><input type="radio" name="attendance" value="no" onChange={() => setAttendance('no')}/><span className="choice-mark" aria-hidden="true">—</span><span><b>No podré asistir</b><small>Gracias por invitarme</small></span></label>
      </div>
    </fieldset>
    {attendance === 'yes' && <div className="conditional-fields">
      <label>Número de asistentes<select name="partySize" defaultValue="1">{Array.from({ length: guest.partyLimit }, (_, index) => <option key={index + 1}>{index + 1}</option>)}</select></label>
      {guest.plusOneAllowed && <label>Nombre de acompañante<input name="plusOneName" maxLength={80} defaultValue={guest.companionNames?.[0] ?? ''}/></label>}
      <label>Sugerencia musical<input name="song" maxLength={120} placeholder="Canción — Artista"/><small className="field-note">¿Qué canción le gustaría escuchar en la recepción?</small></label>
      <details className="rsvp-more"><summary>Alergias o accesibilidad</summary><div><label>Alergias o necesidades alimentarias<textarea name="dietary" rows={3} maxLength={300}/></label><label>Necesidades de accesibilidad<textarea name="accessibility" rows={3} maxLength={300}/></label></div></details>
    </div>}
    <button className={`button wine rsvp-submit${attendance ? ' is-ready' : ''}`} disabled={busy || !attendance}>
      <span>{busy ? 'Guardando…' : attendance === 'no' ? 'Enviar respuesta' : 'Confirmar asistencia'}</span>
      <i aria-hidden="true" />
    </button>
    <p className="form-status" role="status" aria-live="polite">{status}</p>
  </form>;
}
