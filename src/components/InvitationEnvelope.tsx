import { AnimationEvent, useEffect, useRef } from 'react';
import type { InvitationPayload } from '../types/invitation';
import './envelope-reveal.css';

interface Props {
  invitation?: InvitationPayload | null;
  opening?: boolean;
  onComplete: () => void;
}

export function InvitationEnvelope({ invitation, opening = true, onComplete }: Props) {
  const status = useRef<HTMLParagraphElement>(null);
  const firstInitial = invitation?.event.couple.first.charAt(0);
  const secondInitial = invitation?.event.couple.second.charAt(0);

  useEffect(() => {
    if (opening) status.current?.focus({ preventScroll: true });
  }, [opening]);

  function finishOnCard(event: AnimationEvent<HTMLElement>) {
    if (!opening) return;
    if (event.animationName === 'bm-envelope-card-open' || event.animationName === 'bm-envelope-reduced-confirm') onComplete();
  }

  return (
    <div className={'invitation-envelope-reveal ' + (opening ? 'is-opening' : 'is-closed')} aria-hidden={opening ? undefined : true}>
      {opening ? <p ref={status} className="envelope-reveal-title" role="status" tabIndex={-1}>
        Su invitación está lista
      </p> : null}

      <div className="stationery-envelope" aria-hidden="true">
        <div className="stationery-envelope__back" />
        <article className="stationery-envelope__card" onAnimationEnd={finishOnCard}>
          <span className="stationery-card__rule" />
          {invitation ? <>
            <b>{firstInitial}<i>&amp;</i>{secondInitial}</b>
            <span>Una noche para brindar despacio</span>
          </> : <span className="stationery-card__promise">Reservado para usted</span>}
          <span className="stationery-card__rule" />
        </article>
        <div className="stationery-envelope__front">
          <span className="stationery-envelope__seam left" />
          <span className="stationery-envelope__seam right" />
        </div>
        <div className="stationery-envelope__flap" />
        <span className="stationery-envelope__seal">
          <svg viewBox="0 0 32 32" focusable="false" aria-hidden="true">
            <path d="M16 24V11" />
            <path d="M16 15c-4.4-.2-7-2.2-7.7-6.1 4.3-.4 7.1 1.6 7.7 6.1Z" />
            <path d="M16 18c4.4-.2 7-2.2 7.7-6.1-4.3-.4-7.1 1.6-7.7 6.1Z" />
            <path d="M12 24h8" />
          </svg>
        </span>
      </div>

      {opening ? <p className="envelope-reveal-note">Abriendo su lugar en la mesa…</p> : null}
    </div>
  );
}
