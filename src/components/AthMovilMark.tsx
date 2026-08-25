import { useState } from 'react';

/**
 * The ATH Móvil lockup beside the payment number.
 *
 * Renders Evertec's official artwork when it is present at
 * `public/ath-movil.svg` (served as /ath-movil.svg). Until that file exists —
 * or if it ever fails to load — this falls back to a typographic treatment plus
 * the site's own single-stroke glyph.
 *
 * The mark is deliberately NOT redrawn by hand: ATH Móvil is a registered mark
 * and an approximation drawn from memory would be both wrong and theirs.
 * Dropping the official file into public/ is all that is needed to switch over.
 */
export function AthMovilMark() {
  const [official, setOfficial] = useState(true);

  if (official) {
    return (
      <img
        className="ath-mark"
        src={`${import.meta.env.BASE_URL}ath-movil.svg`}
        alt="ATH Móvil"
        onError={() => setOfficial(false)}
        loading="lazy"
        decoding="async"
      />
    );
  }

  return (
    <span className="ath-fallback">
      <svg className="line-icon payment-glyph" viewBox="0 0 64 64" aria-hidden="true">
        <rect x="17" y="5" width="30" height="54" rx="5" />
        <path d="M28 51h8" />
        <circle cx="32" cy="28" r="9" />
        <path d="M32 22v12M29 25h5a2.5 2.5 0 0 1 0 5h-4a2.5 2.5 0 0 0 0 5h5" />
      </svg>
      ATH Móvil
    </span>
  );
}
