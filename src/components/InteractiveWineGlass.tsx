import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { GLASS_PATH, GLASS_VIEWBOX } from '../art/traced-marks';
import './interactive-wine-glass.css';

type OrientationPermission = 'granted' | 'denied';
type OrientationConstructor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<OrientationPermission>;
};

type OrientationControlState =
  | 'unavailable'
  | 'available'
  | 'requesting'
  | 'active'
  | 'denied';

export interface InteractiveWineGlassProps {
  className?: string;
  /** Accessible description for the illustration. */
  ariaLabel?: string;
}

interface LiquidPhysics {
  fill: number;
  fillVelocity: number;
  phase: number;
  tilt: number;
  tiltVelocity: number;
  pointerTilt: number;
  orientationTilt: number;
  scrollKick: number;
  /** Vertical displacement of the whole surface — the "gravity" of the pour. */
  bob: number;
  bobVelocity: number;
  splash: number;
  pointerActive: boolean;
  lastPointerX: number;
  visible: boolean;
  pageVisible: boolean;
  started: boolean;
  orientationListening: boolean;
  orientationPermissionGranted: boolean;
}

/*
 * All of these are in the traced glass's own units (see GLASS_VIEWBOX). The
 * surface deliberately overshoots the silhouette on both sides — the clip path
 * trims it to the bowl, so the wine meets the glass wall exactly however the
 * bowl curves.
 *
 * Measured off the silhouette: the bowl runs from the rim down to y≈152, where
 * it necks into the stem. The wine must never spill past that.
 */
const SURFACE_LEFT = -8;
const SURFACE_RIGHT = 129.5;
/* A poured glass sits at the bowl's widest point, not at the rim. */
const SURFACE_TOP = 74;
const SURFACE_BOTTOM = 148;
const BOWL_BASE = 156;
const GLASS_CENTRE = 60.75;
const SURFACE_POINTS = 34;
const FRAME = 1000 / 60;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function makeSurface(
  level: number,
  tilt: number,
  phase: number,
  amplitude: number,
) {
  const points: string[] = [];
  const width = SURFACE_RIGHT - SURFACE_LEFT;

  for (let index = 0; index <= SURFACE_POINTS; index += 1) {
    const progress = index / SURFACE_POINTS;
    const x = SURFACE_LEFT + width * progress;
    const centered = progress * 2 - 1;
    const edgeDamping = Math.sin(progress * Math.PI) * 0.78 + 0.22;
    const wave =
      Math.sin(progress * Math.PI * 2.15 + phase) * amplitude * 0.58 +
      Math.sin(progress * Math.PI * 4.6 - phase * 1.42) * amplitude * 0.27 +
      Math.sin(progress * Math.PI * 7.1 + phase * 0.73) * amplitude * 0.15;
    const y = level + centered * tilt + wave * edgeDamping;
    points.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
  }

  return points;
}

function makeLiquidPath(surface: string[]) {
  return `M ${surface.join(' L ')} L ${SURFACE_RIGHT} ${BOWL_BASE} L ${SURFACE_LEFT} ${BOWL_BASE} Z`;
}

function makeSurfacePath(surface: string[]) {
  return `M ${surface.join(' L ')}`;
}

const initialSurface = makeSurface(SURFACE_BOTTOM, 0, 0, 0);
const initialLiquidPath = makeLiquidPath(initialSurface);
const initialSurfacePath = makeSurfacePath(initialSurface);

/**
 * A dependency-free SVG wine glass with a lightweight, spring-driven liquid
 * surface. The animation only runs while the component is visible.
 */
