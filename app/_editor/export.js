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

export async function copySvg(code) {
  await navigator.clipboard.writeText(await svgMarkup(code));
}

export async function downloadSvg(code) {
  const svg = await svgMarkup(code);
  download(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), "diagram.svg");
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
