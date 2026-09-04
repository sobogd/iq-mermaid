import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { renderDiagram } from "./mermaid-client";
import AskModal from "./AskModal.jsx";

const DEFAULT_COLOR = "#ECECFF"; // mermaid default-theme node fill (mainBkg)
const DEFAULT_SHAPE = "rect";

// 1.0 = mermaid's own native SVG pixel size — not "whole diagram fits on
// screen". Large diagrams legitimately need to zoom in past what used to be
// a hard 300% ceiling, and zoomed-out diagrams don't need to fit entirely
// either, so both bounds stay generous instead of tied to viewport size.
const MIN_ZOOM = 0.02;
const MAX_ZOOM = 16;

// 100% means label text this tall on screen; mermaid's own default is 16.
const READABLE_FONT_PX = 12;
const DEFAULT_FONT_PX = 16;

const COLORS = [DEFAULT_COLOR, "#2563eb", "#16a34a", "#dc2626", "#d97706", "#7c3aed", "#0891b2", "#db2777"];

const DEFAULT_DIRECTION = "TD";
const DIRECTIONS = ["TD", "TB", "BT", "LR", "RL"];

// Arrow styles mermaid understands. Stored per edge so a pasted diagram keeps
// its dotted and thick links instead of having every one of them flattened
// into a plain arrow on the first visual edit.
const DEFAULT_LINK = "-->";
const LINKS = ["-->", "---", "-.->", "-.-", "==>", "==="];

// Every classic mermaid flowchart node shape (bracket syntax). No custom
// sizing/CSS needed for any of them — mermaid itself renders the shape, we
// only need the right bracket pair when generating text.
// Shape labels live in the locale dictionary (content/editor/<locale>.json,
// `shapes.<key>`); only the key and its icon are structural.
const SHAPES = [
  { key: "rect", emoji: "⬛" },
  { key: "rounded", emoji: "🔲" },
  { key: "pill", emoji: "💊" },
  { key: "circle", emoji: "⚪" },
  { key: "diamond", emoji: "🔶" },
  { key: "subroutine", emoji: "🟪" },
  { key: "cylinder", emoji: "🛢️" },
  { key: "hexagon", emoji: "⬡" },
  { key: "asymmetric", emoji: "🚩" },
  { key: "parallelogram", emoji: "▱" },
  { key: "parallelogramAlt", emoji: "▰" },
  { key: "trapezoid", emoji: "🔽" },
  { key: "trapezoidAlt", emoji: "🔼" },
  { key: "doubleCircle", emoji: "🎯" },
];

// The diagram a first-time visitor lands on. Its two labels come from the
// locale dictionary, so the starter diagram speaks the page's language.
// Exported: EditorShell needs the exact same starter source (via toMermaid
// below) to seed a brand new document, rather than re-deriving its shape.
export const defaultState = (t) => ({
  direction: DEFAULT_DIRECTION,
  blocks: [
    { id: "b1", label: t.defaults.start, color: DEFAULT_COLOR, shape: DEFAULT_SHAPE, groupId: null },
    { id: "b2", label: t.defaults.action, color: DEFAULT_COLOR, shape: DEFAULT_SHAPE, groupId: null },
  ],
  edges: [{ id: "e1", from: "b1", to: "b2", label: "", link: DEFAULT_LINK }],
  groups: [],
  nextBlock: 3,
  nextEdge: 2,
  nextGroup: 1,
});

// True if `parentId` is `id` itself or a descendant of `id` in the group tree
// — assigning it as a parent would create a cycle.
function isSelfOrDescendant(groups, id, parentId, seen = new Set()) {
  // `seen` guards against a parent cycle in state restored from storage:
  // without it a corrupted file takes the tab down with a stack overflow
  // rather than just rendering oddly.
  if (seen.has(id)) return false;
  seen.add(id);
  const children = groups.filter((g) => g.parentId === id).map((g) => g.id);
  if (children.includes(parentId)) return true;
  return children.some((childId) => isSelfOrDescendant(groups, childId, parentId, seen));
}

// All group ids nested (at any depth) under `id` — used to pull a whole
// area's subtree into a copy without reaching outside it.
function getDescendantGroupIds(groups, id, seen = new Set()) {
  if (seen.has(id)) return [];
  seen.add(id);
  const direct = groups.filter((g) => g.parentId === id && !seen.has(g.id)).map((g) => g.id);
  return direct.concat(direct.flatMap((childId) => getDescendantGroupIds(groups, childId, seen)));
}

// Removing a group promotes its nested child groups to its own parent (the
// grandparent), rather than orphaning them or deleting the whole subtree.
function removeGroup(s, groupId) {
  const removed = s.groups.find((g) => g.id === groupId);
  const grandparentId = removed ? removed.parentId : null;
  return {
    ...s,
    groups: s.groups
      .filter((g) => g.id !== groupId)
      .map((g) => (g.parentId === groupId ? { ...g, parentId: grandparentId } : g)),
    blocks: s.blocks.map((b) => (b.groupId === groupId ? { ...b, groupId: null } : b)),
  };
}

// Single source of truth for every shape's mermaid bracket pair, in
// match-priority order (most specific/longest delimiters first, so e.g.
// "((" for circle is tried before "(" for rounded on the same text).
const SHAPE_DELIMS = [
  { key: "doubleCircle", open: "(((", close: ")))" },
  { key: "circle", open: "((", close: "))" },
  { key: "pill", open: "([", close: "])" },
  { key: "subroutine", open: "[[", close: "]]" },
  { key: "cylinder", open: "[(", close: ")]" },
  { key: "hexagon", open: "{{", close: "}}" },
  { key: "parallelogram", open: "[/", close: "/]" },
  { key: "trapezoid", open: "[/", close: "\\]" },
  { key: "parallelogramAlt", open: "[\\", close: "\\]" },
  { key: "trapezoidAlt", open: "[\\", close: "/]" },
  { key: "asymmetric", open: ">", close: "]" },
  { key: "diamond", open: "{", close: "}" },
  { key: "rounded", open: "(", close: ")" },
  { key: "rect", open: "[", close: "]" },
];

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Plain quoted labels, not mermaid "markdown strings" (`["`text`"]`). The
// editor never generates bold or italic inside a label, and markdown strings
// force mermaid to lay the label out in a <foreignObject> — which is what
// taints the export canvas and made PNG download impossible.
const MERMAID_BRACKETS = Object.fromEntries(
  SHAPE_DELIMS.map(({ key, open, close }) => [key, (t) => `${open}"${t}"${close}`])
);