export function InteractiveWineGlass({
  className = '',
  ariaLabel = 'Copa de vino que se sirve y responde suavemente al movimiento',
}: InteractiveWineGlassProps) {
  const rootRef = useRef<HTMLElement>(null);
  const liquidPathRef = useRef<SVGPathElement>(null);
  const surfacePathRef = useRef<SVGPathElement>(null);
  const streamRef = useRef<SVGPathElement>(null);
  const motionGroupRef = useRef<SVGGElement>(null);
  const orientationHandlerRef = useRef<((event: DeviceOrientationEvent) => void) | null>(null);
  const pointerBoundsRef = useRef<DOMRectReadOnly | null>(null);
  const wakeAnimationRef = useRef<() => void>(() => undefined);
  const reducedMotionRef = useRef(false);
  /*
   * Kept only to drive the effect's own bookkeeping. There is no button: asking
   * "activar movimiento de la copa?" put a permission prompt in the middle of a
   * wedding invitation, which is exactly the kind of thing this page is supposed
   * not to do. Browsers that hand out orientation without a gesture (Android)
   * get the tilt; iOS, which demands one, simply does without it.
   */
  const [orientationControl, setOrientationControl] =
    useState<OrientationControlState>('unavailable');
  void orientationControl;

  const physicsRef = useRef<LiquidPhysics>({
    fill: 0,
    fillVelocity: 0,
    phase: 0,
    tilt: 0,
    tiltVelocity: 0,
    pointerTilt: 0,
    orientationTilt: 0,
    scrollKick: 0,
    bob: 0,
    bobVelocity: 0,
    splash: 0,
    pointerActive: false,
    lastPointerX: 0,
    visible: false,
    pageVisible: typeof document === 'undefined' || document.visibilityState === 'visible',
    started: false,
    orientationListening: false,
    orientationPermissionGranted: false,
  });

  const id = useId().replaceAll(':', '');
  const titleId = `wine-glass-title-${id}`;
  const descriptionId = `wine-glass-description-${id}`;
  const clipId = `wine-glass-clip-${id}`;

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === 'touch' && !event.isPrimary) return;

    const bounds = pointerBoundsRef.current ?? event.currentTarget.getBoundingClientRect();
    pointerBoundsRef.current = bounds;
    if (bounds.width === 0) return;

    const normalized = clamp((event.clientX - bounds.left) / bounds.width, 0, 1) * 2 - 1;
    const physics = physicsRef.current;
    const change = Math.abs(normalized - physics.lastPointerX);
    physics.pointerTilt = normalized * 12;
    physics.pointerActive = true;
    physics.lastPointerX = normalized;
    physics.splash = clamp(physics.splash + change * 0.75, 0, 1.35);
    wakeAnimationRef.current();
  }, []);

  const cachePointerBounds = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    pointerBoundsRef.current = event.currentTarget.getBoundingClientRect();
  }, []);

  const handlePointerEnd = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'mouse' || event.type === 'pointerleave') {
      physicsRef.current.pointerActive = false;
      wakeAnimationRef.current();
    }
  }, []);

  const enableDeviceMotion = useCallback(async () => {
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) return;

    const OrientationEvent = window.DeviceOrientationEvent as OrientationConstructor;
    const handler = orientationHandlerRef.current;
    if (!handler) return;

    setOrientationControl('requesting');

    try {
      const permission = OrientationEvent.requestPermission
        ? await OrientationEvent.requestPermission()
        : 'granted';

      if (permission !== 'granted') {
        setOrientationControl('denied');
        return;
      }

      physicsRef.current.orientationPermissionGranted = true;
      if (!reducedMotionRef.current && !physicsRef.current.orientationListening) {
        window.addEventListener('deviceorientation', handler, { passive: true });
        physicsRef.current.orientationListening = true;
      }
      setOrientationControl('active');
    } catch {
      setOrientationControl('denied');
    }
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const liquidPath = liquidPathRef.current;
    const surfacePath = surfacePathRef.current;
    const stream = streamRef.current;
    const motionGroup = motionGroupRef.current;
    if (!root || !liquidPath || !surfacePath || !stream || !motionGroup) return;

    const physics = physicsRef.current;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduce = reducedMotion.matches;
    reducedMotionRef.current = reduce;
    let frame = 0;
    let lastSimulationFrame = performance.now();
    let lastPaintFrame = 0;
    let lastScrollY = window.scrollY;
    let lastScrollTime = performance.now();

    const draw = (fill: number, tilt: number, phase: number, amplitude: number, bob = 0) => {
      const resting = SURFACE_BOTTOM - (SURFACE_BOTTOM - SURFACE_TOP) * clamp(fill, 0, 1.055);
      // never let the slosh climb out of the bowl or drain below its base
      const level = clamp(resting + bob, 6, BOWL_BASE - 4);
      const surface = makeSurface(level, tilt, phase, amplitude);
      liquidPath.setAttribute('d', makeLiquidPath(surface));
      surfacePath.setAttribute('d', makeSurfacePath(surface));
      stream.setAttribute('d', `M ${GLASS_CENTRE} 4 L ${GLASS_CENTRE} ${Math.max(10, level - 1).toFixed(1)}`);

      const streamVisibility = fill < 0.78 ? clamp(fill * 4, 0, 0.68) : clamp((1 - fill) * 3.1, 0, 0.68);
      stream.style.opacity = String(streamVisibility);
      motionGroup.style.transform = `translate3d(0, 0, 0) rotate(${(tilt * 0.025).toFixed(3)}deg)`;
    };

    const drawStatic = () => {
      physics.fill = 1;
      physics.fillVelocity = 0;
      physics.tilt = 0;
      physics.tiltVelocity = 0;
      physics.pointerTilt = 0;
      physics.orientationTilt = 0;
      physics.scrollKick = 0;
      physics.splash = 0;
      physics.pointerActive = false;
      draw(1, 0, 0, 0);
      stream.style.opacity = '0';
      motionGroup.style.transform = 'translate3d(0, 0, 0)';
    };

    const scheduleFrame = () => {
      if (!frame && !reduce && physics.visible && physics.pageVisible) {
        frame = window.requestAnimationFrame(tick);
      }
    };
    wakeAnimationRef.current = scheduleFrame;

    const tick = (now: number) => {
      frame = 0;
      if (reduce || !physics.visible || !physics.pageVisible) return;

      if (lastPaintFrame > 0 && now - lastPaintFrame < FRAME - 1) {
        frame = window.requestAnimationFrame(tick);
        return;
      }

      const elapsed = clamp(now - lastSimulationFrame, 4, 34);
      const step = elapsed / FRAME;
      lastSimulationFrame = now;
      lastPaintFrame = now;

      if (!physics.started) physics.started = true;

      if (Math.abs(1 - physics.fill) > 0.001 || Math.abs(physics.fillVelocity) > 0.0005) {
        // slower and less damped than before: the pour used to be over almost
        // before it began, which is why nobody noticed the glass filling
        physics.fillVelocity += (1 - physics.fill) * 0.0068 * step;
        physics.fillVelocity *= Math.pow(0.94, step);
        physics.fill += physics.fillVelocity * step;
        physics.fill = clamp(physics.fill, 0, 1.065);

        if (Math.abs(1 - physics.fill) < 0.001 && Math.abs(physics.fillVelocity) < 0.0005) {
          physics.fill = 1;
          physics.fillVelocity = 0;
        }
      }

      const requestedTilt =
        (physics.pointerActive ? physics.pointerTilt : physics.orientationTilt) +
        physics.scrollKick +
        // the surface leans into the swing; a perfectly level slosh looks rigid
        physics.bobVelocity * 0.28;
      physics.tiltVelocity += (requestedTilt - physics.tilt) * 0.08 * step;
      physics.tiltVelocity *= Math.pow(0.79, step);
      physics.tilt += physics.tiltVelocity * step;
      physics.tilt = clamp(physics.tilt, -15, 15);

      /*
       * A damped spring, tuned to underdamped. The old numbers settled inside a
       * single swing, which is what made the motion read as a nudge rather than
       * as liquid: real wine in a glass crosses the level line two or three
       * times before it gives up.
       */
      physics.bobVelocity += -physics.bob * 0.155 * step;
      physics.bobVelocity *= Math.pow(0.935, step);
      physics.bob += physics.bobVelocity * step;
      physics.bob = clamp(physics.bob, -16, 16);

      physics.scrollKick *= Math.pow(0.83, step);
      // the ripple rides the swing rather than outliving it
      physics.splash *= Math.pow(0.88, step);
      physics.phase += elapsed * (0.0032 + physics.splash * 0.0028);

      const fillIsMoving =
        Math.abs(1 - physics.fill) > 0.001 ||
        Math.abs(physics.fillVelocity) > 0.0005;
      const tiltIsMoving =
        Math.abs(requestedTilt - physics.tilt) > 0.025 ||
        Math.abs(physics.tiltVelocity) > 0.0025;
      const surfaceIsMoving =
        physics.splash > 0.012 ||
        Math.abs(physics.scrollKick) > 0.012 ||
        Math.abs(physics.bob) > 0.05 ||
        Math.abs(physics.bobVelocity) > 0.05;
      const shouldContinue = fillIsMoving || tiltIsMoving || surfaceIsMoving;
      const pourEnergy = Math.min(1, Math.abs(physics.fillVelocity) * 15);
      const amplitude = shouldContinue
        ? 0.45 + Math.abs(physics.tiltVelocity) * 0.6 + physics.splash * 5.2 + pourEnergy * 3.2
        : 0;
      draw(physics.fill, physics.tilt, physics.phase, amplitude, physics.bob);
      if (shouldContinue) scheduleFrame();
    };

    const onVisibilityChange = () => {
      physics.pageVisible = document.visibilityState === 'visible';
      if (!physics.pageVisible) {
        if (physics.orientationListening) {
          window.removeEventListener('deviceorientation', onOrientation);
          physics.orientationListening = false;
        }
        if (frame) window.cancelAnimationFrame(frame);
        frame = 0;
      } else {
        syncOrientation();
        scheduleFrame();
      }
    };

    const onReducedMotionChange = (event: MediaQueryListEvent) => {
      reduce = event.matches;
      reducedMotionRef.current = reduce;
      if (reduce) {
        if (physics.orientationListening) {
          window.removeEventListener('deviceorientation', onOrientation);
          physics.orientationListening = false;
        }
        if (frame) window.cancelAnimationFrame(frame);
        frame = 0;
        drawStatic();
      } else {
        physics.phase = 0;
        syncOrientation();
        scheduleFrame();
      }
    };

    const onScroll = () => {
      const now = performance.now();
      const elapsed = Math.max(16, now - lastScrollTime);
      const distance = window.scrollY - lastScrollY;
      const velocity = distance / elapsed;
      lastScrollY = window.scrollY;
      lastScrollTime = now;

      if (reduce || !physics.visible || !physics.pageVisible || Math.abs(velocity) < 0.22) return;
      physics.splash = clamp(physics.splash + Math.abs(velocity) * 0.34, 0, 1.35);
      // the wine lags behind the glass: scrolling down throws the surface up
      physics.bobVelocity = clamp(physics.bobVelocity - velocity * 1.35, -30, 30);
      physics.scrollKick = clamp(physics.scrollKick + velocity * 0.5, -2.4, 2.4);
      scheduleFrame();
    };

    const onOrientation = (event: DeviceOrientationEvent) => {
      if (reduce || !physics.visible || !physics.pageVisible) return;

      const gamma = event.gamma;
      const beta = event.beta;
      if (gamma === null && beta === null) return;

      const legacyAngle = (window as Window & { orientation?: number }).orientation ?? 0;
      const screenAngle = window.screen.orientation?.angle ?? legacyAngle;
      const normalizedAngle = ((screenAngle % 360) + 360) % 360;
      let lateralTilt = gamma ?? 0;

      if (normalizedAngle === 90) lateralTilt = beta ?? lateralTilt;
      if (normalizedAngle === 180) lateralTilt = -(gamma ?? lateralTilt);
      if (normalizedAngle === 270) lateralTilt = -(beta ?? lateralTilt);

      const nextTilt = clamp(lateralTilt / 22, -1, 1) * 11;
      const change = Math.abs(nextTilt - physics.orientationTilt);
      if (change < 0.08) return;

      physics.orientationTilt = nextTilt;
      physics.splash = clamp(physics.splash + change * 0.012, 0, 0.9);
      scheduleFrame();
    };
    orientationHandlerRef.current = onOrientation;

    const syncOrientation = () => {
      const canUseOrientation =
        'DeviceOrientationEvent' in window &&
        window.navigator.maxTouchPoints > 0 &&
        !reduce;
      if (!canUseOrientation) return;

      const OrientationEvent = window.DeviceOrientationEvent as OrientationConstructor;
      if (typeof OrientationEvent.requestPermission === 'function') {
        if (!physics.orientationPermissionGranted) {
          setOrientationControl('available');
          return;
        }
      } else {
        physics.orientationPermissionGranted = true;
      }

      if (!physics.orientationListening) {
        window.addEventListener('deviceorientation', onOrientation, { passive: true });
        physics.orientationListening = true;
      }
      setOrientationControl('active');
    };
    syncOrientation();

    const pointerBoundsObserver = new ResizeObserver(() => {
      pointerBoundsRef.current = root.getBoundingClientRect();
    });
    pointerBoundsRef.current = root.getBoundingClientRect();
    pointerBoundsObserver.observe(root);

    const observer = new IntersectionObserver(
      ([entry]) => {
        physics.visible = entry.isIntersecting && entry.intersectionRatio > 0.12;
        if (physics.visible) {
          syncOrientation();
          scheduleFrame();
        } else {
          physics.pointerActive = false;
          if (physics.orientationListening) {
            window.removeEventListener('deviceorientation', onOrientation);
            physics.orientationListening = false;
          }
          if (frame) window.cancelAnimationFrame(frame);
          frame = 0;
        }
      },
      { rootMargin: '12% 0px', threshold: [0, 0.12, 0.35] },
    );

    observer.observe(root);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('scroll', onScroll, { passive: true });
    reducedMotion.addEventListener('change', onReducedMotionChange);

    if (reduce) drawStatic();

    return () => {
      observer.disconnect();
      pointerBoundsObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('scroll', onScroll);
      reducedMotion.removeEventListener('change', onReducedMotionChange);
      if (physics.orientationListening) {
        window.removeEventListener('deviceorientation', onOrientation);
        physics.orientationListening = false;
      }
      if (frame) window.cancelAnimationFrame(frame);
      orientationHandlerRef.current = null;
      wakeAnimationRef.current = () => undefined;
      pointerBoundsRef.current = null;
    };
  }, []);

  return (
    <figure
      ref={rootRef}
      className={`interactive-wine-glass ${className}`.trim()}
      onPointerEnter={cachePointerBounds}
      onPointerDown={cachePointerBounds}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerEnd}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      <svg
        className="interactive-wine-glass__art"
        viewBox={GLASS_VIEWBOX}
        role="img"
        aria-labelledby={`${titleId} ${descriptionId}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <title id={titleId}>{ariaLabel}</title>
        <desc id={descriptionId}>
          El vino se sirve al aparecer la copa y su superficie se inclina con el desplazamiento de la página.
        </desc>
        <defs>
          {/*
            The silhouette itself is the clip. Anything drawn inside is bounded by
            the real glass wall, so the wine never has to be shaped by hand.
          */}
          <clipPath id={clipId}>
            <path d={GLASS_PATH} />
          </clipPath>
        </defs>

        <g ref={motionGroupRef} className="interactive-wine-glass__motion">
          <g clipPath={`url(#${clipId})`}>
            {/* the empty glass, in the reference's flat two-tone language */}
            <rect className="interactive-wine-glass__vessel" x="-10" y="-10" width="142" height="320" />
            <path
              ref={liquidPathRef}
              className="interactive-wine-glass__wine"
              d={initialLiquidPath}
            />
            <path
              ref={surfacePathRef}
              className="interactive-wine-glass__surface"
              d={initialSurfacePath}
            />
            <path ref={streamRef} className="interactive-wine-glass__stream" d={`M ${GLASS_CENTRE} 4 L ${GLASS_CENTRE} 4`} />
          </g>
        </g>
      </svg>

    </figure>
  );
}

export default InteractiveWineGlass;
