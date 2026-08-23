import { useEffect, useState } from 'react';
import { AdminDashboard } from './components/AdminDashboard';
import { InvitationGate } from './components/InvitationGate';
import { RsvpForm } from './components/RsvpForm';
import { HeroStillLife as ClientCoverArt, LineIcon, VineRule } from './components/VisualAssets';
import { HeroStillLife as DrawnHeroStillLife } from './components/VisualAssetsPolishedComplete';
import { faqFor } from './config/event';
import type { InvitationPayload, PrivateEvent } from './types/invitation';
import './craft.css';
import './refined.css';
import './itinerary.css';

const nav = [['detalles', 'Itinerario'], ['etiqueta', 'Detalles'], ['rsvp', 'Confirmar']] as const;

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

function CoupleWordmark({ first, second }: { first: string; second: string }) {
  return <span className="client-wordmark-crop"><img src={`${import.meta.env.BASE_URL}private-assets/wordmark.png`} alt={`${first} y ${second}`} width="1800" height="1200" loading="eager" decoding="async"/></span>;
}

function GiftNumber({ number }: { number: string }) {
  const [copied, setCopied] = useState(false);

  async function copyNumber() {
    try {
      if (!navigator.clipboard) throw new Error('clipboard_unavailable');
      await navigator.clipboard.writeText(number);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return <button className="gift-number" type="button" onClick={() => void copyNumber()} aria-label={`Copiar número de ATH Móvil ${number}`}>
    <span>ATH MÓVIL</span>
    <strong>{number.replaceAll('-', ' · ')}</strong>
    <small aria-live="polite">{copied ? 'Número copiado' : 'Toca para copiar'}</small>
  </button>;
}

function BeforeWedding({ invitation }: { invitation: InvitationPayload }) {
  const { event, guest } = invitation;
  useScrollProgress();
  const ceremonyTime = event.ceremony.timeLabel ?? event.timeLabel;
  const receptionTime = event.reception.timeLabel ?? 'Por confirmar';
  const receptionMoments = event.reception.moments ?? [];
  const faq = faqFor(event);
  return <div className="site-shell">
    <div className="scroll-track" aria-hidden="true"><span></span></div>
    <Header event={event}/>
    <main>
      <section className="client-concept-hero" id="inicio" aria-labelledby="client-hero-title">
        <div className="client-hero-copy">
          <p className="client-hero-overline">Invitación de boda</p>
          <h1 id="client-hero-title">
            <CoupleWordmark first={event.couple.first} second={event.couple.second}/>
          </h1>
          <div className="client-hero-personalization">
            <span>Para {guest.name}</span>
            <span>{event.dateLabel} · {event.ceremony.city}</span>
          </div>
        </div>
        <div className="client-hero-art"><ClientCoverArt/></div>
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

      <section className="event-v2 itinerary-v3" id="detalles">
        <header>
          <h2>El ritmo<br/><em>de la noche.</em></h2>
          <p>Una tarde para encontrarnos; una noche para brindar, probar y compartir.</p>
          <div className="itinerary-guest">
            <span>Tu invitación contempla</span>
            <strong>{guest.partyLimit} {guest.partyLimit === 1 ? 'lugar' : 'lugares'}</strong>
            {guest.companionNames?.length ? <small>Junto a {guest.companionNames.join(', ')}</small> : null}
          </div>
        </header>

        <ol className="itinerary-list">
          <li className="itinerary-stop">
            <time>{ceremonyTime}</time>
            <article className="itinerary-card ceremony-stage">
              <LineIcon name="church"/>
              <div><span>Ceremonia</span><h3>{event.ceremony.name}</h3><p>{event.ceremony.city}</p></div>
              {event.ceremony.mapsUrl !== '#' ? <a className="round-action" href={event.ceremony.mapsUrl} target="_blank" rel="noreferrer" aria-label="Abrir indicaciones de la ceremonia">↗</a> : null}
            </article>
          </li>
          <li className="itinerary-stop reception-stop">
            <time>{receptionTime}</time>
            <article className="itinerary-card reception-stage">
              <LineIcon name="wine"/>
              <div><span>Recepción</span><h3>{event.reception.name}</h3><p>{event.reception.city ?? event.reception.note}</p></div>
              {event.reception.mapsUrl ? <a className="round-action" href={event.reception.mapsUrl} target="_blank" rel="noreferrer" aria-label="Abrir indicaciones de la recepción">↗</a> : null}
              {receptionMoments.length ? <ol className="reception-flow" aria-label="Momentos de la recepción">{receptionMoments.map((moment) => <li key={moment}>{moment}</li>)}</ol> : null}
            </article>
          </li>
        </ol>
      </section>

      <section className="guest-details-v3" id="etiqueta" aria-labelledby="guest-details-title">
        <header><h2 id="guest-details-title">La elegancia está<br/><em>en los detalles.</em></h2><p>Todo lo necesario para llegar, celebrar y disfrutar con calma.</p></header>
        <div className="guest-detail-grid">
          <article className="dress-detail">
            <span>Código de vestimenta</span>
            <h3>{event.dressCode?.label ?? 'Cóctel / Formal'}</h3>
            <p>{event.dressCode?.note ?? 'Agradecemos vestir con elegancia para acompañarnos durante toda la celebración.'}</p>
          </article>
          {event.gifts ? <article className="gift-detail">
            <span>Si desean obsequiarnos</span>
            <h3>Su presencia es nuestro regalo más especial.</h3>
            <p>{event.gifts.message}</p>
            <GiftNumber number={event.gifts.athMovil}/>
          </article> : null}
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
  return <main className="phase-v2 live-v2"><DrawnHeroStillLife/><div><h1>Hoy<br/>brindamos.</h1><p>{event.couple.first} & {event.couple.second} · {event.ceremony.city}</p><a className="crafted-button light" href={event.ceremony.mapsUrl}>Cómo llegar <b aria-hidden="true">↗</b></a></div></main>;
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
