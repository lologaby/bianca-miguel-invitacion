/**
 * Traces the client's reference art into vector outlines.
 *
 * The client sent flat PNGs (design-source/client-final/). Pasting those in whole
 * makes the site a screenshot of the reference. This pulls the individual marks
 * out of them — the glass, the cacao pod, the ampersand — so each one can be
 * placed, scaled, recoloured and animated on its own.
 *
 * Run:  node scripts/trace-reference-art.mjs
 * Emits: src/art/traced-marks.ts
 *
 * design-source/ is gitignored, so the generated module is the committed source
 * of truth. Re-run only if the client sends new reference art.
 */
import sharp from 'sharp';
import { writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath, URL as NodeURL } from 'node:url';

const root = (p) => fileURLToPath(new NodeURL(`../${p}`, import.meta.url));
const COVER = root('design-source/client-final/Portada-Background.png');
const WORDMARK = root('design-source/client-final/Untitled-design.png');
const TARGET = root('src/art/traced-marks.ts');

for (const file of [COVER, WORDMARK]) {
  if (!existsSync(file)) {
    console.error(`missing reference art: ${file}\n(design-source/ is gitignored — restore it from the client hand-off before re-running)`);
    process.exit(1);
  }
}

/** Client's approved palette, from Paleta-de-Colores.png. */
const PALETTE = [[0xf6, 0xee, 0xe4], [0x5e, 0x20, 0x23], [0x47, 0x55, 0x48], [0x27, 0x2c, 0x24], [0x0d, 0x0e, 0x0b]];
const CREMA = 0, NEGRO = 4;

// ---------------------------------------------------------------- tracing kit

/** Moore-neighbour boundary trace of every closed contour in a bitmap mask. */
function contours(mask, W, H) {
  const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H && mask[y * W + x] === 1;
  const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  const visited = new Set();
  const found = [];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!inside(x, y)) continue;
      const isEdge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      if (!isEdge || visited.has(y * W + x)) continue;

      const path = [];
      let cx = x, cy = y, dir = 0, steps = 0;
      do {
        path.push([cx, cy]);
        visited.add(cy * W + cx);
        let moved = false;
        for (let k = 0; k < 8; k++) {
          const nd = (dir + 6 + k) % 8;
          const nx = cx + DIRS[nd][0], ny = cy + DIRS[nd][1];
          if (inside(nx, ny)) { cx = nx; cy = ny; dir = nd; moved = true; break; }
        }
        if (!moved) break;
      } while (!(cx === x && cy === y && path.length > 2) && ++steps < 60000);

      if (path.length > 40) found.push(path);
      else path.forEach(([px, py]) => visited.add(py * W + px));
    }
  }
  return found.sort((a, b) => b.length - a.length);
}

/** Ramer-Douglas-Peucker polyline simplification. */
function rdp(points, eps) {
  if (points.length < 3) return points;
  let maxD = 0, idx = 0;
  const [ax, ay] = points[0], [bx, by] = points[points.length - 1];
  const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i];
    const d = Math.abs(dy * px - dx * py + bx * ay - by * ax) / len;
    if (d > maxD) { maxD = d; idx = i; }
  }
  if (maxD <= eps) return [points[0], points[points.length - 1]];
  return [...rdp(points.slice(0, idx + 1), eps).slice(0, -1), ...rdp(points.slice(idx), eps)];
}

/**
 * Polyline -> smooth cubic path. Vertices whose turn exceeds `corner` degrees
 * stay sharp, so the pod's stalk and the glass foot keep their crisp edges while
 * the bowl and the pod's belly read as curves.
 */
