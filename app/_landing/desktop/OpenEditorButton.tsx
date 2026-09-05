"use client";

import { analytics } from "@/lib/analytics";
import { openEditor } from "./open-editor";

// Button that reveals the shared editor by closing the marketing window, on any
// page. Replaces the old /app link: the editor is always loaded underneath, so
// the button only has to collapse the window that is covering it.
export function OpenEditorButton({
  className,
  children,
  track = "Open editor",
}: {
  className?: string;
  children: React.ReactNode;
  track?: string;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        analytics.track("Click", track);
        openEditor();
      }}
    >
      {children}
    </button>
  );
}
