import { useEffect } from 'react';
import { HeroStillLife as DrawnHero, LineIcon as LegacyLineIcon, WaxSeal } from './VisualAssetsV3';
import './hand-drawn-motion.css';
import './mobile-hero-compact.css';
import './rsvp-delicate.css';
import './visual-corrections.css';
import './reservation-legibility.css';

type IconName = 'church' | 'wine' | 'travel' | 'music' | 'calendar';

export { WaxSeal };

export function VineRule({ inverted = false }: { inverted?: boolean }) {
  return (
    <div className={`vine-rule editorial-rule${inverted ? ' inverted' : ''}`} aria-hidden="true">
      <span className="editorial-rule-line" />
      <b><span>B</span><i>&amp;</i><span>M</span></b>
      <span className="editorial-rule-line" />
    </div>
  );
}

export function LineIcon({ name }: { name: IconName }) {
  if (name !== 'calendar') return <LegacyLineIcon name={name} />;
  return (
    <span className="line-icon calendar-glyph" aria-hidden="true">
      <span className="calendar-rings"><i /><i /></span>
      <span className="calendar-days"><i /><i /><i /></span>
    </span>
  );
}

export function HeroStillLife() {
  useEffect(() => {
    const root = document.documentElement;
    const drawing = document.querySelector<SVGElement>('.hero-still-life-v3');
    const wine = drawing?.querySelector<SVGGElement>('.wine-volume');
    if (!drawing || !wine || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let current = 0;
    let velocity = 0;
    let target = 0;
    let lastScroll = scrollY;
    let frame = 0;
    const tick = () => {
      velocity += (target - current) * .1;
      velocity *= .8;
      current += velocity;
      target *= .89;
      const tilt = Math.max(-6, Math.min(6, current));
      wine.style.setProperty('--liquid-tilt', `${tilt}deg`);
      drawing.style.setProperty('--paper-drift', `${Math.max(-8, Math.min(8, scrollY * -.014))}px`);
      root.style.setProperty('--curtain-x', `${Math.sin(scrollY * .004) * 14}px`);
      root.style.setProperty('--curtain-y', `${Math.cos(scrollY * .003) * 5}px`);
      frame = requestAnimationFrame(tick);
    };
    const onScroll = () => {
      const next = scrollY;
      target = Math.max(-7, Math.min(7, (next - lastScroll) * .32));
      lastScroll = next;
    };
    addEventListener('scroll', onScroll, { passive: true });
    frame = requestAnimationFrame(tick);
    return () => {
      removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
      root.style.removeProperty('--curtain-x');
      root.style.removeProperty('--curtain-y');
    };
  }, []);
  return <DrawnHero />;
}
