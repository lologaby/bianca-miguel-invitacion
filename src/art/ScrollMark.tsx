import { useEffect, useRef, useState, type ReactNode } from 'react';
import './scroll-marks.css';

/**
 * Releases one of the reference's marks as it comes into view.
 *
 * The client's artwork puts every element on a single poster. Spread down the
 * page instead, each mark gets its own moment: it drifts up and fades in once,
 * then stays. Kept deliberately faint — these sit behind the copy and are meant
 * to be noticed on the second read, not the first.
 *
 * Honours prefers-reduced-motion by simply being present, unanimated.
 */
export function ScrollMark({
  children,
  className = '',
  /** Where the mark sits, as a placement class suffix. */
  place,
  /** Final opacity. These are watermarks — keep them under about .14. */
  opacity = 0.1,
  /** Seconds of delay once it enters view, for staggering a pair. */
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  place: string;
  opacity?: number;
  delay?: number;
}) {
  const host = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    if (!('IntersectionObserver' in window)) { setShown(true); return; }

    const observer = new IntersectionObserver(
      (entries) => {
        // one-way: once a mark has arrived it does not flicker back out
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.01 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <span
      ref={host}
      aria-hidden="true"
      className={`scroll-mark scroll-mark--${place} ${shown ? 'is-shown' : ''} ${className}`}
      style={{ '--mark-opacity': opacity, '--mark-delay': `${delay}s` } as React.CSSProperties}
    >
      {children}
    </span>
  );
}
