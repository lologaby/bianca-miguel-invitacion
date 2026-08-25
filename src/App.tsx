import { useEffect, useState } from 'react';
import { AdminDashboard } from './components/AdminDashboard';
import { InteractiveWineGlass } from './components/InteractiveWineGlass';
import { InvitationGate } from './components/InvitationGate';
import { RsvpForm } from './components/RsvpForm';
import { HeroStillLife as ClientCoverArt, LineIcon, VineRule } from './components/VisualAssets';
import { Ampersand, ArchMark, CacaoPodMark, SpeckleDisc, WedgeMark, WineGlassMark } from './art/ReferenceMarks';
import { ScrollMark } from './art/ScrollMark';
import { AddToCalendar } from './components/AddToCalendar';
import { VenueMap } from './components/VenueMap';
import { HeroStillLife as DrawnHeroStillLife } from './components/VisualAssetsPolishedComplete';
import { faqFor } from './config/event';
import type { InvitationPayload, PrivateEvent } from './types/invitation';
import './craft.css';
import './refined.css';
import './itinerary.css';

const nav = [['celebracion', 'Celebración'], ['lugar', 'Lugar'], ['preguntas', 'Preguntas'], ['rsvp', 'Confirmar']] as const;

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
  const [active, setActive] = useState<(typeof nav)[number][0]>('celebracion');
  const [day = event.dateShort, month = ''] = event.dateShort.split('·').map((part) => part.trim());

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((first, second) => Math.abs(first.boundingClientRect.top) - Math.abs(second.boundingClientRect.top));
      const id = visible[0]?.target.id as (typeof nav)[number][0] | undefined;
      if (id) setActive(id);
    }, { rootMargin: '-24% 0px -62% 0px', threshold: [0, .1, .4] });

    nav.forEach(([id]) => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });
    return () => observer.disconnect();
  }, []);

  return <header className="craft-header">
    <a className="craft-monogram" href="#inicio" aria-label="Inicio"><span>{event.couple.first[0]}</span><i><Ampersand className="mark-ampersand" tone="currentColor"/></i><span>{event.couple.second[0]}</span></a>
    <nav aria-label="Secciones de la invitación">{nav.map(([id, label]) => <a key={id} href={`#${id}`} aria-current={active === id ? 'location' : undefined} onClick={() => setActive(id)}>{label}</a>)}</nav>
    <a className="header-date" href="#celebracion" aria-label={'Ver la celebración del ' + event.dateLabel}>
      <span>{day}</span>{month ? <span>{month}</span> : null}
    </a>
  </header>;
}

function CoupleWordmark({ first, second }: { first: string; second: string }) {
  return <span className="client-wordmark-crop"><img src={`${import.meta.env.BASE_URL}private-assets/wordmark.webp`} srcSet={`${import.meta.env.BASE_URL}private-assets/wordmark-450.webp 450w, ${import.meta.env.BASE_URL}private-assets/wordmark.webp 900w`} sizes="(max-width: 900px) 94vw, 43vw" alt={`${first} y ${second}`} width="900" height="600" loading="eager" decoding="async" fetchPriority="high"/></span>;
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
    <span>ATH Móvil</span>
    <strong>{number.replaceAll('-', ' · ')}</strong>
    <small aria-live="polite">{copied ? 'Copiado' : 'Toque para copiar'}</small>
  </button>;
}

