import { FormEvent, useEffect, useMemo, useState } from 'react';
import './admin.css';

interface AdminRecord {
  guestId: string;
  name: string;
  invited: number;
  attendance: 'yes' | 'no' | 'pending';
  partySize: number;
  plusOneName: string;
  song: string;
  updatedAt: string;
}

const demoRecords: AdminRecord[] = [
  { guestId: 'demo-1', name: 'Andrea Rivera', invited: 2, attendance: 'yes', partySize: 2, plusOneName: 'Carlos', song: 'Brillas — León Larregui', updatedAt: new Date().toISOString() },
  { guestId: 'demo-2', name: 'María López', invited: 1, attendance: 'no', partySize: 0, plusOneName: '', song: '', updatedAt: new Date().toISOString() },
  { guestId: 'demo-3', name: 'Familia Santiago', invited: 3, attendance: 'pending', partySize: 0, plusOneName: '', song: '', updatedAt: '' },
];

export function AdminDashboard() {
  const isDemo = ['localhost', '127.0.0.1'].includes(window.location.hostname) && new URLSearchParams(window.location.search).get('coordinacion') === 'demo';
  const [records, setRecords] = useState<AdminRecord[]>(isDemo ? demoRecords : []);
  const [password, setPassword] = useState('');
  const [authorized, setAuthorized] = useState(isDemo);
  const [busy, setBusy] = useState(!isDemo);
  const [status, setStatus] = useState(isDemo ? 'Vista local con datos ficticios.' : '');

  async function loadRecords() {
    setBusy(true);
    try {
      const response = await fetch('/api/admin-rsvps', { headers: { accept: 'application/json' } });
      if (response.status === 401) { setAuthorized(false); return; }
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('load');
      const data = await response.json() as { records: AdminRecord[] };
      setRecords(data.records);
      setAuthorized(true);
      setStatus('Información actualizada.');
    } catch {
      setStatus('No pudimos cargar las confirmaciones. Intenta nuevamente.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { if (!isDemo) void loadRecords(); }, [isDemo]);

  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setStatus('Validando acceso…');
    try {
      const response = await fetch('/api/admin-login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password }) });
      if (!response.ok) throw new Error('login');
      setAuthorized(true);
      setPassword('');
      await loadRecords();
    } catch {
      setStatus('La contraseña no es correcta.');
      setBusy(false);
    }
  }

  const totals = useMemo(() => ({
    attending: records.filter((record) => record.attendance === 'yes').reduce((sum, record) => sum + record.partySize, 0),
    declined: records.filter((record) => record.attendance === 'no').length,
    pending: records.filter((record) => record.attendance === 'pending').length,
  }), [records]);

  if (!authorized) return (
    <main className="admin-login">
      <form onSubmit={login}>
        <a href="./" className="admin-monogram" aria-label="Volver a la invitación">B <i>&</i> P</a>
        <h1>Panel de coordinación</h1>
        <p>Acceso reservado para la persona encargada de las confirmaciones.</p>
        <label htmlFor="admin-password">Contraseña</label>
        <input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required/>
        <button disabled={busy}>{busy ? 'Validando…' : 'Entrar al panel'}</button>
        <p className="admin-status" role="status" aria-live="polite">{status}</p>
      </form>
    </main>
  );

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div><span>Celebración privada</span><h1>Confirmaciones</h1></div>
        <button onClick={loadRecords} disabled={busy}>{busy ? 'Actualizando…' : 'Actualizar'}</button>
      </header>
      <p className="admin-summary"><strong>{totals.attending}</strong> personas asistirán <i></i><strong>{totals.declined}</strong> invitaciones declinaron <i></i><strong>{totals.pending}</strong> pendientes</p>
      <div className="admin-table-wrap">
        <table>
          <thead><tr><th>Invitación</th><th>Respuesta</th><th>Asistentes</th><th>Acompañante</th><th>Canción</th><th>Actualización</th></tr></thead>
          <tbody>{records.map((record) => <tr key={record.guestId}>
            <td><b>{record.name}</b><span>{record.invited} {record.invited === 1 ? 'lugar reservado' : 'lugares reservados'}</span></td>
            <td><span className={`admin-state ${record.attendance}`}>{record.attendance === 'yes' ? 'Asistirá' : record.attendance === 'no' ? 'No asistirá' : 'Pendiente'}</span></td>
            <td>{record.attendance === 'yes' ? record.partySize : '—'}</td>
            <td>{record.plusOneName || '—'}</td>
            <td>{record.song || '—'}</td>
            <td>{record.updatedAt ? new Intl.DateTimeFormat('es-PR', { dateStyle: 'medium' }).format(new Date(record.updatedAt)) : '—'}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <p className="admin-status" role="status" aria-live="polite">{status}</p>
    </main>
  );
}
