import type { CSSProperties } from 'react';
import { ArchMark, CacaoPodMark, CREAM, FOREST, INK, WedgeMark, WineGlassMark, WINE } from './ReferenceMarks';
import './cover-composition.css';

/**
 * The cover.
 *
 * A middle position between the two passes that missed. Reproducing the client's
 * poster wholesale was rejected — it put every mark above the fold and left the
 * scroll with nothing. Stripping it to bare cream was rejected too: the page lost
 * the artwork's colour entirely.
 *
 * So: the colour fields carry the palette, and the marks appear only at the
 * edges, cropped by the frame. Enough to place the invitation in its own artwork,
 * with the whole shapes still saved for the scroll (src/art/ScrollMark.tsx).
 *
 * Anchors are percentages of the cover, so the same composition works in portrait
 * and landscape; see cover-composition.css for the landscape re-anchoring.
 */
const BAND_X = 78;
const GLASS_X = 66;
const GLASS_W = 26;
const GLASS_SPLIT = (BAND_X - GLASS_X) / GLASS_W;

export function CoverComposition() {
  return (
    <div
      className="cover-composition"
      style={{ '--band-x': `${BAND_X}%` } as CSSProperties}
      aria-hidden="true"
    >
      {/* colour fields */}
      <span className="cover-band" />
      <span className="cover-corner" />
      <span className="cover-texture-wedge" />

      {/* marks, all cropped by an edge — hints of the artwork, not a display of it */}
      <ArchMark className="cover-arch" tone={WINE} />
      <WedgeMark className="cover-wedge" tone={FOREST} flip />
      <CacaoPodMark className="cover-pod" tone={INK} />
      <WineGlassMark
        className="cover-glass"
        tone={INK}
        splitAt={GLASS_SPLIT}
        splitTone={CREAM}
        style={{ left: `${GLASS_X}%`, width: `${GLASS_W}%` }}
      />

      <span className="cover-grain" />
    </div>
  );
}
