import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import mermaid from "mermaid";

mermaid.initialize({ startOnLoad: false, theme: "default", securityLevel: "loose" });

const STORAGE_KEY = "mermaid-visual-editor-data";

const DEFAULT_COLOR = "#ECECFF"; // mermaid default-theme node fill (mainBkg)
const DEFAULT_SHAPE = "rect";

// 1.0 = mermaid's own native SVG pixel size — not "whole diagram fits on
// screen". Large diagrams legitimately need to zoom in past what used to be
// a hard 300% ceiling, and zoomed-out diagrams don't need to fit entirely
// either, so both bounds stay generous instead of tied to viewport size.
const MIN_ZOOM = 0.02;
const MAX_ZOOM = 16;

const COLORS = [DEFAULT_COLOR, "#2563eb", "#16a34a", "#dc2626", "#d97706", "#7c3aed", "#0891b2", "#db2777"];

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
const defaultState = (t) => ({
  blocks: [
    { id: "b1", label: t.defaults.start, color: DEFAULT_COLOR, shape: DEFAULT_SHAPE, groupId: null },
    { id: "b2", label: t.defaults.action, color: DEFAULT_COLOR, shape: DEFAULT_SHAPE, groupId: null },
  ],
  edges: [{ id: "e1", from: "b1", to: "b2", label: "" }],
  groups: [],
  nextBlock: 3,
  nextEdge: 2,
  nextGroup: 1,
});

function loadState(t) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { groups: [], nextGroup: 1, ...JSON.parse(raw) } : defaultState(t);
  } catch {
    return defaultState(t);
  }
}

// True if `parentId` is `id` itself or a descendant of `id` in the group tree
// — assigning it as a parent would create a cycle.
function isSelfOrDescendant(groups, id, parentId) {
  const children = groups.filter((g) => g.parentId === id).map((g) => g.id);
  if (children.includes(parentId)) return true;
  return children.some((childId) => isSelfOrDescendant(groups, childId, parentId));
}