function WineStory({ event }: { event: PrivateEvent }) {
  const paragraphs = event.story?.paragraphs ?? [];

  return <section className="wine-story-v25" aria-labelledby="wine-story-title">
    <div className="wine-story-copy">
      <h2 id="wine-story-title">Brindemos</h2>
      {paragraphs.length ? <div className="wine-story-narrative">
        {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </div> : null}
    </div>
    <div className="wine-glass-stage-v25">
      <InteractiveWineGlass ariaLabel="Copa de vino que se sirve y responde suavemente al movimiento" />
      <p>Mueva el cursor; en el teléfono puede activar el movimiento de la copa.</p>
    </div>
  </section>;
}

function CelebrationSummary({ event, guest, ceremonyTime, receptionTime }: {
  event: PrivateEvent;
  guest: InvitationPayload['guest'];
  ceremonyTime: string;
  receptionTime: string;
}) {
  const places = `${guest.partyLimit} ${guest.partyLimit === 1 ? 'lugar' : 'lugares'}`;
  return <section className="celebration-summary-v26" id="celebracion" aria-labelledby="celebration-summary-title">
    <ScrollMark place="crest" opacity={0.07}><ArchMark tone="currentColor"/></ScrollMark>
    <div className="celebration-summary-copy">
      <h2 id="celebration-summary-title">El día</h2>
      <p>Hemos reservado <strong>{places}</strong> a su nombre.</p>
      {guest.companionNames?.length ? <p className="celebration-companions"><span>Con usted</span>{guest.companionNames.join(', ')}</p> : null}
    </div>
    <div className="celebration-summary-events">
      <article>
        <LineIcon name="church"/>
        <div><span>Ceremonia · {ceremonyTime}</span><h3>{event.ceremony.name}</h3><p>{event.ceremony.city}</p></div>
      </article>
      <article>
        <LineIcon name="wine"/>
        <div><span>Recepción · {receptionTime}</span><h3>{event.reception.name}</h3><p>{event.reception.city ?? event.reception.note}</p></div>
      </article>
    </div>
  </section>;
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
          <h1 id="client-hero-title">
            <CoupleWordmark first={event.couple.first} second={event.couple.second}/>
          </h1>
          <p className="client-hero-date">{event.dateLabel} · {event.ceremony.city.split(',')[0]}</p>
          <div className="client-hero-personalization">
            <span className="hero-addressee-label">Para</span>
            <span className="hero-addressee-name">{guest.name}</span>
          </div>
        </div>
        <div className="client-hero-art"><ClientCoverArt/></div>
        <a className="hero-scroll-cue" href="#celebracion" aria-label="Ver la celebración">
          <span aria-hidden="true"></span>
        </a>
      </section>

      <WineStory event={event}/>

      <section className="date-v2" aria-label="Cuenta regresiva">
        <div className="date-icon"><LineIcon name="calendar"/></div>
        <div className="date-word"><span>La fecha</span><h2>{event.dateShort}</h2><span>{event.ceremony.city}</span></div>
        <div className="date-countdown"><p>Cuenta regresiva</p><Countdown start={event.start}/><AddToCalendar event={event}/></div>
        <div className="pour-line" aria-hidden="true"><span></span></div>
      </section>

      <CelebrationSummary event={event} guest={guest} ceremonyTime={ceremonyTime} receptionTime={receptionTime}/>

      <section className="event-v2 itinerary-v3" id="detalles">
        <ScrollMark place="corner" opacity={0.06}><WedgeMark tone="currentColor" flip/></ScrollMark>
        <header>
          <h2>El orden de la tarde</h2>
          <p>Ceremonia: {ceremonyTime} · Recepción: {receptionTime}</p>
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
              {event.reception.mapsUrl && event.reception.mapsUrl !== '#' ? <a className="round-action" href={event.reception.mapsUrl} target="_blank" rel="noreferrer" aria-label="Abrir indicaciones de la recepción">↗</a> : null}
              {receptionMoments.length ? <ol className="reception-flow" aria-label="Momentos de la recepción">{receptionMoments.map((moment) => <li key={moment}>{moment}</li>)}</ol> : null}
            </article>
          </li>
        </ol>
      </section>

      <VenueMap event={event}/>

      <section className="guest-details-v3 dress-section-v28" id="etiqueta" aria-labelledby="dress-title">
        <ScrollMark place="edge-right" opacity={0.09}><CacaoPodMark tone="currentColor"/></ScrollMark>
        <header><h2 id="dress-title">Cómo vestir</h2></header>
        <div className="guest-detail-grid">
          <article className="dress-detail">
            <h3>{event.dressCode?.label ?? 'Cóctel / Formal'}</h3>
            <p>{event.dressCode?.note ?? 'Vístase como se sienta bien; la noche es larga y queremos verlo cómodo.'}</p>
            {event.weatherNote ? <div className="weather-note-v25"><strong>Al llegar</strong><p>{event.weatherNote}</p></div> : null}
          </article>
        </div>
      </section>

      {event.gifts ? <section className="guest-details-v3 gift-section-v28" id="detalle" aria-labelledby="gift-title">
        <ScrollMark place="sink" opacity={0.06}><SpeckleDisc tone="currentColor"/></ScrollMark>
        <header><h2 id="gift-title">{event.gifts.heading ?? 'Si desea tener un detalle'}</h2></header>
        <div className="guest-detail-grid">
          <article className="gift-detail">
            <p>{event.gifts.message}</p>
            <GiftNumber number={event.gifts.athMovil}/>
          </article>
        </div>
      </section> : null}

      {faq.length ? <section className="faq-v2" id="preguntas"><ScrollMark place="sink" opacity={0.07}><SpeckleDisc tone="currentColor"/></ScrollMark><header><h2>Antes de venir</h2></header><div>{faq.map((item) => <details key={item.q}><summary><span>{item.q}</span><i aria-hidden="true"></i></summary><p>{item.a}</p></details>)}</div></section> : null}

      <section className="rsvp rsvp-v2 distilled-rsvp" id="rsvp"><ScrollMark place="edge-right" opacity={0.08}><WineGlassMark tone="currentColor"/></ScrollMark><VineRule/><RsvpForm guest={guest}/></section>
    </main>
    <footer className="footer-v2"><div className="footer-names">{event.couple.first}<i><Ampersand className="mark-ampersand" tone="currentColor"/></i>{event.couple.second}</div><VineRule inverted/><div className="footer-meta"><span>{event.dateLabel}</span><span>{event.ceremony.city}</span></div></footer>
  </div>;
}

function DuringWedding({ invitation }: { invitation: InvitationPayload }) {
  const { event } = invitation;
  return <main className="phase-v2 live-v2"><DrawnHeroStillLife/><div><h1>Hoy<br/>brindamos.</h1><p>{event.couple.first} & {event.couple.second} · {event.ceremony.city}</p><a className="crafted-button light" href={event.ceremony.mapsUrl}>Cómo llegar <b aria-hidden="true">↗</b></a></div></main>;
}

function AfterWedding({ invitation }: { invitation: InvitationPayload }) {
  const { event } = invitation;
  return <main className="phase-v2 after-v2"><div className="after-image"><img src={`${import.meta.env.BASE_URL}images/wine-still-life.webp`} alt="Composición de vino, calas, tulipán, uvas y eucalipto" width="1024" height="1536"/></div><div><h1>Gracias por<br/><em>acompañarnos.</em></h1><p>{event.ceremony.city} · {event.dateLabel}</p><div className="gallery-message"><LineIcon name="wine"/><div><b>La galería llegará pronto</b><span>Compartiremos las fotografías seleccionadas aquí.</span></div></div></div></main>;
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
