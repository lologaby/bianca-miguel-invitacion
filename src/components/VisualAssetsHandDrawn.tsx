import { useEffect } from 'react';
import { HeroStillLife as DrawnHero, LineIcon, VineRule, WaxSeal } from './VisualAssetsV2';
import './hand-drawn-motion.css';

export { LineIcon, VineRule, WaxSeal };

export function HeroStillLife() {
  useEffect(() => {
    const root = document.documentElement;
    const drawing = document.querySelector<SVGElement>('.hero-still-life-v2');
    const wine = drawing?.querySelector<SVGGElement>('.wine-volume');
    if (!drawing || !wine || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let current = 0;
    let velocity = 0;
    let target = 0;
    let lastScroll = window.scrollY;
    let frame = 0;

    const tick = () => {
      velocity += (target - current) * .1;
      velocity *= .8;
      current += velocity;
      target *= .89;
      const tilt = Math.max(-6, Math.min(6, current));
      wine.style.setProperty('--liquid-tilt', `${tilt}deg`);
      drawing.style.setProperty('--paper-drift', `${Math.max(-8, Math.min(8, window.scrollY * -.014))}px`);
      root.style.setProperty('--curtain-x', `${Math.sin(window.scrollY * .004) * 14}px`);
      root.style.setProperty('--curtain-y', `${Math.cos(window.scrollY * .003) * 5}px`);
      frame = requestAnimationFrame(tick);
    };

    const onScroll = () => {
      const next = window.scrollY;
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
