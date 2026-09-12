import { readFile } from 'node:fs/promises';

/** Public sharing artwork, built only from the site's public type and vector marks. */
export async function socialPreviewHtml() {
  const read = (file) => readFile(new URL('../' + file, import.meta.url));
  const [regular, italic, sans, marks] = await Promise.all([
    read('src/assets/fonts/cormorant-garamond-latin-wght-normal.woff2'),
    read('src/assets/fonts/cormorant-garamond-latin-wght-italic.woff2'),
    read('src/assets/fonts/dm-sans-latin-wght-normal.woff2'),
    read('src/art/traced-marks.ts'),
  ]);
  const art = await import('data:text/javascript;base64,' + marks.toString('base64'));
  return `<!doctype html><html lang="es"><meta charset="utf-8"><title>Vista previa · Nuestra Cosecha</title>
  <style>
  @font-face{font-family:Invitation;src:url(data:font/woff2;base64,${regular.toString('base64')});font-weight:300 700}
  @font-face{font-family:Invitation;src:url(data:font/woff2;base64,${italic.toString('base64')});font-weight:300 700;font-style:italic}
  @font-face{font-family:InvitationSans;src:url(data:font/woff2;base64,${sans.toString('base64')});font-weight:100 900}
  *{box-sizing:border-box}html,body{margin:0;width:1200px;height:630px;overflow:hidden;background:#f6eee4;color:#272c24}
  .card{position:relative;width:1200px;height:630px;isolation:isolate}
  .art{position:absolute;inset:0;width:1200px;height:630px;z-index:-1}
  .copy{position:absolute;left:260px;right:260px;top:150px;text-align:center}
  .brand{margin:0 0 45px;font:500 21px/1.3 InvitationSans;letter-spacing:.21em;text-transform:uppercase;color:#5e2023}
  h1{margin:0;font:400 94px/1.04 Invitation;letter-spacing:-.025em;white-space:nowrap}
  h1 span{color:#5e2023;font-style:italic;font-size:80px}
  .note{margin:27px 0 0;font:400 italic 37px/1.2 Invitation}
  .rule{display:flex;align-items:center;gap:17px;width:265px;margin:42px auto 0;color:#5e2023}
  .rule:before,.rule:after{content:"";height:1px;background:currentColor;flex:1;opacity:.55}
  .rule svg{width:6px;height:6px}
  </style><main class="card">
  <svg class="art" viewBox="0 0 1200 630" aria-hidden="true">
    <path d="M0 0H117L203 190H0Z" fill="#e9dfcf" opacity=".58"/>
    <path d="M0 630V568C0 499 195 499 195 568V630Z" fill="#5e2023"/>
    <path d="M173 630H308V465Z" fill="#272c24"/>
    <path d="M1068 0H1200V630H1068Z" fill="#475548"/>
    <svg x="62" y="345" width="85" height="222" viewBox="${art.POD_VIEWBOX}"><path d="${art.POD_OUTLINE + art.POD_RIBS}" fill="#0d0e0b" fill-rule="evenodd"/></svg>
    <svg x="1089" y="155" width="90" height="310" viewBox="${art.GLASS_VIEWBOX}"><path d="${art.GLASS_PATH}" fill="#f6eee4"/></svg>
  </svg>
  <div class="copy"><p class="brand">Nuestra Cosecha</p><h1>Bianca <span>&amp;</span> Miguel</h1><p class="note">Una invitación para ti</p><div class="rule"><svg viewBox="0 0 6 6"><circle cx="3" cy="3" r="3" fill="currentColor"/></svg></div></div>
  </main></html>`;
}
