export { LineIcon, VineRule, WaxSeal } from './VisualAssetsPolishedComplete';

export function HeroStillLife() {
  return (
    <svg
      className="client-cover-art client-cover-art--minimal"
      viewBox="0 0 640 760"
      role="img"
      aria-label="Composición editorial de dos copas, una hoja, seis uvas y un cuadro de chocolate"
      preserveAspectRatio="xMidYMid meet"
    >
      <path className="client-art-hairline" d="M74 96V516M74 650H566" />

      <g className="client-solid-glass" transform="translate(124 64) scale(.72)">
        <path d="M174 170C178 308 202 398 280 426C358 398 382 308 386 170Z" />
        <path d="M280 426V568" />
        <path d="M204 586C236 576 324 576 356 586C324 596 236 596 204 586Z" />
      </g>

      <g className="client-outline-glass">
        <path d="M174 170C178 308 202 398 280 426C358 398 382 308 386 170" />
        <path d="M174 170C213 161 347 161 386 170C347 180 213 180 174 170Z" />
        <path d="M280 426V568" />
        <path d="M198 586C228 575 332 575 362 586" />
      </g>

      <g className="client-single-leaf">
        <path d="M492 240C421 216 417 143 500 108C557 157 552 213 492 240Z" />
        <path d="M493 232C492 188 497 151 504 115" />
      </g>

      <g className="client-grape-cluster">
        <path d="M495 502C493 482 509 471 528 469" />
        <circle cx="470" cy="518" r="11" />
        <circle cx="495" cy="514" r="11" />
        <circle cx="520" cy="520" r="11" />
        <circle cx="482" cy="541" r="11" />
        <circle cx="508" cy="544" r="11" />
        <circle cx="496" cy="568" r="11" />
      </g>

      <g className="client-chocolate-square">
        <rect x="110" y="545" width="72" height="72" rx="2" />
        <path d="M146 545V617M110 581H182" />
      </g>

      {/* Clean negative space reserved for the client-supplied chocolate-box logo. */}
      <rect className="client-logo-reserve" x="86" y="105" width="78" height="92" />
    </svg>
  );
}
