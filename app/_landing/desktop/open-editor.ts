import { OPEN_EDITOR_EVENT } from "./AppWindow";

// Closes the marketing window so the shared editor underneath is revealed.
// Used by every "Open editor" button on the site, on any page. Runs client-side
// only; safe to call from a click handler.
export function openEditor() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OPEN_EDITOR_EVENT));
}
