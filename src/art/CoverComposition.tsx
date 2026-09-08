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

export function CoverComposition() {
  return (
    <div
      className="cover-composition"
      aria-hidden="true"
    >
      <span className="cover-band" />
      <span className="cover-corner" />
      <span className="cover-texture-wedge" />

      {/* Abstract marks may bleed; the cacao pod and the glass remain whole. */}
      <ArchMark className="cover-arch" tone={WINE} />
      <WedgeMark className="cover-wedge" tone={FOREST} flip />
      <CacaoPodMark className="cover-pod" tone={INK} />
      <WineGlassMark
        className="cover-glass"
        tone={CREAM}
      />

      <span className="cover-grain" />
    </div>
  );
}
