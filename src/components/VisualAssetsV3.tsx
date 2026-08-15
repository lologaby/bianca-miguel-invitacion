import { LineIcon, VineRule, WaxSeal } from './VisualAssetsV2';
import './visual-assets-v3.css';

export { LineIcon, VineRule, WaxSeal };

export function HeroStillLife() {
  const grapes = [[388,552,21],[424,558,24],[458,572,21],[372,590,23],[410,596,25],[446,611,22],[390,630,22],[427,642,24],[410,678,21]];
  return (
    <svg className="hero-still-life hero-still-life-v2 hero-still-life-v3" viewBox="0 0 720 780" role="img" aria-label="Composición dibujada a mano con copa de vino, uvas, chocolate, tulipanes y calas">
      <defs>
        <clipPath id="glass-bowl-v3"><path d="M91 78c4 153 31 259 119 284 88-25 115-131 119-284Z"/></clipPath>
        <linearGradient id="wine-sheen-v3" x1="0" x2="1"><stop stopColor="#5a2635"/><stop offset=".52" stopColor="#773a49"/><stop offset="1" stopColor="#4a202d"/></linearGradient>
        <linearGradient id="glass-glint-v3" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff" stopOpacity=".3"/><stop offset="1" stopColor="#fff" stopOpacity="0"/></linearGradient>
      </defs>

      <circle className="orbit orbit-one" cx="500" cy="245" r="186"/><circle className="orbit orbit-two" cx="500" cy="245" r="124"/>
      <g className="glass-drawing glass-drawing-v2">
        <path className="glass-bowl-outline" d="M91 78c4 153 31 259 119 284 88-25 115-131 119-284Z"/>
        <g className="wine-volume" clipPath="url(#glass-bowl-v3)">
          <g className="wine-liquid-rise">
            <rect x="82" y="172" width="256" height="205" fill="url(#wine-sheen-v3)"/>
            <ellipse className="wine-surface" cx="210" cy="172" rx="113" ry="17"/>
          </g>
        </g>
        <path className="glass-glint" d="M119 104c7 92 21 165 62 207"/>
        <path className="glass-stem" d="M210 362C209 466 211 574 210 673"/>
        <path className="glass-foot" d="M104 679c39-15 173-15 212 0-39 17-173 17-212 0Z"/>
        <path className="glass-foot-highlight" d="M128 676c46-8 118-8 164 0"/>
      </g>

      <g className="calla calla-one"><path className="stem" d="M522 704C493 550 489 364 515 197"/><path className="leaf" d="M501 535c-74-67-68-132-51-177 62 43 83 104 51 177Z"/><path className="petal" d="M516 200c-70-52-49-135 11-157 73 40 93 123-11 157Z"/><path className="petal-line" d="M516 195c29-54 35-96 12-147"/><path className="pistil" d="M525 163c12-39 15-70 9-91"/></g>
      <g className="calla calla-two"><path className="stem" d="M616 714c-19-153-2-270 22-374"/><path className="petal" d="M641 343c-64-29-65-100-13-130 63 18 91 80 13 130Z"/><path className="petal-line" d="M640 338c22-43 19-78-8-120"/><path className="pistil" d="M640 309c7-31 4-52-5-69"/></g>
      <g className="tulip"><path className="stem" d="M353 698c19-141 14-241-5-333"/><path className="leaf" d="M356 565c58-49 67-97 59-131-50 31-75 75-59 131Z"/><path className="tulip-head" d="M348 366c-54-27-58-88-31-128 22 28 36 40 54 0 36 42 31 102-23 128Z"/><path className="petal-line" d="M348 359c-7-54-2-82 22-116M348 359c5-54-6-84-30-115"/></g>
      <g className="grapes grapes-v2">{grapes.map(([cx,cy,r],i)=><circle key={i} cx={cx} cy={cy} r={r}/>)}<path className="grape-vine" d="M415 541c-8-47 22-66 53-72 1 29-17 55-53 72Zm-2 1c-14-34-8-57 10-77"/><path className="grape-highlight" d="M371 584c17-13 36-20 55-21"/></g>
      <g className="chocolate chocolate-v3">
        <g><rect x="67" y="576" width="91" height="91" rx="3"/><path d="M112.5 580v83M71 621.5h83"/></g>
        <g transform="rotate(11 161 679)"><rect x="126" y="644" width="70" height="70" rx="3"/><path d="M130 679h62M161 648v62"/></g>
      </g>
      <text className="poster-word" x="68" y="754">RESERVA · PRIVADA</text>
    </svg>
  );
}
