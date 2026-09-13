import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { GuestPortal, useAdminRequest } from './GuestPortal';
import './admin.css';

interface AdminRecord {
  guestId: string;
  name: string;
  invited: number;
  attendance: 'yes' | 'no' | 'pending';
  partySize: number;
  attendeeNames?: string[];
  plusOneName: string;
  song: string;
  updatedAt: string;
}

const demoRecords: AdminRecord[] = [
  { guestId: 'demo-1', name: 'Andrea Rivera', invited: 2, attendance: 'yes', partySize: 2, attendeeNames: ['Andrea Rivera', 'Carlos Rivera'], plusOneName: '', song: 'Brillas — León Larregui', updatedAt: new Date().toISOString() },
  { guestId: 'demo-2', name: 'María López', invited: 1, attendance: 'no', partySize: 0, plusOneName: '', song: '', updatedAt: new Date().toISOString() },
  { guestId: 'demo-3', name: 'Familia Santiago', invited: 3, attendance: 'pending', partySize: 0, plusOneName: '', song: '', updatedAt: '' },
];

function attendeeList(record: AdminRecord) {
  if (record.attendance !== 'yes') return '—';
  const names = record.attendeeNames?.filter((name) => typeof name === 'string' && name.trim());
  if (names?.length) return <ul className="admin-attendee-names">{names.map((name, index) => <li key={index}>{name}</li>)}</ul>;
  return record.plusOneName ? <span>Nombre registrado: {record.plusOneName}</span> : 'Sin nombres registrados';
}

function updatedDate(value: string) {
  if (!value || Number.isNaN(Date.parse(value))) return '—';
  return new Intl.DateTimeFormat('es-PR', { dateStyle: 'medium' }).format(new Date(value));
}

