// Strings of the editor workspace. One file per locale in
// content/editor/<locale>.json; the English file is the master whose key tree
// scripts/validate-content.mjs enforces on the other 33.
//
// The editor is a .jsx port of the standalone app and reads this object as a
// plain `t` prop, so the shape is declared here rather than inferred.
export interface EditorTexts {
  /** Title of the logo link back to the marketing site. */
  backToSite: string;
  /** Icon-only buttons that live directly in the header (not inside a
   *  portal), each just a tooltip/aria-label — the icon itself is fixed in
   *  EditorShell.jsx. */
  header: {
    open: string;
    newDocument: string;
    download: string;
    /** Placeholder sign-in entry point; does nothing yet. */
    account: string;
    code: string;
  };
  toolbar: {
    undo: string;
    redo: string;
    rename: string;
    reverse: string;
    addBlock: string;
    addGroup: string;
    copy: string;
    paste: string;
    delete: string;
    connect: string;
    move: string;
    color: string;
    shape: string;
  };
  zoom: { in: string; out: string; fit: string };
  modals: {
    colorTitle: string;
    shapeTitle: string;
    /** Heading of the 📥 export-options list. */
    downloadTitle: string;
    /** Heading of the 📂 saved-documents list. */
    openTitle: string;
    ok: string;
    cancel: string;
  };
  /** Banners drawn over the canvas. */
  notices: { renderFailed: string; codeOnly: string };
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
  prompts: { edgeLabel: string; rename: string; deleteSelected: string };
  /** Labels new items and the starter diagram are created with. */
  defaults: { block: string; group: string; start: string; action: string };
  /** The 📂 Open list and the ✏️ New-document flow. */
  documents: {
    /** Tooltip on a row's own trash icon in the Open list. */
    delete: string;
    /** Confirm-modal title before removing a saved document. */
    deleteConfirm: string;
    /** Fallback title for a document with nothing recognisable drawn yet. */
    untitled: string;
  };
  text: {
    copyMermaid: string;
    downloadMmd: string;
    downloadMd: string;
    copySvg: string;
    downloadSvg: string;
    downloadPng: string;
    statusSvgCopied: string;
    statusMermaidCopied: string;
    statusSaved: string;
    statusExportFailed: string;
  };
}
