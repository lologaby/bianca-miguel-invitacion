type IconName = 'church' | 'wine' | 'travel' | 'music' | 'calendar';

export function HeroStillLife() {
  return (
    <svg className="hero-still-life" viewBox="0 0 720 780" role="img" aria-label="Composición gráfica de una copa de vino, uvas, tulipanes y calas">
      <defs>
        <clipPath id="glass-bowl"><path d="M95 92h230c0 164-28 258-115 268C123 350 95 256 95 92Z"/></clipPath>
        <linearGradient id="wine-sheen" x1="0" x2="1"><stop stopColor="#612f3b"/><stop offset="1" stopColor="#7f4451"/></linearGradient>
      </defs>
      <circle className="orbit orbit-one" cx="472" cy="244" r="188"/>
      <circle className="orbit orbit-two" cx="472" cy="244" r="126"/>
      <path className="fine-line long-stem" d="M551 706C500 562 502 350 568 123"/>
      <path className="fine-line long-stem delay-line" d="M633 716C598 570 620 390 651 235"/>

      <g className="glass-drawing">
        <path className="glass-line" d="M95 92h230c0 164-28 258-115 268C123 350 95 256 95 92ZM210 360v263m-87 54h174"/>
        <rect className="wine-level" x="82" y="229" width="258" height="150" clipPath="url(#glass-bowl)" fill="url(#wine-sheen)"/>
        <path className="wine-rim" d="M105 229c55 16 156 16 210 0"/>
      </g>

      <g className="calla calla-one">
        <path className="stem" d="M491 684C468 522 474 353 502 196"/>
        <path className="leaf" d="M480 520c-76-73-68-134-55-180 62 45 88 103 55 180Z"/>
        <path className="petal" d="M503 201c-72-54-51-137 9-158 73 39 96 121-9 158Z"/>
        <path className="petal-line" d="M502 197c28-55 34-98 11-149"/>
        <path className="pistil" d="M511 163c12-40 15-71 9-92"/>
      </g>
      <g className="calla calla-two">
        <path className="stem" d="M590 713c-20-157-2-268 22-373"/>
        <path className="petal" d="M615 342c-64-30-65-100-13-130 62 18 91 79 13 130Z"/>
        <path className="petal-line" d="M614 337c21-43 19-78-8-120"/>
        <path className="pistil" d="M614 308c6-31 4-52-5-69"/>
      </g>
      <g className="tulip">
        <path className="stem" d="M407 688c15-135 5-228-17-316"/>
        <path className="leaf" d="M410 562c55-48 61-94 53-126-47 31-70 72-53 126Z"/>
        <path className="tulip-head" d="M389 374c-53-28-56-87-30-127 22 28 36 40 53 0 36 41 31 101-23 127Z"/>
        <path className="petal-line" d="M389 366c-7-55-2-82 22-116M389 366c5-54-6-84-29-115"/>
      </g>

      <g className="grapes">
        {[ [356,558],[390,570],[425,567],[340,592],[376,604],[413,602],[358,634],[396,637],[374,672] ].map(([cx, cy], index) => <circle key={index} cx={cx} cy={cy} r={index % 3 === 0 ? 20 : 23}/>) }
        <path className="grape-vine" d="M390 548c-7-45 22-62 50-69 1 29-16 53-50 69Zm-2 2c-14-34-8-55 9-75"/>
      </g>
      <g className="chocolate">
        <rect x="76" y="595" width="82" height="82"/>
        <path d="M117 595v82M76 636h82"/>
        <rect x="132" y="652" width="62" height="62" transform="rotate(12 163 683)"/>
        <path d="m138 678 60 13M168 657l-13 60"/>
      </g>
      <text className="poster-word" x="68" y="753">RESERVA · PRIVADA</text>
    </svg>
  );
}

export function VineRule({ inverted = false }: { inverted?: boolean }) {
  return (
    <svg className={`vine-rule${inverted ? ' inverted' : ''}`} viewBox="0 0 640 46" aria-hidden="true">
      <path d="M4 24c116 0 160-3 242-3 83 0 155 5 260 3 51-1 86-5 130-17"/>
      <path d="M116 22c-18-22-42-19-55-6 16 14 34 17 55 6Zm99 0c13-23 36-26 53-15-12 17-30 23-53 15Zm265 2c-12-19-31-21-46-12 10 15 26 19 46 12Z"/>
      <circle cx="520" cy="21" r="5"/><circle cx="531" cy="16" r="5"/><circle cx="533" cy="27" r="5"/><circle cx="543" cy="22" r="5"/>
    </svg>
  );
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
