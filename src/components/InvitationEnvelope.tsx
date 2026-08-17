import { AnimationEvent, useEffect, useRef } from 'react';
import type { InvitationPayload } from '../types/invitation';
import './envelope-reveal.css';

interface Props {
  invitation: InvitationPayload;
  onComplete: () => void;
}

export function InvitationEnvelope({ invitation, onComplete }: Props) {
  const status = useRef<HTMLParagraphElement>(null);
  const firstInitial = invitation.event.couple.first.charAt(0);
  const secondInitial = invitation.event.couple.second.charAt(0);

  useEffect(() => {
    status.current?.focus({ preventScroll: true });
  }, []);

  function finishOnCard(event: AnimationEvent<HTMLElement>) {
    if (event.animationName === 'bm-card-rise' || event.animationName === 'bm-reduced-confirm') onComplete();
  }

  return (
    <div className="invitation-envelope-reveal">
      <p ref={status} className="envelope-reveal-title" role="status" tabIndex={-1}>
        Tu invitación está lista
      </p>

      <div className="stationery-envelope" aria-hidden="true">
        <div className="stationery-envelope__back" />
        <article className="stationery-envelope__card" onAnimationEnd={finishOnCard}>
          <span className="stationery-card__rule" />
          <b>{firstInitial}<i>&amp;</i>{secondInitial}</b>
          <span>Una noche para brindar despacio</span>
          <span className="stationery-card__rule" />
        </article>
        <div className="stationery-envelope__front">
          <span className="stationery-envelope__seam left" />
          <span className="stationery-envelope__seam right" />
        </div>
        <div className="stationery-envelope__flap">
          <span className="stationery-envelope__seal">
            <b>{firstInitial}</b><i>&amp;</i><b>{secondInitial}</b>
          </span>
        </div>
      </div>

      <p className="envelope-reveal-note">Abriendo tu lugar en la mesa…</p>
    </div>
  );
}
