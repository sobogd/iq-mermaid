import mermaid from "mermaid";

// One mermaid instance, configured in one place. Both tabs render through it,
// so a config change (theme, security) can never apply to half the editor.
//
// securityLevel "strict" is mermaid's own default and the right one here: this
// editor invites people to paste diagrams they found elsewhere, and "loose"
// would let such a paste run `click X call someFn()` and inject raw HTML into
// labels — arbitrary script execution on the visitor's own page.
const BASE = {
  startOnLoad: false,
  securityLevel: "strict",
};

let currentTheme = "default";

export function configureMermaid(dark) {
  currentTheme = dark ? "dark" : "default";
  mermaid.initialize({ ...BASE, theme: currentTheme });
}

configureMermaid(false);

/** Render for the screen. Returns the SVG markup. */
export async function renderDiagram(id, source) {
  const { svg } = await mermaid.render(id, source);
  return svg;
}

// Chrome taints a canvas as soon as an SVG containing <foreignObject> is drawn
// onto it, and mermaid draws every label inside one — which made PNG export
// throw `SecurityError: Tainted canvases may not be exported`. Re-rendering
// with htmlLabels off produces plain <text> labels, no foreignObject, and a
// canvas that can actually be exported.
const NO_HTML_LABELS = '%%{init: {"htmlLabels": false, "flowchart": {"htmlLabels": false}, "class": {"htmlLabels": false}} }%%';

export async function renderForExport(id, source) {
  mermaid.initialize({
    ...BASE,
    theme: currentTheme,
    htmlLabels: false,
    flowchart: { htmlLabels: false },
    class: { htmlLabels: false },
  });
  try {
    // Belt and braces: the global config alone is not always enough for the
    // flowchart-v2 renderer, and an init directive is applied per render.
    const { svg } = await mermaid.render(id, `${NO_HTML_LABELS}\n${source}`);
    return svg;
  } finally {
    configureMermaid(currentTheme === "dark");
  }
}

export default mermaid;
