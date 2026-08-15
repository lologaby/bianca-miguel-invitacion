import './visual-assets-v2.css';

type IconName = 'church' | 'wine' | 'travel' | 'music' | 'calendar';

export function HeroStillLife() {
  const grapes = [[388,552,21],[424,558,24],[458,572,21],[372,590,23],[410,596,25],[446,611,22],[390,630,22],[427,642,24],[410,678,21]];
  return (
    <svg className="hero-still-life hero-still-life-v2" viewBox="0 0 720 780" role="img" aria-label="Composición dibujada a mano con una copa de vino completa, uvas, chocolate, tulipanes y calas">
      <defs>
        <clipPath id="glass-bowl-v2"><path d="M91 78c4 153 31 259 119 284 88-25 115-131 119-284Z"/></clipPath>
        <linearGradient id="wine-sheen-v2" x1="0" x2="1"><stop stopColor="#5a2635"/><stop offset=".52" stopColor="#773a49"/><stop offset="1" stopColor="#4a202d"/></linearGradient>
        <linearGradient id="glass-glint-v2" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff" stopOpacity=".3"/><stop offset="1" stopColor="#fff" stopOpacity="0"/></linearGradient>
      </defs>

      <circle className="orbit orbit-one" cx="500" cy="245" r="186"/>
      <circle className="orbit orbit-two" cx="500" cy="245" r="124"/>

      <g className="glass-drawing glass-drawing-v2">
        <path className="glass-bowl-outline" d="M91 78c4 153 31 259 119 284 88-25 115-131 119-284Z"/>
        <g className="wine-volume" clipPath="url(#glass-bowl-v2)">
          <rect x="82" y="172" width="256" height="205" fill="url(#wine-sheen-v2)"/>
          <ellipse className="wine-surface" cx="210" cy="172" rx="113" ry="17"/>
        </g>
        <path className="glass-glint" d="M119 104c7 92 21 165 62 207"/>
        <path className="glass-stem" d="M210 362C209 451 211 540 210 628"/>
        <path className="glass-foot" d="M104 679c39-15 173-15 212 0-39 17-173 17-212 0Z"/>
        <path className="glass-foot-highlight" d="M128 676c46-8 118-8 164 0"/>
      </g>

      <g className="calla calla-one">
        <path className="stem" d="M522 704C493 550 489 364 515 197"/>
        <path className="leaf" d="M501 535c-74-67-68-132-51-177 62 43 83 104 51 177Z"/>
        <path className="petal" d="M516 200c-70-52-49-135 11-157 73 40 93 123-11 157Z"/>
        <path className="petal-line" d="M516 195c29-54 35-96 12-147"/>
        <path className="pistil" d="M525 163c12-39 15-70 9-91"/>
      </g>
      <g className="calla calla-two">
        <path className="stem" d="M616 714c-19-153-2-270 22-374"/>
        <path className="petal" d="M641 343c-64-29-65-100-13-130 63 18 91 80 13 130Z"/>
        <path className="petal-line" d="M640 338c22-43 19-78-8-120"/>
        <path className="pistil" d="M640 309c7-31 4-52-5-69"/>
      </g>
      <g className="tulip">
        <path className="stem" d="M353 698c19-141 14-241-5-333"/>
        <path className="leaf" d="M356 565c58-49 67-97 59-131-50 31-75 75-59 131Z"/>
        <path className="tulip-head" d="M348 366c-54-27-58-88-31-128 22 28 36 40 54 0 36 42 31 102-23 128Z"/>
        <path className="petal-line" d="M348 359c-7-54-2-82 22-116M348 359c5-54-6-84-30-115"/>
      </g>

      <g className="grapes grapes-v2">
        {grapes.map(([cx, cy, r], index) => <circle key={index} cx={cx} cy={cy} r={r}/>) }
        <path className="grape-vine" d="M415 541c-8-47 22-66 53-72 1 29-17 55-53 72Zm-2 1c-14-34-8-57 10-77"/>
        <path className="grape-highlight" d="M371 584c17-13 36-20 55-21"/>
      </g>
      <g className="chocolate chocolate-v2">
        <rect x="67" y="576" width="91" height="91" rx="3"/>
        <path d="M112.5 576v91M67 621.5h91"/>
        <rect x="126" y="644" width="70" height="70" rx="3" transform="rotate(11 161 679)"/>
        <path d="m131 672 69 14M168 648l-14 68"/>
      </g>
      <text className="poster-word" x="68" y="754">RESERVA · PRIVADA</text>
    </svg>
  );
}

export function VineRule({ inverted = false }: { inverted?: boolean }) {
  return <svg className={`vine-rule${inverted ? ' inverted' : ''}`} viewBox="0 0 640 46" aria-hidden="true"><path d="M4 24c116 0 160-3 242-3 83 0 155 5 260 3 51-1 86-5 130-17"/><path d="M116 22c-18-22-42-19-55-6 16 14 34 17 55 6Zm99 0c13-23 36-26 53-15-12 17-30 23-53 15Zm265 2c-12-19-31-21-46-12 10 15 26 19 46 12Z"/><circle cx="520" cy="21" r="5"/><circle cx="531" cy="16" r="5"/><circle cx="533" cy="27" r="5"/><circle cx="543" cy="22" r="5"/></svg>;
}

export function LineIcon({ name }: { name: IconName }) {
  if (name === 'church') return <svg className="line-icon" viewBox="0 0 64 64" aria-hidden="true"><path d="M8 57h48M16 57V27l16-13 16 13v30M24 57V41h16v16M32 14V3M26 8h12"/></svg>;
  if (name === 'wine') return <svg className="line-icon" viewBox="0 0 64 64" aria-hidden="true"><path d="M16 5h32c0 23-4 34-16 36C20 39 16 28 16 5Zm16 36v13M21 59h22"/><path className="icon-fill" d="M19 23h26c-2 10-6 15-13 16-7-1-11-6-13-16Z"/></svg>;
  if (name === 'travel') return <svg className="line-icon" viewBox="0 0 64 64" aria-hidden="true"><path d="M7 35 57 8 37 57l-6-19-24-3Z"/><path d="m31 38 26-30"/></svg>;
  if (name === 'music') return <svg className="line-icon" viewBox="0 0 64 64" aria-hidden="true"><path d="M22 48V15l29-7v32M22 25l29-7"/><ellipse cx="14" cy="49" rx="8" ry="6"/><ellipse cx="43" cy="41" rx="8" ry="6"/></svg>;
  return <svg className="line-icon" viewBox="0 0 64 64" aria-hidden="true"><rect x="8" y="13" width="48" height="43"/><path d="M8 25h48M20 7v12M44 7v12M20 35h7M36 35h7M20 45h7M36 45h7"/></svg>;
}

export function WaxSeal() {
  return <span className="wax-seal" aria-hidden="true"><span>B</span><i>&</i><span>P</span></span>;
}
