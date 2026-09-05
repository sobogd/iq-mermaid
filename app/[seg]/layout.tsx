import { locales, rtlLocales, type Locale } from "@/lib/locales";
import { DesktopChrome } from "@/app/_landing/desktop/DesktopChrome";

// Document shell for every dynamic-segment route (locale homes, pair pages,
// localized pricing). The (en)/ and ru/ groups own their static shells; this
// mirrors them and sets the correct lang + dir per locale — without it these
// routes rendered with no <html> element at all (no lang, broken sticky
// header styling context).
export default async function SegLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ seg: string }>;
}) {
  const { seg } = await params;
  const lang = (locales as readonly string[]).includes(seg) ? seg : "en";
  const dir = (rtlLocales as readonly string[]).includes(lang) ? "rtl" : undefined;
  return (
    <html lang={lang} dir={dir} className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {/* Set the resolved theme before first paint (see lib/theme.ts): dark
            gets `data-theme="dark"` on <html> from the stored choice or the
            OS preference, so there is no light flash for dark-mode visitors. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var k="iqm-theme",v=window.localStorage.getItem(k),d=v? v==="dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.setAttribute("data-theme","dark");}catch(e){}})();`,
          }}
        />
        {/* Persistent desktop chrome (see (en)/layout.tsx). */}
        <DesktopChrome locale={(lang as Locale) || "en"} />
        {children}
      </body>
    </html>
  );
}
