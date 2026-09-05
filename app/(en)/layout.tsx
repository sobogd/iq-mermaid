import "../globals.css";
import { DesktopChrome } from "@/app/_landing/desktop/DesktopChrome";
import type { Locale } from "@/lib/locales";

// Viewport (theme colour, no zoom lock) is inherited from the root layout.
export default function EnLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {/* Set the resolved theme before first paint (see lib/theme.ts): dark
            gets `data-theme="dark"` on <html> from the stored choice or the
            OS preference, so there is no light flash for dark-mode visitors. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var k="iqm-theme",v=window.localStorage.getItem(k),d=v? v==="dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.setAttribute("data-theme","dark");}catch(e){}})();`,
          }}
        />
        {/* Persistent desktop chrome (wallpaper + shared editor) — lives at the
            layout level so it is not remounted when navigating between pages of
            the same locale. The per-page DesktopShell stacks the taskbar and the
            closable window on top. */}
        <DesktopChrome locale={"en" as Locale} />
        {children}
      </body>
    </html>
  );
}