// All group ids nested (at any depth) under `id` — used to pull a whole
// area's subtree into a copy without reaching outside it.
function getDescendantGroupIds(groups, id) {
  const direct = groups.filter((g) => g.parentId === id).map((g) => g.id);
  return direct.concat(direct.flatMap((childId) => getDescendantGroupIds(groups, childId)));
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

const MERMAID_BRACKETS = Object.fromEntries(
  SHAPE_DELIMS.map(({ key, open, close }) => [key, (t) => `${open}"\`${t}\`"${close}`])
);

function sanitizeLabel(text) {
  return text.replace(/"/g, "'").replace(/`/g, "'");
}

function buildLabel(block) {
  return sanitizeLabel(block.label);
}

const EMPTY_GROUP_PLACEHOLDER_PREFIX = "phEmpty";

function toMermaid(state) {
  const byId = Object.fromEntries(state.blocks.map((b) => [b.id, b]));
  const groups = state.groups || [];

  const lines = ["flowchart TD"];

  const nodeLine = (b) => {
    const wrap = MERMAID_BRACKETS[b.shape] || MERMAID_BRACKETS.rect;
    return `${b.id}${wrap(buildLabel(b))}`;
  };

  const emitGroup = (grp, depth) => {
    const indent = "    ".repeat(depth + 1);
    lines.push(`${indent}subgraph ${grp.id}["${grp.label.replace(/"/g, "'")}"]`);
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
    lines.push(e.label ? `    ${e.from} -->|${e.label}| ${e.to}` : `    ${e.from} --> ${e.to}`);
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
const EDGE_RE = new RegExp(
  "([A-Za-z][A-Za-z0-9_]*)" + EDGE_INLINE_SHAPE + "\\s*--+>\\s*(?:\\|(.*?)\\|\\s*)?([A-Za-z][A-Za-z0-9_]*)",
  "g"
);
const SUBGRAPH_RE = /^subgraph\s+([A-Za-z][A-Za-z0-9_]*)\s*(?:\[(?:"([^"]*)"|([^\]]*))\])?/i;
const STYLE_RE = /^style\s+([A-Za-z][A-Za-z0-9_]*)\s+fill:\s*(#[0-9a-fA-F]{3,8})/i;

// Flowchart-only, best-effort. Every property (label, shape, color, group
// membership) is derivable from the text itself, so unlike positions there is
// nothing to preserve from the previous diagram besides id counters.
function parseFlowchart(text, prev) {
  const trimmed = text.trim();
  if (!/^flowchart\b/i.test(trimmed)) return null;

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
      edgeList.push({ from: m[1], label: (m[2] || "").trim(), to: m[3] });
      if (!blockInfo[m[1]] && !blockOrder.includes(m[1])) blockOrder.push(m[1]);
      if (!blockInfo[m[3]] && !blockOrder.includes(m[3])) blockOrder.push(m[3]);
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

  const edges = edgeList.map((e, i) => ({ id: "e" + (i + 1), from: e.from, to: e.to, label: e.label }));

  const maxSuffix = (ids, prefix) =>
    ids.reduce((max, id) => {
      const mm = id.match(new RegExp("^" + prefix + "(\\d+)$"));
      return mm ? Math.max(max, Number(mm[1]) + 1) : max;
    }, 1);

  return {
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
  if (m) return m[1];
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

// Edge paths get id "...-L_<from>_<to>_<counter>" (getEdgeId in mermaid).
// The counter is NOT a plain 0-based index among parallel edges: mermaid's
// flowchart DB assigns 0 to the first edge of a (from,to) pair and N+1 to the
// (N+1)th one — i.e. 0, 2, 3, 4… (1 is never used). Confirmed against a real
// render with two parallel edges (got "..._0" and "..._2").
function mermaidEdgeCounter(indexAmongPair) {
  return indexAmongPair === 0 ? 0 : indexAmongPair + 1;
}

function findEdgeElement(svgRoot, state, edgeId) {
  const edge = state.edges.find((e) => e.id === edgeId);
  if (!svgRoot || !edge) return null;
  let n = 0;
  for (const e of state.edges) {
    if (e.id === edgeId) break;
    if (e.from === edge.from && e.to === edge.to) n++;
  }
  const needle = `L_${edge.from}_${edge.to}_${mermaidEdgeCounter(n)}`;
  for (const el of svgRoot.querySelectorAll("path[id]")) {
    if (el.id.includes(needle)) return el;
  }
  return null;
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

export default function VisualEditor({ active, actionsSlot, zoomSlot, onCodeChange, importText, importSeq, t }) {
  // Lazy initializer, so the starter diagram is built once with this locale's
  // labels rather than on every render.
  const [state, setState] = useState(() => loadState(t));
  const [selected, setSelected] = useState(null); // { type, id }
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 }); // pan (screen px) + zoom
  const [isPanning, setIsPanning] = useState(false);
  const [rendered, setRendered] = useState({ html: "", diagramId: "" });
  const [renameOverlay, setRenameOverlay] = useState(null); // { kind, id, rect, value }
  const wrapRef = useRef(null); // outer viewport, fixed size, clips content
  const hostRef = useRef(null); // holds the injected mermaid SVG, transformed by pan/zoom
  const viewRef = useRef(view);
  const anchorRef = useRef(null); // { id, screenX, screenY } captured just before an edit, to keep it visually still
  const stateRef = useRef(state);
  const panRef = useRef(null); // { startX, startY, startViewX, startViewY, moved, target }
  const pendingTargetRef = useRef(null); // resolved target from the last mousedown, read once at pan-arm time
  const [clipboard, setClipboard] = useState(null); // { type, rootId, blocks, groups, edges }
  const lastImportSeqRef = useRef(0);
  const importAppliedRef = useRef(false);
  const renderSeqRef = useRef(0);
  const hasCenteredRef = useRef(false);
  const cancelRenameRef = useRef(false);
  const [interactionMode, setInteractionMode] = useState(null); // { type: 'connect'|'move', id, kind }
  const [colorModalOpen, setColorModalOpen] = useState(false);
  const [shapeModalOpen, setShapeModalOpen] = useState(false);
  const interactionModeRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

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
    mermaid.render(id, text).then(({ svg }) => {
      if (!cancelled) setRendered({ html: svg, diagramId: id });
    }).catch(() => {
      if (!cancelled) setRendered({ html: "", diagramId: id });
    });
    return () => { cancelled = true; };
  }, [state]);

  // mermaid re-lays-out the *entire* diagram on every edit, not just what
  // changed — so even though `view` (pan/zoom) itself is never touched here,
  // content can visibly jump under a static viewport. Remember where the
  // selected block/area sits on screen right before an edit; once the new
  // SVG is in, nudge the view so that same element lands back in the same
  // screen spot, cancelling out the relayout shift.
  function captureAnchor() {
    const svgEl = hostRef.current && hostRef.current.querySelector("svg");
    const wrap = wrapRef.current;
    if (!svgEl || !wrap) { anchorRef.current = null; return; }
    const v = viewRef.current;

    let anchorId = null;
    let bbox = null;
    if (selected && (selected.type === "block" || selected.type === "group")) {
      const el = findDiagramElement(svgEl, rendered.diagramId, selected.id);
      if (el) {
        try { bbox = el.getBBox(); anchorId = selected.id; } catch { /* no bbox, fall through */ }
      }
    }
    if (!anchorId) {
      // Nothing selected (the common case right after editing in the Text
      // tab) — anchor on whatever element is closest to the current
      // viewport center instead, so panning/zooming into one part of a big
      // diagram survives an edit even without clicking anything first.
      const wrapRect = wrap.getBoundingClientRect();
      const cx = wrapRect.width / 2, cy = wrapRect.height / 2;
      let bestDist = Infinity;
      for (const el of svgEl.querySelectorAll(".node, .cluster")) {
        const id = extractOurId(el, rendered.diagramId);
        if (!id) continue;
        let b;
        try { b = el.getBBox(); } catch { continue; }
        const screenX = v.x + (b.x + b.width / 2) * v.zoom;
        const screenY = v.y + (b.y + b.height / 2) * v.zoom;
        const dx = screenX - cx, dy = screenY - cy;
        const dist = dx * dx + dy * dy;
        if (dist < bestDist) { bestDist = dist; anchorId = id; bbox = b; }
      }
    }
    if (!anchorId || !bbox) { anchorRef.current = null; return; }

    anchorRef.current = {
      id: anchorId,
      screenX: v.x + (bbox.x + bbox.width / 2) * v.zoom,
      screenY: v.y + (bbox.y + bbox.height / 2) * v.zoom,
    };
  }

  function updateState(updater) {
    captureAnchor();
    setState(updater);
  }

  useEffect(() => {
    const anchor = anchorRef.current;
    anchorRef.current = null;
    if (!anchor) return;
    const svgEl = hostRef.current && hostRef.current.querySelector("svg");
    if (!svgEl) return;
    const el = findDiagramElement(svgEl, rendered.diagramId, anchor.id);
    if (!el) return;
    let bbox;
    try { bbox = el.getBBox(); } catch { return; }
    const localCx = bbox.x + bbox.width / 2;
    const localCy = bbox.y + bbox.height / 2;
    setView((v) => {
      const screenX = v.x + localCx * v.zoom;
      const screenY = v.y + localCy * v.zoom;
      return { ...v, x: v.x + (anchor.screenX - screenX), y: v.y + (anchor.screenY - screenY) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rendered]);

  function centerView(zoom) {
    const wrap = wrapRef.current;
    const svgEl = hostRef.current && hostRef.current.querySelector("svg");
    if (!wrap) return;
    const w = wrap.clientWidth, h = wrap.clientHeight;
    let cx = 0, cy = 0;
    if (svgEl && svgEl.viewBox && svgEl.viewBox.baseVal && svgEl.viewBox.baseVal.width) {
      const vb = svgEl.viewBox.baseVal;
      cx = vb.x + vb.width / 2;
      cy = vb.y + vb.height / 2;
    }
    const z = zoom || 1;
    setView({ zoom: z, x: w / 2 - cx * z, y: h / 2 - cy * z });
  }

  useEffect(() => {
    // Auto-center only once, right after the first diagram render — not on
    // every subsequent edit, or the view would snap back to zoom=1 on every
    // reparent/rename/color change instead of preserving what the user set.
    if (hasCenteredRef.current || !rendered.html) return;
    hasCenteredRef.current = true;
    const raf = requestAnimationFrame(() => centerView(1));
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rendered.html]);

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
        updateState((s) => {
          const b = s.blocks.find((bb) => bb.id === mode.id);
          if (!b || (b.groupId || null) === groupId) return s;
          return { ...s, blocks: s.blocks.map((bb) => (bb.id === mode.id ? { ...bb, groupId } : bb)) };
        });
      } else if (
        mode.kind === "group" && groupId !== mode.id &&
        !isSelfOrDescendant(stateRef.current.groups, mode.id, groupId)
      ) {
        updateState((s) => {
          const grp = s.groups.find((gg) => gg.id === mode.id);
          if (!grp || (grp.parentId || null) === groupId) return s;
          return { ...s, groups: s.groups.map((gg) => (gg.id === mode.id ? { ...gg, parentId: groupId } : gg)) };
        });
      }
    } else if (!target) {
      if (mode.kind === "block") {
        updateState((s) => ({ ...s, blocks: s.blocks.map((bb) => (bb.id === mode.id ? { ...bb, groupId: null } : bb)) }));
      } else {
        updateState((s) => ({ ...s, groups: s.groups.map((gg) => (gg.id === mode.id ? { ...gg, parentId: null } : gg)) }));
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
        const edge = stateRef.current.edges.find((ed) => ed.id === target.id);
        if (!edge) return;
        const value = prompt(t.prompts.edgeLabel, edge.label || "");
        if (value === null) return;
        updateState((s) => ({ ...s, edges: s.edges.map((ed) => (ed.id === edge.id ? { ...ed, label: value.trim() } : ed)) }));
        return;
      }
      const labelEl = target.el.querySelector(".nodeLabel, .cluster-label") || target.el;
      const rect = labelEl.getBoundingClientRect();
      const current = target.kind === "block"
        ? (getById(target.id) || {}).label
        : (stateRef.current.groups.find((g) => g.id === target.id) || {}).label;
      cancelRenameRef.current = false;
      setRenameOverlay({ kind: target.kind, id: target.id, rect, value: current || "" });
    }

    svgEl.addEventListener("mousedown", onMouseDown);
    svgEl.addEventListener("dblclick", onDblClick);
    return () => {
      svgEl.removeEventListener("mousedown", onMouseDown);
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


  function isEmptyTarget(e) {
    return e.target === wrapRef.current || e.target === hostRef.current;
  }

  function onCanvasDoubleClick(e) {
    if (!isEmptyTarget(e)) return;
    updateState((s) => ({
      ...s,
      blocks: [...s.blocks, { id: "b" + s.nextBlock, label: t.defaults.block, color: DEFAULT_COLOR, shape: DEFAULT_SHAPE, groupId: null }],
      nextBlock: s.nextBlock + 1,
    }));
  }

  function onCanvasMouseDown(e) {
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
    panRef.current = { startX: e.clientX, startY: e.clientY, startViewX: v.x, startViewY: v.y, moved: false, target };
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
        if (!p.moved && (Math.abs(dx) >= 3 || Math.abs(dy) >= 3)) p.moved = true;
        if (p.moved) {
          setView((v) => ({ ...v, x: p.startViewX + dx, y: p.startViewY + dy }));
        }
      }
    }
    function onMouseUp() {
      if (panRef.current) {
        const p = panRef.current;
        if (!p.moved) {
          setSelected(p.target ? { type: p.target.kind, id: p.target.id } : null);
        }
        panRef.current = null;
        setIsPanning(false);
      }
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  function commitRename(value) {
    setRenameOverlay((overlay) => {
      if (!overlay) return null;
      if (cancelRenameRef.current) { cancelRenameRef.current = false; return null; }
      const trimmed = value.trim();
      if (overlay.kind === "block") {
        updateState((s) => ({
          ...s,
          blocks: s.blocks.map((b) => (b.id === overlay.id ? { ...b, label: trimmed || t.defaults.block } : b)),
        }));
      } else {
        updateState((s) => ({
          ...s,
          groups: s.groups.map((g) => (g.id === overlay.id ? { ...g, label: trimmed || t.defaults.group } : g)),
        }));
      }
      return null;
    });
  }

  useEffect(() => {
    function onKeyDown(e) {
      const tag = e.target.tagName;
      if (e.target.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const meta = e.metaKey || e.ctrlKey;

      if (e.key === "Escape" && (colorModalOpen || shapeModalOpen)) {
        setColorModalOpen(false);
        setShapeModalOpen(false);
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
        updateState((s) => {
          if (selected.type === "block") {
            return {
              ...s,
              blocks: s.blocks.filter((b) => b.id !== selected.id),
              edges: s.edges.filter((ed) => ed.from !== selected.id && ed.to !== selected.id),
            };
          }
          if (selected.type === "group") {
            return removeGroup(s, selected.id);
          }
          return { ...s, edges: s.edges.filter((ed) => ed.id !== selected.id) };
        });
        setSelected(null);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selected, state, interactionMode, colorModalOpen, shapeModalOpen, clipboard]);

  function addBlock() {
    updateState((s) => ({
      ...s,
      blocks: [...s.blocks, { id: "b" + s.nextBlock, label: t.defaults.block, color: DEFAULT_COLOR, shape: DEFAULT_SHAPE, groupId: null }],
      nextBlock: s.nextBlock + 1,
    }));
  }

  function addBlockToGroup(groupId) {
    updateState((s) => ({
      ...s,
      blocks: [...s.blocks, { id: "b" + s.nextBlock, label: t.defaults.block, color: DEFAULT_COLOR, shape: DEFAULT_SHAPE, groupId }],
      nextBlock: s.nextBlock + 1,
    }));
  }

  // A selected area gets the new block dropped straight into it; otherwise
  // it's added ungrouped, same as before.
  function addBlockContextual() {
    if (selected && selected.type === "group") addBlockToGroup(selected.id);
    else addBlock();
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

  function deleteSelected() {
    if (!selected) return;
    updateState((s) => {
      if (selected.type === "block") {
        return {
          ...s,
          blocks: s.blocks.filter((b) => b.id !== selected.id),
          edges: s.edges.filter((ed) => ed.from !== selected.id && ed.to !== selected.id),
        };
      }
      if (selected.type === "group") {
        return removeGroup(s, selected.id);
      }
      return { ...s, edges: s.edges.filter((ed) => ed.id !== selected.id) };
    });
    setSelected(null);
  }

  function clearAll() {
    if (!confirm(t.prompts.clearAll)) return;
    updateState({ blocks: [], edges: [], groups: [], nextBlock: 1, nextEdge: 1, nextGroup: 1 });
    setSelected(null);
  }

  function addGroup() {
    updateState((s) => ({
      ...s,
      groups: [...s.groups, { id: "g" + s.nextGroup, label: t.defaults.group, color: null, parentId: null }],
      nextGroup: s.nextGroup + 1,
    }));
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
          <button title={t.toolbar.addBlock} onClick={addBlockContextual}>➕</button>
          <button title={t.toolbar.addGroup} onClick={addGroup}>📦</button>
          <button
            title={t.toolbar.copy}
            onClick={copySelected}
            disabled={!selected || selected.type === "edge"}
          >📋</button>
          <button title={t.toolbar.paste} onClick={startPaste} disabled={!clipboard}>📥</button>
          <button title={t.toolbar.delete} className="danger" onClick={deleteSelected} disabled={!selected}>🗑️</button>
          <button title={t.toolbar.clearAll} className="danger" onClick={clearAll}>🧹</button>
          <span className="header-sep" />
          <button
            title={t.toolbar.connect}
            onClick={() => selectedBlock && setInteractionMode({ type: "connect", id: selectedBlock.id })}
            disabled={!selectedBlock}
          >➡️</button>
          <button
            title={t.toolbar.move}
            onClick={() => {
              if (selectedBlock) setInteractionMode({ type: "move", id: selectedBlock.id, kind: "block" });
              else if (selectedGroup) setInteractionMode({ type: "move", id: selectedGroup.id, kind: "group" });
            }}
            disabled={!selectedBlock && !selectedGroup}
          >✋</button>
          <button
            title={t.toolbar.color}
            onClick={() => setColorModalOpen(true)}
            disabled={!selectedBlock && !selectedGroup}
          >🎨</button>
          <button
            title={t.toolbar.shape}
            onClick={() => selectedBlock && setShapeModalOpen(true)}
            disabled={!selectedBlock}
          >🔷</button>
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
            <div className="modal-shapes">
              {SHAPES.map((s) => (
                <button
                  key={s.key}
                  className={"modal-shape-btn" + (selectedBlock.shape === s.key ? " active" : "")}
                  onClick={() => { setBlockShape(s.key); setShapeModalOpen(false); }}
                >
                  <span className="modal-shape-emoji">{s.emoji}</span> {t.shapes[s.key]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {active && zoomSlot && createPortal(
        <>
          <button onClick={() => zoomBy(0.8)}>−</button>
          <span className="zoom-value">{Math.round(view.zoom * 100)}%</span>
          <button onClick={() => zoomBy(1.25)}>+</button>
          <button onClick={() => centerView(1)}>{t.zoom.center}</button>
        </>,
        zoomSlot
      )}
      <div className="canvas-stage">
        <div
          className={
            "canvas-wrap" +
            (isPanning ? " panning" : "") +
            (interactionMode ? ` mode-${interactionMode.type}` : "")
          }
          ref={wrapRef}
          onDoubleClick={onCanvasDoubleClick}
          onMouseDown={onCanvasMouseDown}
        >
          <div
            className="mermaid-host"
            ref={hostRef}
            style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}
            dangerouslySetInnerHTML={{ __html: rendered.html }}
          />
        </div>
        {interactionMode && (
          <div className="mode-hint">
            {interactionMode.type === "connect" && t.hints.connect}
            {interactionMode.type === "move" && t.hints.move}
            {interactionMode.type === "paste" && t.hints.paste}
          </div>
        )}
        {renameOverlay && (
          <input
            autoFocus
            className="rename-overlay"
            style={{
              position: "fixed",
              left: renameOverlay.rect.left - 6,
              top: renameOverlay.rect.top - 4,
              width: Math.max(60, renameOverlay.rect.width + 12),
              height: renameOverlay.rect.height + 8,
            }}
            defaultValue={renameOverlay.value}
            onFocus={(e) => e.target.select()}
            onBlur={(e) => commitRename(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") e.target.blur();
              if (e.key === "Escape") { cancelRenameRef.current = true; e.target.blur(); }
            }}
          />
        )}
      </div>
    </div>
  );
}
