import { useEffect, useState } from 'react';
import { AdminDashboard } from './components/AdminDashboard';
import { InvitationGate } from './components/InvitationGate';
import { RsvpForm } from './components/RsvpForm';
import { HeroStillLife, LineIcon, VineRule } from './components/VisualAssets';
import { faq } from './config/event';
import type { InvitationPayload, PrivateEvent } from './types/invitation';
import './craft.css';
import './refined.css';

const nav = [['detalles', 'Celebración'], ['preguntas', 'Preguntas'], ['rsvp', 'Confirmar']] as const;

function useScrollProgress() {
  useEffect(() => {
    let queued = false;
    const update = () => {
      const distance = document.documentElement.scrollHeight - window.innerHeight;
      document.documentElement.style.setProperty('--scroll-progress', `${distance > 0 ? window.scrollY / distance : 0}`);
      queued = false;
    };
    const onScroll = () => { if (!queued) { window.requestAnimationFrame(update); queued = true; } };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
}

function Countdown({ start }: { start: string }) {
  const [parts, setParts] = useState({ days: 0, hours: 0, minutes: 0 });
  useEffect(() => {
    const update = () => {
      const diff = Math.max(0, new Date(start).getTime() - Date.now());
      setParts({ days: Math.floor(diff / 86400000), hours: Math.floor(diff / 3600000) % 24, minutes: Math.floor(diff / 60000) % 60 });
    };
    update();
    const timer = window.setInterval(update, 60000);
    return () => window.clearInterval(timer);
  }, [start]);
  return <div className="countdown-v2" aria-label={`${parts.days} días, ${parts.hours} horas y ${parts.minutes} minutos`}><span><b>{parts.days}</b>días</span><i></i><span><b>{parts.hours}</b>horas</span><i></i><span><b>{parts.minutes}</b>minutos</span></div>;
}

function Header({ event }: { event: PrivateEvent }) {
  return <header className="craft-header">
    <a className="craft-monogram" href="#inicio" aria-label="Inicio"><span>{event.couple.first[0]}</span><i>&</i><span>{event.couple.second[0]}</span></a>
    <nav aria-label="Principal">{nav.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</nav>
    <a className="header-date" href="#detalles"><span>{event.dateShort}</span></a>
  </header>;
}

function BeforeWedding({ invitation }: { invitation: InvitationPayload }) {
  const { event, guest } = invitation;
  useScrollProgress();
  return <div className="site-shell">
    <div className="scroll-track" aria-hidden="true"><span></span></div>
    <Header event={event}/>
    <main>
      <section className="hero-v2 distilled-hero" id="inicio">
        <div className="hero-copy-v2">
          <div className="hero-ledger"><span>Para {guest.name}</span><span>{event.dateShort}</span></div>
          <h1><span>{event.couple.first}</span><i>&</i><span>{event.couple.second}</span></h1>
          <p>Nos haría muy feliz compartir esta noche contigo.</p>
          <a className="crafted-button solid" href="#rsvp"><span>Confirmar asistencia</span><b aria-hidden="true">↗</b></a>
        </div>
        <div className="hero-visual-v2 distilled-visual"><HeroStillLife/></div>
      </section>

      <section className="masked-word-section" aria-label="Brindemos">
        <h2 aria-hidden="true">Brindemos</h2>
        <div><p>Una mesa larga, flores blancas y una copa servida despacio.</p><VineRule/></div>
      </section>

      <section className="date-v2" aria-label="Cuenta regresiva">
        <div className="date-icon"><LineIcon name="calendar"/></div>
        <div className="date-word"><span>La fecha</span><h2>{event.dateShort}</h2><span>{event.ceremony.city}</span></div>
        <div className="date-countdown"><p>Hasta levantar las copas</p><Countdown start={event.start}/></div>
        <div className="pour-line" aria-hidden="true"><span></span></div>
      </section>

      <section className="event-v2" id="detalles">
        <header><h2>La celebración.</h2><p>Tu invitación es personal y contempla {guest.partyLimit} {guest.partyLimit === 1 ? 'lugar' : 'lugares'}.</p>{guest.companionNames?.length ? <p className="guest-companions">Junto a: {guest.companionNames.join(', ')}</p> : null}</header>
        <div>
          <article className="event-stage ceremony-stage"><LineIcon name="church"/><div><span>Ceremonia</span><h3>{event.ceremony.name}</h3><p>{event.ceremony.city}<br/>{event.timeLabel}</p></div>{event.ceremony.mapsUrl !== '#' ? <a className="round-action" href={event.ceremony.mapsUrl} target="_blank" rel="noreferrer" aria-label="Abrir indicaciones de la ceremonia">↗</a> : null}</article>
          <article className="event-stage reception-stage"><LineIcon name="wine"/><div><span>Recepción</span><h3>{event.reception.name}</h3><p>{event.reception.note}</p></div>{event.reception.mapsUrl ? <a className="round-action" href={event.reception.mapsUrl} target="_blank" rel="noreferrer" aria-label="Abrir indicaciones de la recepción">↗</a> : null}</article>
        </div>
      </section>

      <section className="faq-v2" id="preguntas"><header><h2>Antes<br/>de brindar</h2><p>Lo esencial para acompañarnos con calma.</p></header><div>{faq.map((item) => <details key={item.q}><summary><span>{item.q}</span><i aria-hidden="true"></i></summary><p>{item.a}</p></details>)}</div></section>

      <section className="rsvp rsvp-v2 distilled-rsvp" id="rsvp"><VineRule/><RsvpForm guest={guest}/></section>
    </main>
    <footer className="footer-v2"><div className="footer-names">{event.couple.first} <i>&</i> {event.couple.second}</div><VineRule inverted/><div className="footer-meta"><span>{event.dateLabel}</span><span>{event.ceremony.city}</span><span>Nos vemos en la mesa.</span></div></footer>
  </div>;
}

function DuringWedding({ invitation }: { invitation: InvitationPayload }) {
  const { event } = invitation;
  return <main className="phase-v2 live-v2"><HeroStillLife/><div><h1>Hoy<br/>brindamos.</h1><p>{event.couple.first} & {event.couple.second} · {event.ceremony.city}</p><a className="crafted-button light" href={event.ceremony.mapsUrl}>Cómo llegar <b aria-hidden="true">↗</b></a></div></main>;
}

function AfterWedding({ invitation }: { invitation: InvitationPayload }) {
  const { event } = invitation;
  return <main className="phase-v2 after-v2"><div className="after-image"><img src={`${import.meta.env.BASE_URL}images/wine-still-life.png`} alt="Composición de vino, calas, tulipán, uvas y eucalipto"/></div><div><h1>Gracias por<br/><em>quedarte.</em></h1><p>Por acompañarnos y hacer de esta noche un recuerdo que siempre tendrá un lugar en nuestra mesa.</p><div className="gallery-message"><LineIcon name="wine"/><div><b>La galería llegará pronto</b><span>Compartiremos las fotografías seleccionadas aquí.</span></div></div></div></main>;
}

function phaseFor(event: PrivateEvent) {
  const params = new URLSearchParams(window.location.search);
  const preview = ['localhost', '127.0.0.1'].includes(window.location.hostname) ? params.get('fase') : null;
  if (preview === 'during' || preview === 'after' || preview === 'before') return preview;
  const now = Date.now();
  return now < new Date(event.start).getTime() ? 'before' : now <= new Date(event.end).getTime() ? 'during' : 'after';
}

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const isAdmin = params.has('coordinacion');
  const [invitation, setInvitation] = useState<InvitationPayload | null>(null);
  useEffect(() => { document.title = invitation ? `${invitation.event.couple.first} & ${invitation.event.couple.second}` : isAdmin ? 'Panel de coordinación' : 'Invitación privada'; }, [invitation, isAdmin]);
  if (isAdmin) return <AdminDashboard/>;
  if (!invitation) return <InvitationGate onReveal={setInvitation}/>;
  const phase = phaseFor(invitation.event);
  if (phase === 'during') return <DuringWedding invitation={invitation}/>;
  if (phase === 'after') return <AfterWedding invitation={invitation}/>;
  return <BeforeWedding invitation={invitation}/>;
}
