import mermaid from "mermaid";
import elkLayouts from "@mermaid-js/layout-elk";

// ELK instead of mermaid's built-in dagre layout. Dagre routes edges as long
// diagonal splines and spreads subgraphs sideways, which turns a diagram of
// this size into spaghetti; ELK routes orthogonally and packs the clusters, so
// a big architecture diagram stays readable. The loader is registered, not
// bundled: mermaid only fetches the ELK chunk when a diagram actually uses it.
mermaid.registerLayoutLoaders(elkLayouts);

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
  layout: "elk",
  elk: {
    // Straight, merged edges rather than one spline per connection.
    mergeEdges: true,
    nodePlacementStrategy: "BRANDES_KOEPF",
  },
  flowchart: {
    // Polylines with square corners. `basis` (the default) is what produced
    // the sweeping diagonal curves.
    curve: "linear",
  },
};

let currentTheme = "neutral";

export function configureMermaid(dark) {
  // `neutral` rather than mermaid's `default`: default paints subgraphs in
  // pale yellow and nodes in lavender, which reads as decoration on a diagram
  // this dense. Neutral is greyscale and lets the colours the author sets
  // actually mean something.
  currentTheme = dark ? "dark" : "neutral";
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
const NO_HTML_LABELS =
  '%%{init: {"htmlLabels": false, "flowchart": {"htmlLabels": false, "curve": "linear"}, "class": {"htmlLabels": false}} }%%';

export async function renderForExport(id, source) {
  mermaid.initialize({
    ...BASE,
    theme: currentTheme,
    htmlLabels: false,
    // Spread BASE.flowchart, don't replace it: overwriting the object dropped
    // the edge-curve setting, so exports came out with different routing from
    // what was on screen.
    flowchart: { ...BASE.flowchart, htmlLabels: false },
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
