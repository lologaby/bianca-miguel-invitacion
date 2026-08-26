import { AnimationEvent, useEffect, useRef } from 'react';
import { Ampersand, InitialB, InitialM } from '../art/ReferenceMarks';
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
        Invitación confirmada
      </p> : null}

      <div className="stationery-envelope" aria-hidden="true">
        <div className="stationery-envelope__back" />
        <article className="stationery-envelope__card" onAnimationEnd={finishOnCard}>
          <span className="stationery-card__rule" />
          {invitation ? <>
            <b>{firstInitial}<i>&amp;</i>{secondInitial}</b>
            <span>{invitation.event.couple.first} &amp; {invitation.event.couple.second} · {invitation.event.dateLabel}</span>
          </> : <span className="stationery-card__promise">Reservado para ti</span>}
          <span className="stationery-card__rule" />
        </article>
        <div className="stationery-envelope__front" />
        <div className="stationery-envelope__flap" />
        <span className="stationery-envelope__seal">
          <span className="envelope-monogram">
            <InitialB className="envelope-initial" tone="#f6eee4" />
            <Ampersand className="envelope-ampersand" tone="#f6eee4" />
            <InitialM className="envelope-initial" tone="#f6eee4" />
          </span>
        </span>
      </div>

      {opening ? <p className="envelope-reveal-note">Abriendo tu invitación…</p> : null}
    </div>
  );
}