export function AdminDashboard() {
  const isDemo = ['localhost', '127.0.0.1'].includes(window.location.hostname) && new URLSearchParams(window.location.search).get('coordinacion') === 'demo';
  const [records, setRecords] = useState<AdminRecord[]>(isDemo ? demoRecords : []);
  const [password, setPassword] = useState('');
  const [authorized, setAuthorized] = useState(isDemo);
  const [checkingSession, setCheckingSession] = useState(!isDemo);
  const [portalBusy, setPortalBusy] = useState(false);
  const [action, setAction] = useState<'load' | 'login' | 'logout'>('load');
  const [status, setStatus] = useState(isDemo ? 'Vista local con datos ficticios.' : '');
  const { busy: requestBusy, run } = useAdminRequest();
  const busy = requestBusy || checkingSession || portalBusy;

  const loadRecords = useCallback(async () => {
    setAction('load');
    const result = await run(async (signal) => {
      const response = await fetch('/api/admin-rsvps', { signal, headers: { accept: 'application/json' } });
      if (response.status === 401) return null;
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('load');
      const data = await response.json() as { records: AdminRecord[] };
      if (!Array.isArray(data.records)) throw new Error('load');
      return data.records;
    });
    if (!result) return;
    setCheckingSession(false);
    if (result.ok && result.data) {
      setRecords(result.data);
      setAuthorized(true);
      setStatus('Información actualizada.');
    } else if (result.ok) {
      setAuthorized(false);
      setRecords([]);
      setStatus('Ingresa tu contraseña para entrar al panel.');
    } else {
      setStatus('No pudimos cargar las confirmaciones. Revisa tu conexión e inténtalo nuevamente.');
    }
  }, [run]);

  useEffect(() => { if (!isDemo) void loadRecords(); }, [isDemo, loadRecords]);

  async function login(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setAction('login');
    setStatus('Validando acceso…');
    const result = await run(async (signal) => {
      const response = await fetch('/api/admin-login', { method: 'POST', signal, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password }) });
      if (response.status === 401) return false;
      if (!response.ok) throw new Error('login');
      return true;
    });
    if (!result) return;
    if (!result.ok) {
      setStatus('No pudimos conectar con el panel. Revisa tu conexión e inténtalo nuevamente.');
    } else if (!result.data) {
      setStatus('La contraseña no es correcta.');
    } else {
      setAuthorized(true);
      setPassword('');
      await loadRecords();
    }
  }

  async function logout() {
    if (busy) return;
    if (isDemo) {
      setAuthorized(false);
      setRecords([]);
      setStatus('La vista de demostración se cerró.');
      return;
    }
    setAction('logout');
    setStatus('Cerrando sesión…');
    const result = await run(async (signal) => {
      const response = await fetch('/api/admin-logout', { method: 'POST', signal });
      if (!response.ok) throw new Error('logout');
    });
    if (!result) return;
    if (result.ok) {
      setAuthorized(false);
      setRecords([]);
      setStatus('Sesión cerrada.');
    } else {
      setStatus('No pudimos cerrar la sesión. Intente nuevamente.');
    }
  }

  const totals = useMemo(() => ({
    attending: records.filter((record) => record.attendance === 'yes').reduce((sum, record) => sum + record.partySize, 0),
    declined: records.filter((record) => record.attendance === 'no').length,
    pending: records.filter((record) => record.attendance === 'pending').length,
  }), [records]);

  if (!authorized) return <main className="admin-login">
    <form onSubmit={login} aria-busy={busy}>
      <a href="./" className="admin-monogram" aria-label="Volver a la invitación">B <i>&</i> M</a>
      <h1>Panel de coordinación</h1>
      <p>Acceso reservado para la persona encargada de las confirmaciones.</p>
      <label htmlFor="admin-password">Contraseña</label>
      <input id="admin-password" type="password" autoComplete="current-password" disabled={busy} value={password} onChange={(event) => setPassword(event.target.value)} required/>
      <button disabled={busy}>{busy ? 'Validando…' : 'Entrar al panel'}</button>
      <p className="admin-status" role="status" aria-live="polite">{status}</p>
    </form>
  </main>;

  return <main className="admin-shell">
    <header className="admin-header">
      <div><span>Celebración privada</span><h1>Confirmaciones</h1></div>
      <div className="admin-header-actions">
        <button type="button" onClick={() => void loadRecords()} disabled={busy}>{requestBusy && action === 'load' ? 'Actualizando…' : 'Actualizar'}</button>
        <button className="admin-logout" type="button" onClick={logout} disabled={busy}>{requestBusy && action === 'logout' ? 'Cerrando…' : 'Cerrar sesión'}</button>
      </div>
    </header>
    <p className="admin-summary"><span><strong>{totals.attending}</strong> personas asistirán</span><i aria-hidden="true"></i><span><strong>{totals.declined}</strong> invitaciones declinaron</span><i aria-hidden="true"></i><span><strong>{totals.pending}</strong> pendientes</span></p>
    <div className="admin-table-wrap">
      <table>
        <thead><tr><th>Invitación</th><th>Respuesta</th><th>Asistentes</th><th>Nombres de asistentes</th><th>Actualización</th></tr></thead>
        <tbody>{records.map((record) => <tr key={record.guestId}>
          <td><b>{record.name}</b><span>{record.invited} {record.invited === 1 ? 'lugar reservado' : 'lugares reservados'}</span></td>
          <td data-label="Respuesta"><span className={`admin-state ${record.attendance}`}>{record.attendance === 'yes' ? 'Asistirá' : record.attendance === 'no' ? 'No asistirá' : 'Pendiente'}</span></td>
          <td data-label="Asistentes">{record.attendance === 'yes' ? record.partySize : '—'}</td>
          <td data-label="Nombres de asistentes">{attendeeList(record)}</td>
          <td data-label="Actualización">{updatedDate(record.updatedAt)}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <p className="admin-status" role="status" aria-live="polite">{status}</p>
    {isDemo ? null : <GuestPortal disabled={requestBusy || checkingSession} onBusyChange={setPortalBusy}/>}
  </main>;
}