function toPath(points, { corner = 62, tension = 0.42 } = {}) {
  const pts = points.slice();
  if (pts.length > 1) {
    const [fx, fy] = pts[0], [lx, ly] = pts[pts.length - 1];
    if (Math.hypot(fx - lx, fy - ly) < 1.5) pts.pop();
  }
  const n = pts.length;
  const r = (v) => Number(v.toFixed(1));
  const angleAt = (i) => {
    const [px, py] = pts[(i - 1 + n) % n], [cx, cy] = pts[i], [nx, ny] = pts[(i + 1) % n];
    const a1 = Math.atan2(cy - py, cx - px), a2 = Math.atan2(ny - cy, nx - cx);
    const d = Math.abs((a2 - a1) * 180 / Math.PI) % 360;
    return d > 180 ? 360 - d : d;
  };
  const isSharp = pts.map((_, i) => angleAt(i) > corner);

  let d = `M${r(pts[0][0])} ${r(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    if (isSharp[i] && isSharp[(i + 1) % n]) { d += `L${r(p2[0])} ${r(p2[1])}`; continue; }
    const t1 = isSharp[i] ? 0 : tension, t2 = isSharp[(i + 1) % n] ? 0 : tension;
    d += `C${r(p1[0] + (p2[0] - p0[0]) * t1 / 3)} ${r(p1[1] + (p2[1] - p0[1]) * t1 / 3)}`
      + ` ${r(p2[0] - (p3[0] - p1[0]) * t2 / 3)} ${r(p2[1] - (p3[1] - p1[1]) * t2 / 3)}`
      + ` ${r(p2[0])} ${r(p2[1])}`;
  }
  return d + 'Z';
}

/** Fit traced contours into a viewBox whose longest side is `scale`. */
function normalise(traced, scale) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const c of traced) for (const [x, y] of c) {
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  const w = x1 - x0, h = y1 - y0, k = scale / Math.max(w, h);
  return {
    contours: traced.map((c) => c.map(([x, y]) => [(x - x0) * k, (y - y0) * k])),
    viewBox: `0 0 ${(w * k).toFixed(1)} ${(h * k).toFixed(1)}`,
  };
}

// ------------------------------------------------- cover art: glass + the pod

const cover = await sharp(COVER).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = cover.info.width, H = cover.info.height, CH = cover.info.channels;

/** Snap every pixel to the nearest palette swatch, flattening the paper grain. */
const cls = new Uint8Array(W * H);
for (let p = 0; p < W * H; p++) {
  const i = p * CH, r = cover.data[i], g = cover.data[i + 1], b = cover.data[i + 2];
  let best = 0, bestD = Infinity;
  for (let k = 0; k < PALETTE.length; k++) {
    const [pr, pg, pb] = PALETTE[k];
    const d = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (d < bestD) { bestD = d; best = k; }
  }
  cls[p] = best;
}

function fill(mask, classIndex, seedX, seedY, [x0, y0, x1, y1]) {
  const stack = [seedY * W + seedX];
  while (stack.length) {
    const p = stack.pop();
    if (mask[p] || cls[p] !== classIndex) continue;
    const x = p % W, y = (p / W) | 0;
    if (x < x0 || x > x1 || y < y0 || y > y1) continue;
    mask[p] = 1;
    stack.push(p - 1, p + 1, p - W, p + W);
  }
  return mask;
}

/** Morphological close, so anti-aliased seams don't split a shape in two. */
function closeMask(mask) {
  const dilated = new Uint8Array(W * H);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const p = y * W + x;
    if (mask[p] || mask[p - 1] || mask[p + 1] || mask[p - W] || mask[p + W]) dilated[p] = 1;
  }
  const eroded = new Uint8Array(W * H);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const p = y * W + x;
    if (dilated[p] && dilated[p - 1] && dilated[p + 1] && dilated[p - W] && dilated[p + W]) eroded[p] = 1;
  }
  return eroded;
}

/** Split a mask into its solid silhouette and the holes punched through it. */
function holesOf(mask, [x0, y0, x1, y1], minArea) {
  const outside = new Uint8Array(W * H);
  const seeds = [];
  for (let x = x0; x <= x1; x++) seeds.push(y0 * W + x, y1 * W + x);
  for (let y = y0; y <= y1; y++) seeds.push(y * W + x0, y * W + x1);
  while (seeds.length) {
    const p = seeds.pop();
    if (outside[p] || mask[p]) continue;
    const x = p % W, y = (p / W) | 0;
    if (x < x0 || x > x1 || y < y0 || y > y1) continue;
    outside[p] = 1;
    seeds.push(p - 1, p + 1, p - W, p + W);
  }

  const solid = new Uint8Array(W * H);
  const holeField = new Uint8Array(W * H);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const p = y * W + x;
    if (mask[p] || !outside[p]) solid[p] = 1;
    if (solid[p] && !mask[p]) holeField[p] = 1;
  }

  const seen = new Uint8Array(W * H);
  const holes = [];
  for (let p = 0; p < W * H; p++) {
    if (!holeField[p] || seen[p]) continue;
    const comp = new Uint8Array(W * H);
    const stack = [p];
    let n = 0;
    while (stack.length) {
      const q = stack.pop();
      if (seen[q] || !holeField[q]) continue;
      seen[q] = 1; comp[q] = 1; n++;
      stack.push(q - 1, q + 1, q - W, q + W);
    }
    if (n >= minArea) holes.push({ mask: comp, area: n });
  }
  return { solid, holes: holes.sort((a, b) => b.area - a.area) };
}

/**
 * The glass.
 *
 * Not traced as one blob. Tracing the union of the black left half and the cream
 * right half produced a Frankenstein: a notch where the bowl met the stem, an
 * asymmetric bowl, and a "foot" that was really a bite out of the disc behind
 * it — the reference's glass has no foot at all, its stem just runs off behind
 * the discs at the bottom.
 *
 * So only the left edge is measured, from the clean black-against-cream boundary,
 * and the silhouette is mirrored about the stem's centre. The stem and a foot are
 * authored: a standalone glass needs a base even though the poster crops one off.
 */
const GLASS_CENTRE_X = 702.5;   // measured: the stem sits at x 693..712
const GLASS_RIM_Y = 725;
const GLASS_NECK_Y = 1150;      // the bowl has become the stem by here
const STEM_HALF = 9.5;

/** Half-width of the bowl at a given row, from the black/cream boundary. */
function bowlHalfWidth(y) {
  for (let x = 500; x <= 743; x++) {
    if (cls[y * W + x] === NEGRO) return GLASS_CENTRE_X - x;
  }
  return null;
}

/*
 * Below the bowl the dark wedge behind the glass starts at x≈503, which the
 * left-edge scan happily reports as a half-width of 199 and which then flies out
 * of the silhouette as a wing. Past the widest row the bowl can only narrow, so
 * anything that widens again is the background, not the glass.
 */
const bowl = [];
let widest = 0;
let past = false;
// the rim's first rows are anti-aliased, so start just below the lip
for (let y = GLASS_RIM_Y + 4; y <= GLASS_NECK_Y; y += 6) {
  const half = bowlHalfWidth(y);
  if (half === null || half <= STEM_HALF) continue;
  if (half >= widest && !past) widest = half;
  else past = true;
  if (past && half > bowl[bowl.length - 1][1]) continue;
  bowl.push([y - GLASS_RIM_Y, half]);
}

/* Proportions of the authored lower half, in the same units as the bowl. */
const BOWL_DEPTH = GLASS_NECK_Y - GLASS_RIM_Y;
const STEM_END = Math.round(BOWL_DEPTH * 1.73);   // stem length, from the poster
const FOOT_TOP = STEM_END;
const FOOT_END = STEM_END + Math.round(BOWL_DEPTH * 0.16);
const FOOT_HALF = Math.round(bowl[0][1] * 0.62);

/*
 * Where the bowl becomes the stem, stop trusting the scan. The last measured
 * rows are only a few pixels wide, so quantisation there turns into barbs either
 * side of the stem once the path is smoothed. Instead, cut the bowl while it is
 * still comfortably wider than the stem and ease the rest of the way with a
 * cosine, which arrives vertical and leaves nothing to overshoot.
 */
const BLEND_FROM = 26;
const bowlBody = bowl.filter(([, half]) => half >= BLEND_FROM);
const [blendY, blendHalf] = bowlBody[bowlBody.length - 1];

const neck = [];
for (let step = 1; step <= 9; step++) {
  const t = step / 9;
  const eased = (1 - Math.cos(t * Math.PI)) / 2;
  neck.push([
    blendY + (BOWL_DEPTH - blendY) * t,
    blendHalf + (STEM_HALF - blendHalf) * eased,
  ]);
}

/* Down the left side, then back up the right — one closed, symmetric outline. */
const leftEdge = [...bowlBody, ...neck].map(([y, half]) => [GLASS_CENTRE_X - half, y]);
leftEdge.push([GLASS_CENTRE_X - STEM_HALF, FOOT_TOP]);
leftEdge.push([GLASS_CENTRE_X - FOOT_HALF, FOOT_END - 6]);
leftEdge.push([GLASS_CENTRE_X - FOOT_HALF, FOOT_END]);

const outline = [
  ...leftEdge,
  ...leftEdge.map(([x, y]) => [2 * GLASS_CENTRE_X - x, y]).reverse(),
];

const glass = normalise([outline], 300);
/* corner: 100 keeps every joint smooth — the bowl has no true corners, and the
   foot's are gentle enough that rounding them reads as blown glass. */
const GLASS_PATH = toPath(glass.contours[0], { corner: 100, tension: 0.38 });
console.log(`glass  viewBox=${glass.viewBox} bowl=${bowlBody.length}+neck${neck.length} chars=${GLASS_PATH.length}`);

/** The pod's stalk runs into the speckled circle at y≈1556 — cut above it. */
const podBox = [40, 1050, 330, 1556];
const podMask = new Uint8Array(W * H);
fill(podMask, NEGRO, 188, 1303, podBox);
const { solid: podSolid, holes: podHoles } = holesOf(closeMask(podMask), podBox, 400);
const pod = normalise(
  [podSolid, ...podHoles.map((h) => h.mask)]
    .map((m) => rdp(contours(m, W, H)[0], 1.0)),
  300,
);
const podStyle = { corner: 74, tension: 0.45 };
const POD_OUTLINE = toPath(pod.contours[0], podStyle);
const POD_RIBS = pod.contours.slice(1).map((c) => toPath(c, podStyle)).join('');
console.log(`pod    viewBox=${pod.viewBox} ribs=${podHoles.length} chars=${POD_OUTLINE.length + POD_RIBS.length}`);

// ------------------------------------------------------ wordmark: the ampersand

/** Upscale first, or the didone hairlines break up under the threshold. */
const mark = await sharp(WORDMARK).flatten({ background: '#ffffff' }).resize({ width: 1800 })
  .greyscale().raw().toBuffer({ resolveWithObject: true });
const MW = mark.info.width, MH = mark.info.height;
const inkMask = new Uint8Array(MW * MH);
for (let p = 0; p < MW * MH; p++) inkMask[p] = mark.data[p] < 128 ? 1 : 0;

/*
 * Catalogue every glyph in the lockup, then pick the three that are wanted:
 * the ampersand (rightmost, spanning both lines), and the initials that open
 * each line — B from BIANCA, M from MIGUEL. Taking the letters from the artwork
 * rather than setting them in one of the site's own faces is the point: the
 * monogram in the header is then the couple's actual lockup, not an imitation.
 */
const seenInk = new Uint8Array(MW * MH);
const glyphs = [];
for (let s0 = 0; s0 < MW * MH; s0++) {
  if (!inkMask[s0] || seenInk[s0]) continue;
  const comp = new Uint8Array(MW * MH);
  const stack = [s0];
  let n = 0, minX = MW, maxX = -1, minY = MH, maxY = -1;
  while (stack.length) {
    const p = stack.pop();
    if (seenInk[p] || !inkMask[p]) continue;
    const x = p % MW, y = (p / MW) | 0;
    seenInk[p] = 1; comp[p] = 1; n++;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (x > 0) stack.push(p - 1);
    if (x < MW - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - MW);
    if (y < MH - 1) stack.push(p + MW);
  }
  if (n > 2000) glyphs.push({ mask: comp, minX, maxX, minY, maxY, midY: (minY + maxY) / 2 });
}

const ampersandMask = glyphs.reduce((best, g) => (g.maxX > best.maxX ? g : best)).mask;

/* The ampersand straddles both lines, so split the rest on the lockup's midline. */
const lockupMid = (Math.min(...glyphs.map((g) => g.minY)) + Math.max(...glyphs.map((g) => g.maxY))) / 2;
const notAmpersand = glyphs.filter((g) => g.mask !== ampersandMask);
const firstOf = (line) => line.reduce((best, g) => (g.minX < best.minX ? g : best)).mask;
const initialB = firstOf(notAmpersand.filter((g) => g.midY < lockupMid));
const initialM = firstOf(notAmpersand.filter((g) => g.midY >= lockupMid));

const traceGlyph = (mask, scale) =>
  normalise(contours(mask, MW, MH).map((c) => rdp(c, 1.1)), scale);

const bGlyph = traceGlyph(initialB, 200);
const mGlyph = traceGlyph(initialM, 200);
const INITIAL_B_PATH = bGlyph.contours.map((c) => toPath(c, { corner: 68, tension: 0.44 })).join('');
const INITIAL_M_PATH = mGlyph.contours.map((c) => toPath(c, { corner: 68, tension: 0.44 })).join('');
console.log(`initials  B ${bGlyph.viewBox}  M ${mGlyph.viewBox}`);

const amp = normalise(contours(ampersandMask, MW, MH).map((c) => rdp(c, 1.1)), 200);
const AMPERSAND_PATH = amp.contours.map((c) => toPath(c, { corner: 68, tension: 0.44 })).join('');
console.log(`amp    viewBox=${amp.viewBox} chars=${AMPERSAND_PATH.length}`);

// ------------------------------------------------------------------- emit

writeFileSync(TARGET, `/**
 * Outlines traced out of the client's reference art by scripts/trace-reference-art.mjs.
 *
 * Committed on purpose: design-source/ is gitignored, so these paths are the
 * repository's copy of the artwork. Every mark carries its own viewBox and is
 * anchored at the origin, so it can be dropped anywhere at any size.
 *
 * Do not hand-edit — re-run the script instead.
 */

/** Wine glass — bowl, stem and foot as one closed silhouette. */
export const GLASS_VIEWBOX = '${glass.viewBox}';
export const GLASS_PATH =
  '${GLASS_PATH}';

/** Cacao pod — outer silhouette. Pair with POD_RIBS under fill-rule="evenodd". */
export const POD_VIEWBOX = '${pod.viewBox}';
export const POD_OUTLINE =
  '${POD_OUTLINE}';

/** Cacao pod — the ${podHoles.length} ribs, punched through the silhouette. */
export const POD_RIBS =
  '${POD_RIBS}';

/** The didone ampersand from the couple's lockup. */
export const AMPERSAND_VIEWBOX = '${amp.viewBox}';
export const AMPERSAND_PATH =
  '${AMPERSAND_PATH}';

/** The couple's initials, cut from the lockup rather than set in another face. */
export const INITIAL_B_VIEWBOX = '${bGlyph.viewBox}';
export const INITIAL_B_PATH =
  '${INITIAL_B_PATH}';

export const INITIAL_M_VIEWBOX = '${mGlyph.viewBox}';
export const INITIAL_M_PATH =
  '${INITIAL_M_PATH}';
`);
console.log(`\nwrote ${TARGET}`);
