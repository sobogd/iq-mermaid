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

/** Fired once the marketing window is gone and the shared editor is revealed:
 *  the editor is now sign-in-first, so an anonymous visitor is sent to the
 *  auth gate (see EditorShell). Fired by setContentWindowOpen(false). */
export const EDITOR_REVEAL_EVENT = "iqm:editor-reveal";

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