function sanitizeLabel(text) {
  return text.replace(/"/g, "'").replace(/`/g, "'");
}

// Edge labels sit between two pipes (`A -->|text| B`), so a pipe inside one
// ends the label early and the whole diagram stops parsing — which used to
// blank the canvas with no explanation. Quoting the label makes mermaid read
// it literally; the broken-bar substitution is the last resort for a pipe,
// which even quoting does not always survive.
function sanitizeEdgeLabel(text) {
  return sanitizeLabel(text).replace(/\|/g, "\u00a6").replace(/[\r\n]+/g, " ");
}

function buildLabel(block) {
  return sanitizeLabel(block.label);
}

const EMPTY_GROUP_PLACEHOLDER_PREFIX = "phEmpty";

// Exported for the same reason as defaultState above.
export function toMermaid(state) {
  const byId = Object.fromEntries(state.blocks.map((b) => [b.id, b]));
  const groups = state.groups || [];

  const lines = [`flowchart ${DIRECTIONS.includes(state.direction) ? state.direction : DEFAULT_DIRECTION}`];

  const nodeLine = (b) => {
    const wrap = MERMAID_BRACKETS[b.shape] || MERMAID_BRACKETS.rect;
    return `${b.id}${wrap(buildLabel(b))}`;
  };

  const emitGroup = (grp, depth) => {
    const indent = "    ".repeat(depth + 1);
    lines.push(`${indent}subgraph ${grp.id}["${sanitizeLabel(grp.label)}"]`);
    const members = state.blocks.filter((b) => b.groupId === grp.id);
    for (const b of members) lines.push(`${indent}    ${nodeLine(b)}`);
    const children = groups.filter((g) => g.parentId === grp.id);
    for (const child of children) emitGroup(child, depth + 1);
    if (!members.length && !children.length) {
      // mermaid silently drops a subgraph with zero members from the
      // rendered SVG — an invisible placeholder keeps it clickable so an
      // empty group can still be selected/deleted or used as a drop target.
      lines.push(`${indent}    ${EMPTY_GROUP_PLACEHOLDER_PREFIX}${grp.id}[" "]`);
      lines.push(`${indent}    style ${EMPTY_GROUP_PLACEHOLDER_PREFIX}${grp.id} fill:none,stroke:none`);
    }
    lines.push(`${indent}end`);
  };
  for (const grp of groups.filter((g) => !g.parentId)) emitGroup(grp, 0);

  for (const b of state.blocks) {
    if (!b.groupId) lines.push(`    ${nodeLine(b)}`);
  }
  for (const e of state.edges) {
    if (!byId[e.from] || !byId[e.to]) continue;
    const link = LINKS.includes(e.link) ? e.link : DEFAULT_LINK;
    lines.push(
      e.label
        ? `    ${e.from} ${link}|"${sanitizeEdgeLabel(e.label)}"| ${e.to}`
        : `    ${e.from} ${link} ${e.to}`,
    );
  }
  for (const b of state.blocks) {
    if (b.color && b.color !== DEFAULT_COLOR) {
      lines.push(`    style ${b.id} fill:${b.color},stroke:#333,color:#fff`);
    }
  }
  for (const g of groups) {
    if (g.color) lines.push(`    style ${g.id} fill:${g.color}22,stroke:${g.color}`);
  }
  return lines.join("\n");
}

function unwrapLabel(raw) {
  let s = raw.trim();
  for (let i = 0; i < 4; i++) {
    if (s.length >= 2 && s[0] === '"' && s[s.length - 1] === '"') { s = s.slice(1, -1); continue; }
    if (s.length >= 2 && s[0] === "`" && s[s.length - 1] === "`") { s = s.slice(1, -1); continue; }
    break;
  }
  return s.trim();
}

const NODE_SHAPES = SHAPE_DELIMS.map((s) => s.key);
const NODE_RE = new RegExp(
  "([A-Za-z][A-Za-z0-9_]*)\\s*(?:" +
    SHAPE_DELIMS.map(({ open, close }) => `${escapeRegex(open)}(.*?)${escapeRegex(close)}`).join("|") +
    ")",
  "g"
);
const EDGE_INLINE_SHAPE = "(?:" + SHAPE_DELIMS.map(({ open, close }) => `${escapeRegex(open)}.*?${escapeRegex(close)}`).join("|") + ")?";
// The connector is captured, not just matched: dotted (`-.->`), thick (`==>`)
// and open (`---`) links used to fall outside this pattern entirely, so every
// such arrow in a pasted diagram was silently dropped on import.
const LINK_PATTERN = "(-\\.-+>|-\\.-+|={2,}>|={3,}|-{2,}>|-{3,})";
const EDGE_RE = new RegExp(
  "([A-Za-z][A-Za-z0-9_]*)" + EDGE_INLINE_SHAPE + "\\s*" + LINK_PATTERN + "\\s*(?:\\|(.*?)\\|\\s*)?([A-Za-z][A-Za-z0-9_]*)",
  "g"
);
const SUBGRAPH_RE = /^subgraph\s+([A-Za-z][A-Za-z0-9_]*)\s*(?:\[(?:"([^"]*)"|([^\]]*))\])?/i;
const STYLE_RE = /^style\s+([A-Za-z][A-Za-z0-9_]*)\s+fill:\s*(#[0-9a-fA-F]{3,8})/i;

// Flowchart-only, best-effort. Every property (label, shape, color, group
// membership) is derivable from the text itself, so unlike positions there is
// nothing to preserve from the previous diagram besides id counters.
// `graph` is mermaid's older spelling of `flowchart` and still the one most
// snippets in the wild use — refusing it meant half the examples people paste
// never reached the canvas.
const HEADER_RE = /^(?:flowchart|graph)\s*(TD|TB|BT|LR|RL)?\b/i;

function parseFlowchart(text, prev) {
  const trimmed = text.trim();
  const header = trimmed.match(HEADER_RE);
  if (!header) return null;
  const direction = (header[1] || DEFAULT_DIRECTION).toUpperCase();

  const lines = trimmed.split("\n").slice(1);

  const blockOrder = [];
  const blockInfo = {};
  const groupOrder = [];
  const groupInfo = {};
  const edgeList = [];
  const styles = {};

  const groupStack = [];
  const currentGroup = () => (groupStack.length ? groupStack[groupStack.length - 1] : null);

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("%%")) continue;

    const sg = line.match(SUBGRAPH_RE);
    if (sg) {
      const id = sg[1];
      const label = unwrapLabel(sg[2] ?? sg[3] ?? id);
      const parentId = currentGroup();
      if (!groupInfo[id]) { groupOrder.push(id); groupInfo[id] = { label, parentId }; }
      else groupInfo[id].label = label;
      groupStack.push(id);
      continue;
    }
    if (/^end$/i.test(line)) { groupStack.pop(); continue; }

    const st = line.match(STYLE_RE);
    if (st) { styles[st[1]] = st[2]; continue; }

    let m;
    NODE_RE.lastIndex = 0;
    while ((m = NODE_RE.exec(line))) {
      const id = m[1];
      if (id.startsWith(EMPTY_GROUP_PLACEHOLDER_PREFIX)) continue;
      const shapeIdx = m.slice(2, 2 + NODE_SHAPES.length).findIndex((v) => v !== undefined);
      if (shapeIdx === -1) continue;
      const label = unwrapLabel(m[2 + shapeIdx]);
      const shape = NODE_SHAPES[shapeIdx];
      if (!blockInfo[id]) blockOrder.push(id);
      blockInfo[id] = { label, shape, groupId: currentGroup() };
    }

    EDGE_RE.lastIndex = 0;
    while ((m = EDGE_RE.exec(line))) {
      const link = LINKS.includes(m[2]) ? m[2] : DEFAULT_LINK;
      edgeList.push({ from: m[1], link, label: unwrapLabel(m[3] || ""), to: m[4] });
      if (!blockInfo[m[1]] && !blockOrder.includes(m[1])) blockOrder.push(m[1]);
      if (!blockInfo[m[4]] && !blockOrder.includes(m[4])) blockOrder.push(m[4]);
    }
  }

  if (!blockOrder.length && !groupOrder.length) return null;

  const groupIds = new Set(groupOrder);
  const groups = groupOrder.map((id) => {
    const raw = styles[id];
    const color = raw ? (raw.length === 9 ? raw.slice(0, 7) : raw) : null;
    const parentId = groupInfo[id].parentId;
    return { id, label: groupInfo[id].label, color, parentId: parentId && groupIds.has(parentId) ? parentId : null };
  });

  const blocks = blockOrder.map((id) => {
    const info = blockInfo[id] || { label: id, shape: DEFAULT_SHAPE, groupId: null };
    const raw = styles[id];
    const color = raw ? (raw.length === 9 ? raw.slice(0, 7) : raw) : DEFAULT_COLOR;
    return {
      id,
      label: info.label,
      shape: info.shape,
      color,
      groupId: info.groupId && groupIds.has(info.groupId) ? info.groupId : null,
    };
  });

  const edges = edgeList.map((e, i) => ({
    id: "e" + (i + 1),
    from: e.from,
    to: e.to,
    label: e.label,
    link: e.link,
  }));

  const maxSuffix = (ids, prefix) =>
    ids.reduce((max, id) => {
      const mm = id.match(new RegExp("^" + prefix + "(\\d+)$"));
      return mm ? Math.max(max, Number(mm[1]) + 1) : max;
    }, 1);

  return {
    direction,
    blocks,
    edges,
    groups,
    nextBlock: Math.max(prev.nextBlock, maxSuffix(blockOrder, "b")),
    nextGroup: Math.max(prev.nextGroup, maxSuffix(groupOrder, "g")),
    nextEdge: edges.length + 1,
  };
}

// Regular nodes get a DOM id shaped like "...-flowchart-<ourId>-<counter>"
// (MERMAID_DOM_ID_PREFIX in mermaid's flowchart DB) — extractable without
// knowing the diagram-id prefix mermaid adds in front. Clusters (subgraphs)
// don't go through that path at all: their id is simply "<diagramId>-<ourId>"
// verbatim, no "flowchart-" marker and no counter suffix — so they need the
// current diagramId to strip off. Confirmed against a real render, not
// guessed from source alone.
function extractOurId(el, diagramId) {
  if (!el.id) return null;
  const m = el.id.match(/flowchart-(.+)-\d+$/);
  // The invisible node that keeps an empty subgraph rendered is not something
  // anyone can mean to click: it has no entry in `blocks`, so selecting it
  // used to arm the toolbar for a block that does not exist.
  if (m) return m[1].startsWith(EMPTY_GROUP_PLACEHOLDER_PREFIX) ? null : m[1];
  if (diagramId && el.id.startsWith(diagramId + "-")) return el.id.slice(diagramId.length + 1);
  return null;
}

function findDiagramElement(svgRoot, diagramId, ourId) {
  if (!svgRoot) return null;
  for (const el of svgRoot.querySelectorAll(".node, .cluster")) {
    if (extractOurId(el, diagramId) === ourId) return el;
  }
  return null;
}

// Edge paths carry an id shaped like "...-L_<from>_<to>_<counter>". The
// counter mermaid assigns to parallel edges is an implementation detail that
// has already changed shape once (it goes 0, 2, 3… — 1 is never used), so
// matching it arithmetically made edge selection quietly depend on a mermaid
// version. Instead: take every path belonging to this (from,to) pair in
// document order and pick the nth, where n is this edge's position among the
// parallel edges of the same pair. Order is what mermaid actually guarantees.
function findEdgeElement(svgRoot, state, edgeId) {
  const edge = state.edges.find((e) => e.id === edgeId);
  if (!svgRoot || !edge) return null;
  let n = 0;
  for (const e of state.edges) {
    if (e.id === edgeId) break;
    if (e.from === edge.from && e.to === edge.to) n++;
  }
  const needle = `L_${edge.from}_${edge.to}_`;
  const candidates = [...svgRoot.querySelectorAll("path[id]")].filter(
    (el) => el.id.includes(needle) && !el.classList.contains("edge-hit-overlay"),
  );
  return candidates[n] ?? candidates[0] ?? null;
}

// Walks up from a raw DOM event target to the nearest interactive diagram
// element (node, cluster or edge path), resolving it back to our own id.
function resolveTarget(el, svgRoot, diagramId) {
  let cur = el;
  while (cur && cur !== svgRoot) {
    if (cur.dataset && cur.dataset.edgeId) return { kind: "edge", id: cur.dataset.edgeId, el: cur };
    if (cur.classList && (cur.classList.contains("node") || cur.classList.contains("cluster"))) {
      const ourId = extractOurId(cur, diagramId);
      if (ourId) return { kind: cur.classList.contains("cluster") ? "group" : "block", id: ourId, el: cur };
    }
    cur = cur.parentNode;
  }
  return null;
}

export default function VisualEditor({
  active,
  actionsSlot,
  zoomSlot,
  onCodeChange,
  importText,
  importSeq,
  themeSeq,
  recenterSeq,
  codeOnly,
  t,
}) {
  // Lazy initializer: parse the incoming document once on mount, so the canvas
  // starts on the real diagram with no placeholder flash. Non-flowchart sources
  // (sequence, class, …) parse to null and fall back to the starter diagram,
  // which the code-only notice overlays anyway.
  const [state, setState] = useState(() => parseFlowchart(importText, defaultState(t)) || defaultState(t));
  const [selected, setSelected] = useState(null); // { type, id }
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 }); // pan (screen px) + zoom
  const [isPanning, setIsPanning] = useState(false);
  const [rendered, setRendered] = useState({ html: "", diagramId: "" });
  // Screen position of the floating toolbar that hangs over the selection.
  const [toolbar, setToolbar] = useState(null); // { x, y, below }
  // Where to offer "add a block / add an area", after a click on bare canvas.
  const [addAt, setAddAt] = useState(null); // { x, y }
  // Mermaid's own label font size in CSS px at zoom 1 — read back from the
  // render rather than assumed, since a theme can change it.
  const [baseFont, setBaseFont] = useState(DEFAULT_FONT_PX);
  const wrapRef = useRef(null); // outer viewport, fixed size, clips content
  const hostRef = useRef(null); // holds the injected mermaid SVG, transformed by pan/zoom
  const viewRef = useRef(view);
  const stateRef = useRef(state);
  const selectedRef = useRef(null);
  const addAtRef = useRef(null);
  const panRef = useRef(null); // { startX, startY, startViewX, startViewY, moved, target }
  const pendingTargetRef = useRef(null); // resolved target from the last mousedown, read once at pan-arm time
  const [clipboard, setClipboard] = useState(null); // { type, rootId, blocks, groups, edges }
  // Starts at the current importSeq so the initializer above (which already
  // parsed `importText`) is not parsed a second time by the import effect.
  const lastImportSeqRef = useRef(importSeq);
  // Starts true: the state the initializer produced already reflects the
  // incoming document, so the very first `state` effect must not echo it back
  // up as a code change (that echo is what used to overwrite the opened
  // document with stale localStorage content).
  const importAppliedRef = useRef(true);
  const renderSeqRef = useRef(0);
  const hasCenteredRef = useRef(false);
  const recenterSeqRef = useRef(recenterSeq);
  // Pending view fit: null = none, "all" = whole diagram, or an array of node
  // ids to centre/fit on. Set by an operation (connect/move/add) or by the
  // shell's recenterSeq; consumed once the freshly rendered SVG is on screen.
  const fitTargetRef = useRef(null);
  const stageRef = useRef(null);
  const [interactionMode, setInteractionMode] = useState(null); // { type: 'connect'|'move', id, kind }
  const [colorModalOpen, setColorModalOpen] = useState(false);
  const [shapeModalOpen, setShapeModalOpen] = useState(false);
  // Whatever mermaid last refused to render. The canvas keeps showing the last
  // diagram that worked instead of going blank, which is what a single stray
  // character in a label used to do.
  const [renderError, setRenderError] = useState(null);
  // Text prompt / confirmation rendered in the app's own modal, replacing
  // window.prompt and window.confirm — those cannot be styled, cannot be
  // translated consistently and are suppressed outright by some browsers.
  const [ask, setAsk] = useState(null); // { kind: "text"|"confirm", title, value?, onDone }
  const [history, setHistory] = useState({ past: [], future: [] });
  const interactionModeRef = useRef(null);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    addAtRef.current = addAt;
  }, [addAt]);

  // It is anchored to a point on the canvas, so it stops meaning anything as
  // soon as the canvas moves under it or the attention goes somewhere else.
  useEffect(() => {
    if (ask || colorModalOpen || shapeModalOpen || interactionMode) setAddAt(null);
  }, [ask, colorModalOpen, shapeModalOpen, interactionMode]);

  useEffect(() => {
    setAddAt(null);
  }, [view]);

  useEffect(() => {
    interactionModeRef.current = interactionMode;
  }, [interactionMode]);

  useEffect(() => {
    setColorModalOpen(false);
    setShapeModalOpen(false);
  }, [selected]);

  useEffect(() => {
    // A state change caused by an incoming text edit (see below) must not echo
    // a regenerated/reformatted string back into the text editor mid-typing.
    if (importAppliedRef.current) {
      importAppliedRef.current = false;
      return;
    }
    if (onCodeChange) onCodeChange(toMermaid(state));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  useEffect(() => {
    if (importSeq == null || importSeq === lastImportSeqRef.current) return;
    lastImportSeqRef.current = importSeq;
    // Wrapped the same as every visual edit: even though this fires from
    // typing in the Text tab (Visual may not even be mounted-visible at that
    // moment), the view must still be anchored — otherwise switching back to
    // Visual after a text edit shows the diagram having silently jumped.
    updateState((prev) => {
      const parsed = parseFlowchart(importText, prev);
      if (parsed) importAppliedRef.current = true;
      return parsed || prev;
    });
  }, [importSeq, importText]);

  // Render the real mermaid SVG — same engine, same output as the text
  // preview, so the visual canvas is never a re-implementation that can drift.
  useEffect(() => {
    let cancelled = false;
    const text = toMermaid(state);
    const id = "visual-mermaid-" + (++renderSeqRef.current);
    renderDiagram(id, text).then((svg) => {
      if (cancelled) return;
      setRendered({ html: svg, diagramId: id });
      setRenderError(null);
    }).catch((err) => {
      // Do NOT clear `rendered`: wiping the canvas on a parse error looks
      // exactly like losing the whole diagram, and the state behind it is
      // still perfectly good.
      if (!cancelled) setRenderError(String(err?.message || err).split("\n")[0]);
    });
    return () => { cancelled = true; };
    // themeSeq: the shell flips mermaid between its light and dark theme when
    // the OS colour scheme changes, and the diagram has to be drawn again for
    // that to show.
  }, [state, themeSeq]);

  // The rendered SVG is written imperatively rather than through
  // `dangerouslySetInnerHTML`. React 19 re-applies that prop on every commit
  // that updates this element — panning alone changes its `style`, so React
  // reparsed the markup and swapped in a fresh <svg> behind our backs, taking
  // the mousedown/dblclick listeners wired below with it. Selection, renaming
  // and every armed mode silently stopped working after the first pan.
  //
  // A layout effect, not a passive one: the effects below measure and decorate
  // this SVG, and they must run against the element that is actually on screen.
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // Where the drawing starts on screen right now. Mermaid re-lays out the
    // WHOLE diagram on every edit, so without this the picture slides under a
    // perfectly stationary viewport — delete a node near the top and everything
    // below it jumps up. Pinning the top-left corner of the drawing to the same
    // screen point makes the diagram grow and shrink towards the bottom right
    // instead, and leaves the reader's own pan and zoom untouched.
    const previous = host.querySelector("svg") ? contentRect(host.querySelector("svg")) : null;

    host.innerHTML = rendered.html;
    const svgEl = host.querySelector("svg");
    if (!svgEl) return;
    // Mermaid ships the SVG with width="100%" and a max-width style, meant for
    // a normal flow container. `.mermaid-host` is absolutely positioned, so a
    // percentage width has nothing to resolve against and the browser squeezed
    // the drawing into a couple of hundred pixels — a 2650-unit diagram was
    // being drawn at 298 px, i.e. 11% of its size, with labels under 2 px tall.
    // Pinning the intrinsic size makes one user unit exactly one CSS pixel at
    // zoom 1, which is what every measurement here assumes.
    const vb = svgEl.viewBox && svgEl.viewBox.baseVal;
    if (vb && vb.width && vb.height) {
      svgEl.setAttribute("width", String(vb.width));
      svgEl.setAttribute("height", String(vb.height));
    }
    svgEl.style.maxWidth = "none";

    // A pending fit (fitTargetRef) replaces the pin: the fit below will place
    // the view deliberately, so nudging it first would read as a twitch.
    if (previous && fitTargetRef.current == null) {
      const next = contentRect(svgEl);
      if (next) {
        const dx = previous.left - next.left;
        const dy = previous.top - next.top;
        if (dx || dy) setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
      }
    }
  }, [rendered.html]);

  // The view (pan + zoom) is the reader's, not ours. There used to be an
  // "anchor" here that measured the selected element before an edit and nudged
  // the view afterwards to cancel out mermaid's relayout — but mermaid relays
  // out the whole diagram on every change, so the correction itself is what
  // read as the canvas twitching after a paste, a copy or a rename. Nothing
  // moves the view now except the reader and the two explicit buttons.
  const HISTORY_LIMIT = 50;

  function updateState(updater) {
    setState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      // A no-op update (an armed mode resolved against an invalid target, say)
      // must not push an undo step, or Ctrl+Z starts doing nothing visible.
      if (next !== prev) {
        setHistory((h) => ({ past: [...h.past, prev].slice(-HISTORY_LIMIT), future: [] }));
      }
      return next;
    });
  }

  function undo() {
    setHistory((h) => {
      if (!h.past.length) return h;
      const prev = h.past[h.past.length - 1];
      setState((current) => {
        setSelected(null);
        return prev === current ? current : prev;
      });
      return { past: h.past.slice(0, -1), future: [stateRef.current, ...h.future].slice(0, HISTORY_LIMIT) };
    });
  }

  function redo() {
    setHistory((h) => {
      if (!h.future.length) return h;
      const next = h.future[0];
      setState(() => {
        setSelected(null);
        return next;
      });
      return { past: [...h.past, stateRef.current].slice(-HISTORY_LIMIT), future: h.future.slice(1) };
    });
  }

  // What "100%" means here: label text on screen at READABLE_FONT_PX. Mermaid
  // draws labels at its own font size (16 by default) at zoom 1, so the zoom
  // that counts as 100% is READABLE_FONT_PX / that size. Reporting mermaid's
  // native pixel size as 100% instead told the reader nothing — the number they
  // care about is how big the text is.
  const zoom100 = READABLE_FONT_PX / baseFont;

  /** Screen rectangle of what is actually drawn. Deliberately not the SVG's
   *  viewBox: mermaid pads it well past the content (on the ELK renderer by
   *  several hundred units), so fitting to it shrank the diagram far more than
   *  needed and parked it off-centre. getBBox is the union of the real
   *  geometry, and the screen CTM folds in both the viewBox scale and our own
   *  pan/zoom transform, so no coordinate system has to be guessed at. */
  function contentRect(svgEl) {
    try {
      const bb = svgEl.getBBox();
      const ctm = svgEl.getScreenCTM();
      if (!ctm || !bb.width || !bb.height) return null;
      const a = new DOMPoint(bb.x, bb.y).matrixTransform(ctm);
      const b = new DOMPoint(bb.x + bb.width, bb.y + bb.height).matrixTransform(ctm);
      const width = b.x - a.x;
      const height = b.y - a.y;
      if (width <= 0 || height <= 0) return null;
      return { left: a.x, top: a.y, width, height };
    } catch {
      return null;
    }
  }

  /** Fit the viewport to a screen-space rectangle, centred with padding. Never
   *  magnifies past 100%: a single node would otherwise fill the screen with
   *  text the size of a headline. `rect` is { left, top, width, height } in
   *  viewport pixels. */
  function fitRect(rect) {
    const wrap = wrapRef.current;
    const wr = wrap ? wrap.getBoundingClientRect() : null;
    if (!wr || !rect || !wr.width || !wr.height || !(rect.width > 0) || !(rect.height > 0)) return false;

    const pad = 48;
    const v = viewRef.current;
    // Everything is measured at the CURRENT zoom, so the fit is a relative
    // correction to it rather than an absolute scale we have to derive.
    const k = Math.min((wr.width - pad) / rect.width, (wr.height - pad) / rect.height);
    const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min(v.zoom * k, zoom100)));

    // Centre of the rect expressed in the untransformed host coordinates, so it
    // can be re-placed at the middle of the viewport at the new zoom.
    const localCx = (rect.left + rect.width / 2 - wr.left - v.x) / v.zoom;
    const localCy = (rect.top + rect.height / 2 - wr.top - v.y) / v.zoom;
    setView({ zoom, x: wr.width / 2 - localCx * zoom, y: wr.height / 2 - localCy * zoom });
    return true;
  }

  /** Whole diagram inside the visible area, centred. Fitting means "nothing is
   *  cut off", not "fill every pixel". */
  function fitView() {
    const svgEl = hostRef.current && hostRef.current.querySelector("svg");
    if (!svgEl) return false;
    const content = contentRect(svgEl);
    return content ? fitRect(content) : false;
  }

  /** Fit the viewport to the union bounding box of the given node/group ids.
   *  Used after connect/move/add to bring the objects involved into view. */
  function fitToElements(ids) {
    const svgEl = hostRef.current && hostRef.current.querySelector("svg");
    if (!svgEl) return false;
    let rect = null;
    for (const id of ids) {
      const el = findDiagramElement(svgEl, rendered.diagramId, id);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 && r.height <= 0) continue;
      rect = rect
        ? {
            left: Math.min(rect.left, r.left),
            top: Math.min(rect.top, r.top),
            right: Math.max(rect.right, r.right),
            bottom: Math.max(rect.bottom, r.bottom),
          }
        : { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    }
    if (!rect) return false;
    return fitRect({ left: rect.left, top: rect.top, width: rect.right - rect.left, height: rect.bottom - rect.top });
  }

  /** Remember which element(s) the next fit should centre on. */
  function focusOn(ids) {
    fitTargetRef.current = Array.isArray(ids) ? ids : [ids];
  }

  // Measure the label font of whatever mermaid just drew, so "100%" means the
  // same thing whichever theme is active.
  useEffect(() => {
    const svgEl = hostRef.current && hostRef.current.querySelector("svg");
    if (!svgEl) return;
    const label = svgEl.querySelector(".nodeLabel, .cluster-label, text");
    const size = label ? parseFloat(getComputedStyle(label).fontSize) : NaN;
    if (Number.isFinite(size) && size > 0) setBaseFont(size);
  }, [rendered.html]);

  // The shell bumps `recenterSeq` after a manual code edit (typing in the code
  // sheet). This only SETS a flag; the actual fit happens in the effect below
  // once the freshly rendered SVG is on screen.
  useEffect(() => {
    if (recenterSeq === recenterSeqRef.current) return;
    recenterSeqRef.current = recenterSeq;
    fitTargetRef.current = "all";
  }, [recenterSeq]);

  useEffect(() => {
    // Fit on the first diagram — the reader should open the editor looking at
    // the whole thing — and again whenever a pending fit was requested: a
    // manual code edit (whole diagram) or a connect/move/add (the 1-2 elements
    // involved). Everything else keeps the reader's pan/zoom untouched.
    //
    // The first-fit flag is set from inside the callback rather than before it:
    // the first diagram renders twice in a row at start-up (the shell picks
    // mermaid's light or dark theme right after mount), and marking the fit as
    // done up front meant the cancelled first attempt was the only one there
    // ever was.
    if (!rendered.html) return;
    const target = fitTargetRef.current;
    if (target == null && hasCenteredRef.current) return;
    fitTargetRef.current = null;
    const raf = requestAnimationFrame(() => {
      const done = Array.isArray(target) ? fitToElements(target) : fitView();
      if (done) hasCenteredRef.current = true;
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rendered.html]);

  // Trackpad and wheel: two fingers pan, pinch (which the browser reports as a
  // ctrl-wheel) zooms about the pointer. Registered natively because it has to
  // be non-passive to preventDefault the page scroll.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    function onWheel(e) {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
      if (e.ctrlKey || e.metaKey) {
        setView((v) => {
          const factor = Math.exp(-e.deltaY * 0.01);
          const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.zoom * factor));
          const wx = (sx - v.x) / v.zoom, wy = (sy - v.y) / v.zoom;
          return { zoom, x: sx - wx * zoom, y: sy - wy * zoom };
        });
      } else {
        setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
      }
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function zoomBy(factor) {
    const wrap = wrapRef.current;
    const w = wrap ? wrap.clientWidth : 0, h = wrap ? wrap.clientHeight : 0;
    setView((v) => {
      const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.zoom * factor));
      const wx = (w / 2 - v.x) / v.zoom, wy = (h / 2 - v.y) / v.zoom;
      return { zoom, x: w / 2 - wx * zoom, y: h / 2 - wy * zoom };
    });
  }

  function getById(id) {
    return state.blocks.find((b) => b.id === id);
  }

  // Resolves a click made while a connect/move mode is armed: picks the
  // target (another block, a group, or empty background) and applies it.
  function resolveModeClick(mode, target) {
    if (mode.type === "connect") {
      if (target && target.kind === "block" && target.id !== mode.id) {
        updateState((s) => ({
          ...s,
          edges: [...s.edges, { id: "e" + s.nextEdge, from: mode.id, to: target.id, label: "" }],
          nextEdge: s.nextEdge + 1,
        }));
        focusOn([mode.id, target.id]);
      }
      setInteractionMode(null);
      setSelected(null);
      return;
    }
    if (mode.type === "paste") {
      // Valid drop targets: a group (paste inside it) or empty background
      // (paste at the top level). Anything else (e.g. clicking a block) just
      // cancels without pasting, same as an invalid move target.
      if (!target || target.kind === "group") {
        pasteClipboard(mode.clip, target ? target.id : null);
      }
      setInteractionMode(null);
      setSelected(null);
      return;
    }
    // mode.type === "move": target group -> join/nest; empty background -> ungroup/un-nest.
    if (target && target.kind === "group") {
      const groupId = target.id;
      if (mode.kind === "block") {
        const b = stateRef.current.blocks.find((bb) => bb.id === mode.id);
        if (b && (b.groupId || null) !== groupId) {
          updateState((s) => ({ ...s, blocks: s.blocks.map((bb) => (bb.id === mode.id ? { ...bb, groupId } : bb)) }));
          focusOn([mode.id, groupId]);
        }
      } else if (
        mode.kind === "group" && groupId !== mode.id &&
        !isSelfOrDescendant(stateRef.current.groups, mode.id, groupId)
      ) {
        const grp = stateRef.current.groups.find((gg) => gg.id === mode.id);
        if (grp && (grp.parentId || null) !== groupId) {
          updateState((s) => ({ ...s, groups: s.groups.map((gg) => (gg.id === mode.id ? { ...gg, parentId: groupId } : gg)) }));
          focusOn([mode.id, groupId]);
        }
      }
    } else if (!target) {
      if (mode.kind === "block") {
        const b = stateRef.current.blocks.find((bb) => bb.id === mode.id);
        if (b && (b.groupId || null) !== null) {
          updateState((s) => ({ ...s, blocks: s.blocks.map((bb) => (bb.id === mode.id ? { ...bb, groupId: null } : bb)) }));
          focusOn([mode.id]);
        }
      } else {
        const grp = stateRef.current.groups.find((gg) => gg.id === mode.id);
        if (grp && (grp.parentId || null) !== null) {
          updateState((s) => ({ ...s, groups: s.groups.map((gg) => (gg.id === mode.id ? { ...gg, parentId: null } : gg)) }));
          focusOn([mode.id]);
        }
      }
    }
    // Clicking a block target while moving anything does nothing (blocks aren't containers).
    setInteractionMode(null);
    setSelected(null);
  }

  // Wire up click/rename directly on the freshly-injected mermaid SVG.
  useEffect(() => {
    const host = hostRef.current;
    const svgEl = host && host.querySelector("svg");
    if (!svgEl) return;
    const diagramId = rendered.diagramId;

    function onMouseDown(e) {
      const target = resolveTarget(e.target, svgEl, diagramId);
      const mode = interactionModeRef.current;
      if (mode) {
        e.stopPropagation();
        resolveModeClick(mode, target);
        return;
      }
      // Don't stop propagation and don't select yet — a mousedown that
      // started on a block/area/edge might still turn into a canvas pan.
      // The wrapper's mousedown (which this bubbles to) arms the pan and
      // decides click-vs-drag on mouseup using this captured target.
      pendingTargetRef.current = target;
    }

    function onDblClick(e) {
      if (interactionModeRef.current) return;
      const target = resolveTarget(e.target, svgEl, diagramId);
      if (!target) return;
      e.stopPropagation();
      if (target.kind === "edge") {
        askRename("edge", target.id);
        return;
      }
      askRename(target.kind, target.id);
    }

    svgEl.addEventListener("pointerdown", onMouseDown);
    svgEl.addEventListener("dblclick", onDblClick);
    return () => {
      svgEl.removeEventListener("pointerdown", onMouseDown);
      svgEl.removeEventListener("dblclick", onDblClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rendered.html]);

  // Reflect `selected` onto the current SVG (a fresh DOM tree each render).
  useEffect(() => {
    const host = hostRef.current;
    const svgEl = host && host.querySelector("svg");
    if (!svgEl) return;
    for (const el of svgEl.querySelectorAll(".diagram-selected")) el.classList.remove("diagram-selected");
    if (selected && (selected.type === "block" || selected.type === "group")) {
      const el = findDiagramElement(svgEl, rendered.diagramId, selected.id);
      if (el) el.classList.add("diagram-selected");
    } else if (selected && selected.type === "edge") {
      const el = findEdgeElement(svgEl, state, selected.id);
      if (el) el.classList.add("diagram-selected");
    }
  }, [rendered, selected, state]);

  // mermaid's own edge path has only a ~1-2px stroke, so clicking it means
  // aiming precisely. A transparent, much thicker copy of the same path
  // gives edges a click target the same size as blocks/areas without
  // touching how the line actually looks.
  useEffect(() => {
    const host = hostRef.current;
    const svgEl = host && host.querySelector("svg");
    if (!svgEl) return;
    for (const el of svgEl.querySelectorAll(".edge-hit-overlay")) el.remove();

    const ns = "http://www.w3.org/2000/svg";
    for (const edge of state.edges) {
      const pathEl = findEdgeElement(svgEl, state, edge.id);
      const d = pathEl && pathEl.getAttribute("d");
      if (!d || !pathEl.parentNode) continue;

      const hit = document.createElementNS(ns, "path");
      hit.setAttribute("d", d);
      hit.setAttribute("class", "edge-hit-overlay");
      hit.setAttribute("fill", "none");
      hit.setAttribute("stroke", "transparent");
      hit.setAttribute("stroke-width", "16");
      // Read directly by the shared mousedown/dblclick handlers below via
      // resolveTarget() — no separate listeners here, so a drag that starts
      // on an edge bubbles to the wrapper and pans like everywhere else.
      hit.dataset.edgeId = edge.id;
      pathEl.parentNode.insertBefore(hit, pathEl.nextSibling);
    }
  }, [rendered, state]);


  // The toolbar hovers over whatever is selected, so its position has to be
  // recomputed whenever the selection, the diagram or the view changes. It is
  // measured off the live SVG rather than derived from the model — mermaid owns
  // the layout, we only read it back.
  useEffect(() => {
    const stage = stageRef.current;
    const svgEl = hostRef.current && hostRef.current.querySelector("svg");
    if (!stage || !svgEl || !selected || interactionMode || ask) {
      setToolbar(null);
      return;
    }
    const el =
      selected.type === "edge"
        ? findEdgeElement(svgEl, state, selected.id)
        : findDiagramElement(svgEl, rendered.diagramId, selected.id);
    if (!el) {
      setToolbar(null);
      return;
    }
    const r = el.getBoundingClientRect();
    const s = stage.getBoundingClientRect();
    // Above the element by default; below it when there is no room, so the
    // toolbar never ends up outside the canvas.
    const below = r.top - s.top < 56;
    setToolbar({
      x: Math.min(Math.max(r.left + r.width / 2 - s.left, 90), Math.max(90, s.width - 90)),
      y: below ? r.bottom - s.top : r.top - s.top,
      below,
    });
  }, [selected, rendered, view, state, interactionMode, ask]);

  function isEmptyTarget(e) {
    return e.target === wrapRef.current || e.target === hostRef.current;
  }

  function onCanvasDoubleClick(e) {
    if (!isEmptyTarget(e)) return;
    const newId = "b" + stateRef.current.nextBlock;
    updateState((s) => ({
      ...s,
      blocks: [...s.blocks, { id: newId, label: t.defaults.block, color: DEFAULT_COLOR, shape: DEFAULT_SHAPE, groupId: null }],
      nextBlock: s.nextBlock + 1,
    }));
    focusOn([newId]);
  }

  function onCanvasPointerDown(e) {
    // Whatever this press turns out to be — a pan, a selection, a click
    // somewhere else — the offer to add something here is stale the moment it
    // starts. A clean click on bare canvas puts it back on release, unless it
    // was already open: then this click is the one that dismisses it.
    const hadAdd = addAtRef.current != null;
    setAddAt(null);
    const mode = interactionModeRef.current;
    const target = pendingTargetRef.current;
    pendingTargetRef.current = null;
    if (mode) {
      // Any click while a mode is armed that landed on a real target was
      // already handled (and stopped) by the SVG-level handler above —
      // reaching here means the click was on empty canvas.
      resolveModeClick(mode, null);
      return;
    }
    const v = viewRef.current;
    panRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startViewX: v.x,
      startViewY: v.y,
      moved: false,
      target,
      hadAdd,
      pointerId: e.pointerId,
      captured: false,
    };
    setIsPanning(true);
  }

  // Panning and selecting share one gesture: mousedown always arms a
  // potential pan (even when it started on a block/area/edge — that's the
  // whole point, dragging from there must still scroll the canvas). Only if
  // the mouse never moves past a small threshold does mouseup treat it as a
  // click and select whatever was under the cursor at mousedown time.
  useEffect(() => {
    function onMouseMove(e) {
      if (panRef.current) {
        const p = panRef.current;
        const dx = e.clientX - p.startX, dy = e.clientY - p.startY;
        if (!p.moved && (Math.abs(dx) >= 3 || Math.abs(dy) >= 3)) {
          p.moved = true;
          // Capture only once this is definitely a drag. Capturing on the
          // initial pointerdown would retarget every following event at the
          // wrapper, and the browser builds click/dblclick from those — which
          // silently killed double-click-to-rename and the edge label dialog.
          if (p.pointerId != null && wrapRef.current?.setPointerCapture) {
            try {
              wrapRef.current.setPointerCapture(p.pointerId);
              p.captured = true;
            } catch { /* not capturable */ }
          }
        }
        if (p.moved) {
          setView((v) => ({ ...v, x: p.startViewX + dx, y: p.startViewY + dy }));
        }
      }
    }
    function onMouseUp() {
      if (panRef.current) {
        const p = panRef.current;
        if (!p.moved) {
          if (p.target) {
            setSelected({ type: p.target.kind, id: p.target.id });
            setAddAt(null);
          } else if (selectedRef.current) {
            // The first click on bare canvas is how you let go of the current
            // selection. Offering "add something here" in the same gesture
            // would put a menu under the pointer every time someone deselects.
            setSelected(null);
            setAddAt(null);
          } else if (p.hadAdd) {
            // It was already open: this click closes it (done above) and
            // nothing else. Clicking elsewhere should be a way out of the
            // menu, not a way to drag it around the canvas.
          } else {
            const stage = stageRef.current;
            const r = stage ? stage.getBoundingClientRect() : null;
            setAddAt(r ? { x: p.startX - r.left, y: p.startY - r.top } : null);
          }
        }
        if (p.captured && wrapRef.current?.releasePointerCapture) {
          try { wrapRef.current.releasePointerCapture(p.pointerId); } catch { /* already gone */ }
        }
        panRef.current = null;
        setIsPanning(false);
      }
    }
    // Pointer events, not mouse events: this is the whole difference between
    // an editor that works on a tablet and one that does nothing there.
    window.addEventListener("pointermove", onMouseMove);
    window.addEventListener("pointerup", onMouseUp);
    window.addEventListener("pointercancel", onMouseUp);
    return () => {
      window.removeEventListener("pointermove", onMouseMove);
      window.removeEventListener("pointerup", onMouseUp);
      window.removeEventListener("pointercancel", onMouseUp);
    };
  }, []);

  // One rename path for everything: the toolbar button and the double-click
  // both open the same modal, so a block, an area and an arrow label are all
  // edited the same way.
  function askRename(kind, id) {
    const current =
      kind === "block"
        ? (stateRef.current.blocks.find((b) => b.id === id) || {}).label
        : kind === "group"
          ? (stateRef.current.groups.find((g) => g.id === id) || {}).label
          : (stateRef.current.edges.find((e) => e.id === id) || {}).label;
    setAsk({
      kind: "text",
      title: kind === "edge" ? t.prompts.edgeLabel : t.prompts.rename,
      value: current || "",
      onDone: (value) => {
        if (value == null) return;
        const trimmed = value.trim();
        updateState((st) => {
          if (kind === "block") {
            return {
              ...st,
              blocks: st.blocks.map((b) => (b.id === id ? { ...b, label: trimmed || t.defaults.block } : b)),
            };
          }
          if (kind === "group") {
            return {
              ...st,
              groups: st.groups.map((g) => (g.id === id ? { ...g, label: trimmed || t.defaults.group } : g)),
            };
          }
          return { ...st, edges: st.edges.map((e) => (e.id === id ? { ...e, label: trimmed } : e)) };
        });
      },
    });
  }

  useEffect(() => {
    function onKeyDown(e) {
      const tag = e.target.tagName;
      if (e.target.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const meta = e.metaKey || e.ctrlKey;

      if (e.key === "Escape" && addAt) {
        setAddAt(null);
        return;
      }

      if (e.key === "Escape" && ask) {
        setAsk(null);
        return;
      }

      if (e.key === "Escape" && (colorModalOpen || shapeModalOpen)) {
        setColorModalOpen(false);
        setShapeModalOpen(false);
        return;
      }

      if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }

      if (e.key === "Escape" && interactionMode) {
        setInteractionMode(null);
        return;
      }

      if (meta && e.key.toLowerCase() === "c" && selected && (selected.type === "block" || selected.type === "group")) {
        e.preventDefault();
        copySelected();
        return;
      }

      if (meta && e.key.toLowerCase() === "v" && clipboard) {
        e.preventDefault();
        startPaste();
        return;
      }

      if ((e.key === "Delete" || e.key === "Backspace") && selected) {
        e.preventDefault();
        deleteSelected();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selected, state, interactionMode, colorModalOpen, shapeModalOpen, clipboard, ask, history, addAt]);

  function addBlock() {
    const newId = "b" + stateRef.current.nextBlock;
    updateState((s) => ({
      ...s,
      blocks: [...s.blocks, { id: newId, label: t.defaults.block, color: DEFAULT_COLOR, shape: DEFAULT_SHAPE, groupId: null }],
      nextBlock: s.nextBlock + 1,
    }));
    focusOn([newId]);
  }

  function addBlockToGroup(groupId) {
    const newId = "b" + stateRef.current.nextBlock;
    updateState((s) => ({
      ...s,
      blocks: [...s.blocks, { id: newId, label: t.defaults.block, color: DEFAULT_COLOR, shape: DEFAULT_SHAPE, groupId }],
      nextBlock: s.nextBlock + 1,
    }));
    focusOn([newId, groupId]);
  }

  function addGroupToGroup(parentId) {
    const newId = "g" + stateRef.current.nextGroup;
    updateState((s) => ({
      ...s,
      groups: [...s.groups, { id: newId, label: t.defaults.group, color: null, parentId }],
      nextGroup: s.nextGroup + 1,
    }));
    focusOn([newId, parentId]);
  }

  // A block copies just itself. An area copies its whole subtree — nested
  // blocks and nested sub-areas — but only the edges that stay entirely
  // inside that subtree; anything reaching outside it is dropped rather than
  // left dangling on paste.
  function copySelected() {
    if (!selected) return;
    if (selected.type === "block") {
      const b = getById(selected.id);
      if (!b) return;
      setClipboard({ type: "block", rootId: b.id, blocks: [{ ...b }], groups: [], edges: [] });
    } else if (selected.type === "group") {
      const groupIds = new Set([selected.id, ...getDescendantGroupIds(state.groups, selected.id)]);
      const groups = state.groups.filter((g) => groupIds.has(g.id)).map((g) => ({ ...g }));
      const blocks = state.blocks.filter((b) => b.groupId && groupIds.has(b.groupId)).map((b) => ({ ...b }));
      const blockIds = new Set(blocks.map((b) => b.id));
      const edges = state.edges.filter((e) => blockIds.has(e.from) && blockIds.has(e.to)).map((e) => ({ ...e }));
      setClipboard({ type: "group", rootId: selected.id, blocks, groups, edges });
    }
  }

  // Pastes a copied block/subtree under `targetGroupId` (null = top level).
  // Everything nested inside a copied area keeps its relative structure —
  // only the root item is reparented to the paste target.
  function pasteClipboard(clip, targetGroupId) {
    updateState((s) => {
      const idMap = new Map();
      let nextBlock = s.nextBlock, nextGroup = s.nextGroup, nextEdge = s.nextEdge;

      for (const g of clip.groups) { idMap.set(g.id, "g" + nextGroup); nextGroup++; }
      for (const b of clip.blocks) { idMap.set(b.id, "b" + nextBlock); nextBlock++; }

      const newGroups = clip.groups.map((g) => ({
        ...g,
        id: idMap.get(g.id),
        parentId: g.id === clip.rootId ? (targetGroupId || null) : (g.parentId ? idMap.get(g.parentId) : null),
      }));
      const newBlocks = clip.blocks.map((b) => ({
        ...b,
        id: idMap.get(b.id),
        groupId: clip.type === "block" && b.id === clip.rootId
          ? (targetGroupId || null)
          : (b.groupId ? idMap.get(b.groupId) : null),
      }));
      const newEdges = clip.edges.map((e) => {
        const ne = { id: "e" + nextEdge, from: idMap.get(e.from), to: idMap.get(e.to), label: e.label };
        nextEdge++;
        return ne;
      });

      return {
        ...s,
        blocks: [...s.blocks, ...newBlocks],
        groups: [...s.groups, ...newGroups],
        edges: [...s.edges, ...newEdges],
        nextBlock, nextGroup, nextEdge,
      };
    });
  }

  function startPaste() {
    if (!clipboard) return;
    setInteractionMode({ type: "paste", clip: clipboard });
  }

  function removeSelected(sel) {
    updateState((s) => {
      if (sel.type === "block") {
        return {
          ...s,
          blocks: s.blocks.filter((b) => b.id !== sel.id),
          edges: s.edges.filter((ed) => ed.from !== sel.id && ed.to !== sel.id),
        };
      }
      if (sel.type === "group") {
        return removeGroup(s, sel.id);
      }
      return { ...s, edges: s.edges.filter((ed) => ed.id !== sel.id) };
    });
    setSelected(null);
  }

  function deleteSelected() {
    if (!selected) return;
    const sel = selected;
    setAsk({
      kind: "confirm",
      title: t.prompts.deleteSelected,
      onDone: (ok) => {
        if (ok) removeSelected(sel);
      },
    });
  }

  // Turns an arrow around. Kept as its own action rather than "delete and draw
  // it the other way" because that would lose the label and the line style.
  function reverseSelectedEdge() {
    if (!selected || selected.type !== "edge") return;
    updateState((s) => ({
      ...s,
      edges: s.edges.map((e) => (e.id === selected.id ? { ...e, from: e.to, to: e.from } : e)),
    }));
  }

  function addGroup() {
    const newId = "g" + stateRef.current.nextGroup;
    updateState((s) => ({
      ...s,
      groups: [...s.groups, { id: newId, label: t.defaults.group, color: null, parentId: null }],
      nextGroup: s.nextGroup + 1,
    }));
    focusOn([newId]);
  }

  function setGroupColor(color) {
    if (!selected || selected.type !== "group") return;
    updateState((s) => ({
      ...s,
      groups: s.groups.map((g) => (g.id === selected.id ? { ...g, color } : g)),
    }));
  }

  function setBlockColor(color) {
    if (!selected || selected.type !== "block") return;
    updateState((s) => ({
      ...s,
      blocks: s.blocks.map((b) => (b.id === selected.id ? { ...b, color } : b)),
    }));
  }

  function setBlockShape(shape) {
    if (!selected || selected.type !== "block") return;
    updateState((s) => ({
      ...s,
      blocks: s.blocks.map((b) => (b.id === selected.id ? { ...b, shape } : b)),
    }));
  }

  const selectedBlock = selected && selected.type === "block" ? getById(selected.id) : null;
  const selectedGroup = selected && selected.type === "group" ? state.groups.find((g) => g.id === selected.id) : null;

  return (
    <div className="visual-editor">
      {active && actionsSlot && createPortal(
        <>
          <button
            title={t.toolbar.undo}
            aria-label={t.toolbar.undo}
            onClick={undo}
            disabled={!history.past.length}
          >↩️</button>
          <button
            title={t.toolbar.redo}
            aria-label={t.toolbar.redo}
            onClick={redo}
            disabled={!history.future.length}
          >↪️</button>
          <span className="header-sep" />
          <button
            title={t.toolbar.copy} aria-label={t.toolbar.copy}
            onClick={copySelected}
            disabled={!selected || selected.type === "edge"}
          >📋</button>
          {/* 📥 now belongs to the header's Download menu — paste keeps its
              own icon so the two are never confused at a glance. */}
          <button title={t.toolbar.paste} aria-label={t.toolbar.paste} onClick={startPaste} disabled={!clipboard}>📌</button>
          <span className="header-sep" />
          {/* Nothing that acts on the current selection lives here any more —
              rename, connect, move, colour, shape and delete are all in the
              toolbar that hangs over the element itself. */}
        </>,
        actionsSlot
      )}
      {colorModalOpen && (selectedBlock || selectedGroup) && (
        <div className="modal-backdrop" onMouseDown={() => setColorModalOpen(false)}>
          <div className="modal-panel" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-title">{t.modals.colorTitle}</div>
            <div className="modal-swatches">
              {selectedGroup && (
                <button
                  className={"swatch" + (!selectedGroup.color ? " active" : "")}
                  style={{ background: "#444" }}
                  onClick={() => { setGroupColor(null); setColorModalOpen(false); }}
                />
              )}
              {COLORS.map((c) => (
                <button
                  key={c}
                  className={"swatch" + ((selectedBlock ? selectedBlock.color : selectedGroup.color) === c ? " active" : "")}
                  style={{ background: c }}
                  onClick={() => {
                    if (selectedBlock) setBlockColor(c); else setGroupColor(c);
                    setColorModalOpen(false);
                  }}
                />
              ))}
              <input
                type="color"
                className="swatch-custom"
                value={(selectedBlock ? selectedBlock.color : selectedGroup.color) || "#4da3ff"}
                onChange={(e) => (selectedBlock ? setBlockColor(e.target.value) : setGroupColor(e.target.value))}
              />
            </div>
          </div>
        </div>
      )}
      {shapeModalOpen && selectedBlock && (
        <div className="modal-backdrop" onMouseDown={() => setShapeModalOpen(false)}>
          <div className="modal-panel" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-title">{t.modals.shapeTitle}</div>
            {/* .modal-list / .modal-list-btn / .modal-list-icon: the same
                icon+label list styling as the Download and Open-document
                menus in EditorShell — one visual language for every "pick
                one row" modal in the editor. */}
            <div className="modal-list">
              {SHAPES.map((s) => (
                <button
                  key={s.key}
                  className={"modal-list-btn" + (selectedBlock.shape === s.key ? " active" : "")}
                  onClick={() => { setBlockShape(s.key); setShapeModalOpen(false); }}
                >
                  <span className="modal-list-icon">{s.emoji}</span> {t.shapes[s.key]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      <AskModal ask={ask} onClose={() => setAsk(null)} t={t} />
      {active && zoomSlot && createPortal(
        <>
          <button onClick={() => zoomBy(0.8)} title={t.zoom.out} aria-label={t.zoom.out}>➖</button>
          <button onClick={() => zoomBy(1.25)} title={t.zoom.in} aria-label={t.zoom.in}>➕</button>
          <button onClick={fitView} title={t.zoom.fit} aria-label={t.zoom.fit}>🖥️</button>
        </>,
        zoomSlot
      )}
      <div className="canvas-stage" ref={stageRef}>
        <div
          className={
            "canvas-wrap" +
            (isPanning ? " panning" : "") +
            (interactionMode ? ` mode-${interactionMode.type}` : "")
          }
          ref={wrapRef}
          onDoubleClick={onCanvasDoubleClick}
          onPointerDown={onCanvasPointerDown}
        >
          <div
            className="mermaid-host"
            ref={hostRef}
            style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}
          />
        </div>
        {toolbar && selected && (
          <div
            className={`element-toolbar${toolbar.below ? " below" : ""}`}
            style={{ left: toolbar.x, top: toolbar.y }}
            /* The toolbar sits over the canvas but outside .canvas-wrap, so a
               press on it neither starts a pan nor clears the selection. */
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              title={t.toolbar.rename}
              aria-label={t.toolbar.rename}
              onClick={() => askRename(selected.type, selected.id)}
            >✏️</button>
            {selected.type === "block" && (
              <button
                title={t.toolbar.connect}
                aria-label={t.toolbar.connect}
                onClick={() => setInteractionMode({ type: "connect", id: selected.id })}
              >➡️</button>
            )}
            {selected.type === "group" && (
              <button
                title={t.toolbar.addBlock}
                aria-label={t.toolbar.addBlock}
                onClick={() => addBlockToGroup(selected.id)}
              >➕</button>
            )}
            {selected.type === "group" && (
              <button
                title={t.toolbar.addGroup}
                aria-label={t.toolbar.addGroup}
                onClick={() => addGroupToGroup(selected.id)}
              >📦</button>
            )}
            {selected.type === "edge" && (
              <button
                title={t.toolbar.reverse}
                aria-label={t.toolbar.reverse}
                onClick={reverseSelectedEdge}
              >🔄</button>
            )}
            {selected.type !== "edge" && (
              <button
                title={t.toolbar.move}
                aria-label={t.toolbar.move}
                onClick={() => setInteractionMode({ type: "move", id: selected.id, kind: selected.type })}
              >✋</button>
            )}
            {selected.type !== "edge" && (
              <button
                title={t.toolbar.color}
                aria-label={t.toolbar.color}
                onClick={() => setColorModalOpen(true)}
              >🎨</button>
            )}
            {selected.type === "block" && (
              <button
                title={t.toolbar.shape}
                aria-label={t.toolbar.shape}
                onClick={() => setShapeModalOpen(true)}
              >🔷</button>
            )}
            <button
              className="danger"
              title={t.toolbar.delete}
              aria-label={t.toolbar.delete}
              onClick={deleteSelected}
            >🗑️</button>
          </div>
        )}
        {addAt && !selected && !interactionMode && !ask && (
          <div
            className="element-toolbar"
            style={{ left: addAt.x, top: addAt.y }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              title={t.toolbar.addBlock}
              aria-label={t.toolbar.addBlock}
              onClick={() => { addBlock(); setAddAt(null); }}
            >➕</button>
            <button
              title={t.toolbar.addGroup}
              aria-label={t.toolbar.addGroup}
              onClick={() => { addGroup(); setAddAt(null); }}
            >📦</button>
          </div>
        )}
        {codeOnly && <div className="canvas-notice canvas-notice-warn">{t.notices.codeOnly}</div>}
        {renderError && (
          <div className="canvas-notice canvas-notice-error">
            <strong>{t.notices.renderFailed}</strong>
            <span>{renderError}</span>
          </div>
        )}
        {interactionMode && (
          <div className="mode-hint">
            {interactionMode.type === "connect" && t.hints.connect}
            {interactionMode.type === "move" && t.hints.move}
            {interactionMode.type === "paste" && t.hints.paste}
          </div>
        )}
      </div>
    </div>
  );
}
