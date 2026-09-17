import { renderForExport } from "./mermaid-client";

// Every way out of a diagram, in one place. Both tabs export the same thing —
// the current mermaid source — so this no longer lives inside the code tab and
// the visual tab is no longer a dead end.

let seq = 0;

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Intrinsic size from the SVG's own viewBox — not from however large it
 *  happens to be drawn on screen, which is what the zoom level says. */
function sizeOf(svgMarkup) {
  const vb = svgMarkup.match(/viewBox="([\d.\-+eE]+)\s+([\d.\-+eE]+)\s+([\d.\-+eE]+)\s+([\d.\-+eE]+)"/);
  if (vb) {
    const w = Number(vb[3]);
    const h = Number(vb[4]);
    if (w > 0 && h > 0) return { width: w, height: h };
  }
  const w = Number((svgMarkup.match(/\bwidth="([\d.]+)/) || [])[1]);
  const h = Number((svgMarkup.match(/\bheight="([\d.]+)/) || [])[1]);
  return { width: w > 0 ? w : 800, height: h > 0 ? h : 600 };
}

export function copyMermaid(code) {
  return navigator.clipboard.writeText(code);
}

export function downloadMermaid(code) {
  download(new Blob([code], { type: "text/plain;charset=utf-8" }), "diagram.mmd");
}

export function downloadMarkdown(code) {
  const content = "```mermaid\n" + code + "\n```\n";
  download(new Blob([content], { type: "text/markdown;charset=utf-8" }), "diagram.md");
}

async function svgMarkup(code) {
  return renderForExport("export-" + ++seq, code.trim());
}

// An address typed into a label: only http:// and https://, never a general
// "anything looks like a URL" rule. The export is a page someone opens from
// their own disk, so a scheme that can execute (`javascript:`, `data:`) must
// not be able to travel from a pasted diagram into a live link.
const URL_IN_TEXT = /https?:\/\/[^\s<>"'`]+/g;

// Punctuation that belongs to the sentence rather than to the address, so
// "see https://example.com." links to https://example.com.
const SENTENCE_TAIL = /[.,;:!?]+$/;
const CLOSING_BRACKET = { ")": "(", "]": "[", "}": "{" };

/** An address without the punctuation that merely follows it.
 *
 *  @param {string} url address as it was found in text
 *  @returns {string} the same address, trimmed
 *  Side effects: none. */
function trimUrl(url) {
  let trimmed = url.replace(SENTENCE_TAIL, "");
  // A bracket at the end belongs to the address only if it opens one inside
  // it: the ")" of a Wikipedia link stays, the ")" of "(see https://x.com)"
  // goes.
  while (trimmed.length > 0 && CLOSING_BRACKET[trimmed.at(-1)] && !trimmed.includes(CLOSING_BRACKET[trimmed.at(-1)])) {
    trimmed = trimmed.slice(0, -1);
  }
  return trimmed;
}

/** The five characters d3 escapes when it writes a label. Decoding matters
 *  for the address only: a label arrives as `?a=1&amp;b=2`, and comparing that
 *  against what was typed would stop at the `&`. The visible text is never
 *  rewritten. */
function decodeEntities(text) {
  return text.replace(/&(amp|lt|gt|quot|#39);/g, (_, e) => {
    if (e === "amp") return "&";
    if (e === "lt") return "<";
    if (e === "gt") return ">";
    if (e === "quot") return '"';
    return "'";
  });
}

/** Every label in the exported SVG, plus the `<a>` elements mermaid itself
 *  emits for a `click A href "..."` in the source — the second half exists so
 *  that a label already inside a link is left alone, since `<a>` within `<a>`
 *  is invalid markup that browsers render as a mess. */
const LABEL_TOKEN = /<a\b[^>]*>|<\/a>|<svg:a\b[^>]*>|<\/svg:a>|<text\b[^>]*>[\s\S]*?<\/text>/g;

/** How much of an address has to match before a label is believed to carry it:
 *  "https://" plus a little. Enough that a label can never be linked to an
 *  address it does not actually show. */
const MIN_URL_MATCH = 12;

/** The addresses as they were typed in the diagram source.
 *
 *  The source, and not the rendered label, because the renderer hard-wraps a
 *  label wider than `flowchart.wrappingWidth` (200px by default) — and a long
 *  address is exactly such a label: it comes out cut into pieces across
 *  several `<tspan>`s. Worse, the space at a wrap is dropped, so neighbouring
 *  lines can end up glued to the address ("...?x=1 for" arrived as " for",
 *  but "...?x=1" followed by a word on the next line arrives as "?x=1word").
 *  What someone typed is the only trustworthy spelling of what they meant to
 *  link to; the rendered text is then used just to decide which label to wrap.
 *
 *  @param {string} code mermaid source
 *  @returns {string[]} trimmed addresses, in the order they appear
 *  Side effects: none. */
function sourceUrls(code) {
  return (code.match(URL_IN_TEXT) || []).map(trimUrl);
}

/** The address one label shows, ready to be an href value, or null when the
 *  label shows none.
 *
 *  @param {string} labelText the label's text, tags and entities decoded
 *  @param {string[]} urls addresses found in the source
 *  @returns {string|null} escaped href, or null for a label without an address
 *  Side effects: none. */
function hrefForLabel(labelText, urls) {
  const start = labelText.indexOf("http");
  if (start < 0) return null;
  const tail = labelText.slice(start);
  // The longest shared beginning wins, and a full match beats a longer
  // address that merely starts the same way: a label showing
  // "https://x.dev/api" must not be linked to "https://x.dev/api/v2".
  let best = null;
  for (const url of urls) {
    let shared = 0;
    while (shared < url.length && shared < tail.length && url[shared] === tail[shared]) shared++;
    if (shared < MIN_URL_MATCH) continue;
    const whole = shared === url.length ? 1 : 0;
    if (!best || whole > best.whole || (whole === best.whole && shared > best.shared)) {
      best = { url, whole, shared };
    }
  }
  // Only the first address of a label can win: the wrapper is one element
  // around the whole label, so a second address in it is not a second link.
  const href = best ? best.url : looseUrl(tail);
  return href ? href.replace(/&/g, "&amp;") : null;
}

/** The address at the very start of a label, taken from the label itself, for
 *  the case the source does not carry it verbatim (escaped in the source, or
 *  assembled by the diagram).
 *
 *  Accepted only when the address visibly ends where it ends — a space or the
 *  end of the label follows. Text glued to its tail at a wrap cannot be told
 *  apart from the address, and a link to the wrong address is worse than no
 *  link at all.
 *
 *  @param {string} tail label text, starting at the address
 *  @returns {string} the address, or "" when it cannot be trusted
 *  Side effects: none. */
function looseUrl(tail) {
  const found = tail.match(/^https?:\/\/[^\s<>"'`]+/);
  if (!found) return "";
  const url = trimUrl(found[0]);
  const rest = tail.slice(url.length);
  return rest === "" || /^\s/.test(rest) ? url : "";
}

/** Make every label that shows an http(s) address a real link, by wrapping its
 *  text in an `<a>`. The whole label is wrapped rather than the address alone:
 *  the address may be laid out across several rows of text, and splitting a
 *  row to isolate it would move the words around it. The wrapper itself takes
 *  up no space, so the diagram looks exactly as drawn — the whole block simply
 *  becomes clickable.
 *
 *  Called on the HTML export only: a link inside a PNG cannot exist, and an
 *  SVG file downloaded on its own is expected to be the picture as drawn.
 *
 *  @param {string} svg exported SVG markup
 *  @param {string} code mermaid source the markup was rendered from
 *  @returns {string} the same markup, with labels wrapped where applicable
 *  Side effects: none. */
function linkifyLabels(svg, code) {
  const urls = sourceUrls(code);
  let openLinks = 0;
  return svg.replace(LABEL_TOKEN, (token) => {
    if (token.startsWith("</")) {
      openLinks--;
      return token;
    }
    if (/^<(a|svg:a)[\s>]/.test(token)) {
      openLinks++;
      return token;
    }
    if (openLinks > 0) return token;
    const href = hrefForLabel(decodeEntities(token.replace(/<[^>]*>/g, "")), urls);
    if (!href) return token;
    // rel noopener/noreferrer because the target is whatever someone typed
    // into the diagram, target _blank so the page with the diagram stays put.
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${token}</a>`;
  });
}

/** A one-file HTML page around the diagram. The SVG is inlined rather than
 *  linked, and nothing is loaded from a CDN, so the file opens and prints
 *  offline, stays sharp at any zoom, and needs no mermaid to be viewable.
 *  The only thing in it that can reach the network is a link someone typed
 *  into a label themselves (see linkifyLabels).
 *
 *  No <title> and no lang on <html>: both are copy, and this file only ever
 *  gets the source — a page without a title makes the browser show the file
 *  name in the tab, which is the honest label here. */
function htmlPage(svg) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  html, body { margin: 0; }
  /* Centred, and shrinking to the window instead of overflowing it: the
     diagram's own max-width is in the SVG, so a phone gets a smaller picture
     rather than a horizontal scrollbar. */
  body {
    background: #ffffff;
    box-sizing: border-box;
    display: grid;
    min-height: 100vh;
    padding: 24px;
    place-items: center;
  }
  svg { height: auto; max-width: 100%; }
  /* An address in a diagram looks like any other text — the theme colours it,
     nothing underlines it — so the cursor is the only cue that it is a link.
     No underline on purpose: the shape of the diagram stays the author's. */
  svg a { cursor: pointer; }
</style>
</head>
<body>
${svg}
</body>
</html>
`;
}

export async function copySvg(code) {
  await navigator.clipboard.writeText(await svgMarkup(code));
}

export async function downloadSvg(code) {
  const svg = await svgMarkup(code);
  download(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), "diagram.svg");
}

export async function downloadHtml(code) {
  const svg = await svgMarkup(code);
  download(new Blob([htmlPage(linkifyLabels(svg, code))], { type: "text/html;charset=utf-8" }), "diagram.html");
}

export async function downloadPng(code, scale = 2) {
  const svg = await svgMarkup(code);
  const { width, height } = sizeOf(svg);
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error("svg_load_failed"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    // White, not transparent: a PNG is pasted into slides and documents, and
    // mermaid's dark label text on transparency is unreadable in most of them.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, width, height);
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob_failed"))));
    });
    download(blob, "diagram.png");
  } finally {
    URL.revokeObjectURL(url);
  }
}
