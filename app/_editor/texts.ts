// Strings of the editor workspace. One file per locale in
// content/editor/<locale>.json; the English file is the master whose key tree
// scripts/validate-content.mjs enforces on the other 33.
//
// The editor is a .jsx port of the standalone app and reads this object as a
// plain `t` prop, so the shape is declared here rather than inferred.
export interface EditorTexts {
  /** Title of the logo link back to the marketing site. */
  backToSite: string;
  tabs: { visual: string; text: string };
  toolbar: {
    addBlock: string;
    addGroup: string;
    copy: string;
    paste: string;
    delete: string;
    clearAll: string;
    connect: string;
    move: string;
    color: string;
    shape: string;
  };
  zoom: { center: string };
  modals: { colorTitle: string; shapeTitle: string };
  /** Keyed by the shape ids in VisualEditor.jsx's SHAPES list. */
  shapes: {
    rect: string;
    rounded: string;
    pill: string;
    circle: string;
    diamond: string;
    subroutine: string;
    cylinder: string;
    hexagon: string;
    asymmetric: string;
    parallelogram: string;
    parallelogramAlt: string;
    trapezoid: string;
    trapezoidAlt: string;
    doubleCircle: string;
  };
  /** Banner shown while a connect / move / paste mode is armed. */
  hints: { connect: string; move: string; paste: string };
  /** Native prompt() and confirm() copy. */
  prompts: { edgeLabel: string; clearAll: string };
  /** Labels new items and the starter diagram are created with. */
  defaults: { block: string; group: string; start: string; action: string };
  text: {
    examplePlaceholder: string;
    copyMermaid: string;
    downloadMmd: string;
    downloadMd: string;
    copySvg: string;
    downloadSvg: string;
    downloadPng: string;
    statusOk: string;
    statusError: string;
    statusSvgCopied: string;
    statusMermaidCopied: string;
  };
  /** Names of the six starter diagrams in the example picker. */
  examples: {
    flowchart: string;
    sequence: string;
    class: string;
    state: string;
    er: string;
    gantt: string;
  };
  /** Node labels inside the flowchart and gantt starter diagrams. */
  sample: {
    start: string;
    condition: string;
    yes: string;
    no: string;
    action1: string;
    action2: string;
    end: string;
    project: string;
    phase: string;
    task1: string;
    task2: string;
  };
}
