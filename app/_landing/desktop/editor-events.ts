// Window events the taskbar buttons dispatch and the shared editor listens for.
// The taskbar (rendered by DesktopShell) and the editor (lazy-loaded inside
// EditorBackdrop) are separate trees, so actions that act on the open diagram
// — export, copy, open the code sheet, open/create documents — cross that
// boundary as window events.
export const EDITOR_DOWNLOAD_EVENT = "iqm:editor-download";
export const EDITOR_COPY_EVENT = "iqm:editor-copy";
export const EDITOR_CODE_EVENT = "iqm:editor-code";
export const EDITOR_OPEN_DOCS_EVENT = "iqm:editor-open-docs";
export const EDITOR_NEW_DOC_EVENT = "iqm:editor-new-doc";

// Dock → editor canvas actions. The dock is now an eager, lightweight tree
// (EditorDock) rendered on every marketing page, while the mermaid canvas
// (VisualEditor) stays behind the lazy boundary and only boots on the first
// reveal. These window events are how the always-visible dock buttons reach
// the canvas: EditorClient queues any that arrive before the shell is ready
// (exactly like the taskbar actions) and VisualEditor handles them once it
// has mounted.
export const EDITOR_ADD_BLOCK_EVENT = "iqm:editor-add-block";
export const EDITOR_ADD_GROUP_EVENT = "iqm:editor-add-group";
// Note: distinct from EDITOR_COPY_EVENT above — that one copies the diagram's
// mermaid source to the system clipboard (a taskbar action), while this one
// copies the selected block *within* the canvas' internal clipboard.
export const EDITOR_COPY_BLOCK_EVENT = "iqm:editor-copy-block";
export const EDITOR_PASTE_EVENT = "iqm:editor-paste";
export const EDITOR_UNDO_EVENT = "iqm:editor-undo";
export const EDITOR_REDO_EVENT = "iqm:editor-redo";
export const EDITOR_ZOOM_IN_EVENT = "iqm:editor-zoom-in";
export const EDITOR_ZOOM_OUT_EVENT = "iqm:editor-zoom-out";
export const EDITOR_FIT_EVENT = "iqm:editor-fit";

// Editor canvas → dock. VisualEditor publishes the bits of its state the dock
// buttons need to know about (copy needs a selection, paste needs a clipboard,
// undo/redo need history) so the eager dock can disable them honestly before
// anything is loaded or selected. Defaults to all-false, which is exactly the
// state before the canvas has booted.
export const EDITOR_DOCK_STATE_EVENT = "iqm:editor-dock-state";
export type EditorDockState = {
  canCopy: boolean;
  canPaste: boolean;
  canUndo: boolean;
  canRedo: boolean;
};
export const publishDockState = (state: EditorDockState) =>
  window.dispatchEvent(new CustomEvent<EditorDockState>(EDITOR_DOCK_STATE_EVENT, { detail: state }));

// Editor shell → dock. The one-line status ("Saved", "Copied SVG", …) used to
// live inside the shell; with the dock extracted it is broadcast here and the
// dock renders + auto-clears it.
export const EDITOR_STATUS_EVENT = "iqm:editor-status";
export const publishStatus = (message: string) =>
  window.dispatchEvent(new CustomEvent<string>(EDITOR_STATUS_EVENT, { detail: message }));

/** Fired once the marketing window is gone and the shared editor is revealed:
 *  the editor is now sign-in-first, so an anonymous visitor is sent to the
 *  auth gate (see EditorShell). Fired by setContentWindowOpen(false). */
export const EDITOR_REVEAL_EVENT = "iqm:editor-reveal";

/** Fired by EditorShell once it has resolved the open document on its first
 *  boot. EditorClient mounts the shell lazily (first reveal only, so mermaid
 *  never loads for visitors who stay on marketing pages); taskbar actions
 *  (export / copy / documents / new) that arrive before that boot are queued
 *  there and replayed on this event, so the very first click is never dropped. */
export const EDITOR_READY_EVENT = "iqm:editor-ready";

/** Fired by the header's logo / Features / Guides links and by any content
 *  window mount: the content part is open (the editor is "behind" it). */
export const CONTENT_OPEN_EVENT = "iqm:content-open";
export const requestContentOpen = () => window.dispatchEvent(new Event(CONTENT_OPEN_EVENT));

// Authoritative "is the content window open?" state. One source of truth kept
// in sync by AppWindow (effect on its closed state), so the editor can never
// raise the auth gate while content is actually showing — which used to happen
// on client navigations like the language switcher remounting the window.
let contentWindowOpen = true;
let editorRevealed = false;

export const setContentWindowOpen = (open: boolean) => {
  contentWindowOpen = open;
  editorRevealed = !open;
  window.dispatchEvent(new Event(open ? CONTENT_OPEN_EVENT : EDITOR_REVEAL_EVENT));
};
export const isContentWindowOpen = () => contentWindowOpen;
/** True if the editor was revealed before the listener attached (the shell
 *  boots lazily, so a reveal can fire while it is still loading). */
export const hasEditorRevealed = () => editorRevealed;

/** Dispatch a download of the current diagram. `kind` is one of the export
 *  shortcuts the editor understands: "mermaid" | "md" | "svg" | "png". */
export function requestDownload(kind: string) {
  window.dispatchEvent(new CustomEvent(EDITOR_DOWNLOAD_EVENT, { detail: { kind } }));
}

/** Dispatch a copy of the current diagram to the clipboard. */
export function requestCopy() {
  window.dispatchEvent(new CustomEvent(EDITOR_COPY_EVENT));
}

/** Open the editor's document list. */
export function requestOpenDocs() {
  window.dispatchEvent(new CustomEvent(EDITOR_OPEN_DOCS_EVENT));
}

/** Create a brand-new document. */
export function requestNewDoc() {
  window.dispatchEvent(new CustomEvent(EDITOR_NEW_DOC_EVENT));
}

// Shared flag: a taskbar context menu (Documents / Export) is open.
// While one is open, an outside click must dismiss *just the menu* and NOT
// bubble into the window's click-away (which would close the scroll block).
let taskbarMenuOpen = false;
export const setTaskbarMenuOpen = (open: boolean) => {
  taskbarMenuOpen = open;
};
export const isTaskbarMenuOpen = () => taskbarMenuOpen;
