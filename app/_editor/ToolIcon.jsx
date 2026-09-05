// Icons for the editor's two floating dock rails (left build actions, right
// history + view). Uses the project's existing `lucide-react` dependency for
// clean, consistent glyphs — no hand-drawn paths to maintain.
//
// lucide is a stroke-based set, so we keep its outline look but draw it a touch
// heavier and in white, with a soft drop shadow (see CSS) so the glyph sits on
// the wallpaper with a little depth but no background box/card.
import {
  SquarePlus,
  SquareDashedBottom,
  Copy,
  ClipboardPaste,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Fullscreen,
} from "lucide-react";

export const DOCK_ICONS = {
  addBlock: SquarePlus,
  addGroup: SquareDashedBottom,
  copy: Copy,
  paste: ClipboardPaste,
  undo: Undo2,
  redo: Redo2,
  zoomIn: ZoomIn,
  zoomOut: ZoomOut,
  fit: Fullscreen,
};

export default function ToolIcon({ name, size = 20 }) {
  const Icon = DOCK_ICONS[name] ?? Fullscreen;
  return (
    <Icon
      className="tool-icon"
      size={size}
      strokeWidth={1.75}
      color="currentColor"
    />
  );
}
