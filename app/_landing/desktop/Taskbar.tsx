"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, ChevronLeft, FileCode2, FileText, Image as ImageIcon, Copy, FolderOpen, Plus, ShieldCheck, Monitor, Sun, Moon } from "lucide-react";
import { LogoIcon } from "../LogoIcon";
import { localePath, swapLocale } from "@/lib/locale-paths";
import { LOCALE_NAMES } from "@/lib/locale-names";
import { defaultLocale, locales, type Locale } from "@/lib/locales";
import { analytics } from "@/lib/analytics";
import { requestContentOpen, requestDownload, requestCopy, requestOpenDocs, requestNewDoc, setTaskbarMenuOpen } from "./editor-events";
import { openEditor } from "./open-editor";
import { applyResolvedTheme, getThemeChoice, setThemeChoice, subscribeTheme, type ThemeChoice } from "@/lib/theme";

export type TaskbarTexts = {
  logo: string;
  features: string;
  blog: string;
  faq: string;
  openEditor: string;
  menu: string;
  /** Labels of the two site menus: legal pages and the language switcher. */
  legal: string;
  languages: string;
  /** Tool menus (Documents / Export / Edit Code) and their rows. */
  documents: string;
  export: string;
  editCode: string;
  openDocuments: string;
  createNew: string;
  exportCopyMermaid: string;
  exportMermaidMmd: string;
  exportMd: string;
  exportSvg: string;
  exportPng: string;
  /** Settings → Theme picker. */
  settings: string;
  theme: string;
  themeSystem: string;
  themeLight: string;
  themeDark: string;
  /** Legal document links (localized chrome routes, English body). */
  legalPrivacy: string;
  legalTerms: string;
};

const DEFAULT_TEXTS: TaskbarTexts = {
  logo: "Mermaid",
  features: "Features",
  blog: "Guides",
  faq: "FAQ",
  openEditor: "Open editor",
  menu: "Menu",
  legal: "Legal",
  languages: "Languages",
  documents: "Documents",
  export: "Export",
  editCode: "Edit Code",
  openDocuments: "Open documents",
  createNew: "Create new",
  exportCopyMermaid: "Copy Mermaid",
  exportMermaidMmd: "Mermaid (.mmd)",
  exportMd: "Markdown (.md)",
  exportSvg: "SVG",
  exportPng: "PNG (2x)",
  settings: "Settings",
  theme: "Theme",
  themeSystem: "System",
  themeLight: "Light",
  themeDark: "Dark",
  legalPrivacy: "Privacy",
  legalTerms: "Terms",
};

// Legal documents live at /<locale>/privacy & /<locale>/terms (English at
// the root). The body is the English binding text, but the chrome and these
// menu labels are localized, so both the label and the href come from the
// active locale.
const LEGAL_LINKS = [
  { slug: "privacy", labelKey: "legalPrivacy" as const, track: "Header privacy", color: "rgb(47 128 250)" },
  { slug: "terms", labelKey: "legalTerms" as const, track: "Header terms", color: "rgb(47 128 250)" },
];

// The Export context menu is a single flat list — no section headings. Copy
// and download are offered side by side; each row dispatches a window event the
// shared editor listens for (a copy row via requestCopy, a download row via
// requestDownload). Rows are styled like PostHog's: a coloured leading icon on
// a tinted square. Labels come from the locale texts (see exportItemLabel).
type ExportItem = { key: string; action: "copy" | "download"; icon: React.ReactNode; color?: string };

const EXPORT_ITEMS: ExportItem[] = [
  { key: "mermaid", action: "copy", icon: <Copy className="h-4 w-4" />, color: "rgb(205 132 7)" },
  { key: "mermaid", action: "download", icon: <FileCode2 className="h-4 w-4" />, color: "rgb(205 132 7)" },
  { key: "md", action: "download", icon: <FileText className="h-4 w-4" />, color: "rgb(47 128 250)" },
  { key: "svg", action: "download", icon: <ImageIcon className="h-4 w-4" />, color: "rgb(16 185 129)" },
  { key: "png", action: "download", icon: <ImageIcon className="h-4 w-4" />, color: "rgb(245 158 11)" },
];

const legalLinkLabel = (t: TaskbarTexts, l: (typeof LEGAL_LINKS)[number]): string => t[l.labelKey];

const exportItemLabel = (t: TaskbarTexts, key: string, action: ExportItem["action"]): string => {
  if (key === "mermaid") return action === "copy" ? t.exportCopyMermaid : t.exportMermaidMmd;
  if (key === "md") return t.exportMd;
  if (key === "svg") return t.exportSvg;
  return t.exportPng;
};

// The theme picker lives under Settings → Theme: System follows the OS,
// Light/Dark force one side regardless of the OS (see lib/theme.ts). Labels
// come from the locale texts (see themeOptionLabel).
const THEME_OPTIONS: { key: ThemeChoice; icon: React.ReactNode }[] = [
  { key: "system", icon: <Monitor className="h-4 w-4" /> },
  { key: "light", icon: <Sun className="h-4 w-4" /> },
  { key: "dark", icon: <Moon className="h-4 w-4" /> },
];

const themeOptionLabel = (t: TaskbarTexts, key: ThemeChoice): string =>
  key === "system" ? t.themeSystem : key === "light" ? t.themeLight : t.themeDark;

// PostHog's floating glass "island" taskbar: a translucent capsule that floats
// over the wallpaper. Linked pages (Features → home, Guides → guides) plus a
// set of context-menu buttons (Documents / Export / Edit Code) that act on the
// shared editor underneath via window events.
export function Taskbar({
  homeHref = "/",
  locale = defaultLocale,
  texts = DEFAULT_TEXTS,
}: {
  homeHref?: string;
  locale?: Locale;
  texts?: TaskbarTexts;
}) {
  const links = [
    { href: homeHref, label: texts.features, key: "features" },
    { href: localePath(locale, "blog"), label: texts.blog, key: "blog" },
  ];

  // Which context menu is open (plus the mobile menu).
  const [openMenu, setOpenMenu] = useState<"export" | "docs" | "legal" | "languages" | "theme" | null>(null);
  // Mobile: the pill opens one context menu whose rows drill into second-level
  // menus. `menuOpen` shows the popover; `mobileSub` is the level shown
  // ("docs" | "export" | "theme" | "languages" | "legal") or null for the root list.
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSub, setMobileSub] = useState<"docs" | "export" | "theme" | "languages" | "legal" | null>(null);
  // The theme choice shown in the header's Theme menu, as an external store so
  // it stays in sync with lib/theme.ts without local state/effects.
  const subscribeThemes = useCallback((cb: () => void) => subscribeTheme(() => cb()), []);
  const theme = useSyncExternalStore(subscribeThemes, () => getThemeChoice(), () => "system");
  // Current pathname (with its locale prefix) — the language menu swaps the
  // prefix, keeping the visitor on the same page in every locale.
  const pathname = usePathname();

  // Materialise the stored/system theme on <html> (the resolved attribute is
  // what the CSS actually reads). Live updates come through subscribeThemes.
  useEffect(() => {
    applyResolvedTheme();
  }, []);

  // Keep the shared "taskbar menu open" flag in sync: while one is open, the
  // window's click-away must dismiss only the menu, not the scroll block.
  useEffect(() => {
    setTaskbarMenuOpen(openMenu != null);
    return () => setTaskbarMenuOpen(false);
  }, [openMenu]);

  // Close any open context menu on outside press / Escape. Presses INSIDE the
  // header are ignored: closing on the press-down would unmount the menu
  // before the browser dispatches `click` on the pressed row, silently eating
  // every menu item (languages, legal, theme, export…).
  useEffect(() => {
    if (!openMenu) return;
    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest?.("#top")) return;
      setOpenMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    // capture so the menu closes before the window's click-away handler runs,
    // and stopPropagation so the outside press never reaches the window.
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [openMenu]);

  const menuRef = useRef<HTMLDivElement>(null);

  // Close the mobile menu on outside press / Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      setMenuOpen(false);
      setMobileSub(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setMobileSub(null);
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // Builds a tool button + its optional context menu.
  const toolButton = (
    kind: "export" | "docs" | "legal" | "languages" | "theme",
    label: string,
  ) => {
    const onClick = () => {
      const next = openMenu === kind ? null : kind;
      setOpenMenu(next);
      analytics.track("Click", `Header ${kind}`);
    };
    return { kind, label, onClick };
  };

  const toolButtons = [
    toolButton("docs", texts.documents),
    toolButton("export", texts.export),
    toolButton("languages", texts.languages),
    toolButton("legal", texts.legal),
    toolButton("theme", texts.theme),
  ];

  const trigger = (btn: ReturnType<typeof toolButton>) => (
    <button
      type="button"
      onClick={btn.onClick}
      aria-expanded={openMenu === btn.kind}
      className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[13px] font-medium leading-none transition-colors hover:bg-accent data-[state=open]:bg-accent"
    >
      {btn.label}
      <ChevronDown className="h-3 w-3 opacity-60" />
    </button>
  );

  return (
    <header id="top" className="relative z-50 p-2 sm:p-2">
      <div className="taskbar-glass mx-auto flex h-10 w-full items-center justify-between gap-2 rounded-md px-2">
        {/* PostHog-style brand mark: only the small rounded "IQ" square, no text. */}
        <Link
          href={homeHref}
          className="shrink-0 rounded p-0.5 transition-colors hover:bg-accent"
          aria-label={texts.logo}
          onClick={() => {
            analytics.track("Click", "Header logo");
            requestContentOpen();
          }}
        >
          <LogoIcon className="h-6 w-6" />
        </Link>

        {/* Mobile: the site menu sits right next to the logo, as a pill
            that opens the same context menu the desktop bar uses — rows
            with their own items drill one level deeper inside it. */}
        <div className="flex items-center gap-1.5 sm:hidden">
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              aria-label={texts.menu}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => {
                analytics.track("Click", `Header menu ${menuOpen ? "close" : "open"}`);
                if (!menuOpen) setMobileSub(null);
                setMenuOpen((v) => !v);
              }}
              className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md px-2.5 text-[13px] font-semibold leading-none text-text transition-colors hover:bg-accent data-[state=open]:bg-accent"
            >
              <span className="whitespace-nowrap">{texts.menu}</span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-text/60 transition-transform ${menuOpen ? "rotate-180" : ""}`}
              />
            </button>

            {menuOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 max-h-[min(75vh,560px)] w-64 max-w-[calc(100vw-3.5rem)] overflow-y-auto rounded-lg border border-border bg-card p-1.5 shadow-xl">
                {mobileSub ? (
                  /* Second level: a back row plus that sub-menu's own rows. */
                  <div className="flex flex-col">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[13px] font-semibold leading-none text-text transition-colors hover:bg-accent"
                      onClick={() => setMobileSub(null)}
                    >
                      <ChevronLeft className="h-4 w-4 text-hint" />
                      <span>
                        {mobileSub === "docs"
                          ? texts.documents
                          : mobileSub === "export"
                            ? texts.export
                            : mobileSub === "theme"
                              ? texts.theme
                              : mobileSub === "languages"
                                ? texts.languages
                                : texts.legal}
                      </span>
                    </button>
                    <div className="my-1 border-t border-border/60" />
                    {mobileSub === "docs" && (
                      <div className="flex flex-col">
                        <button
                          type="button"
                          className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm font-medium leading-none transition-colors hover:bg-accent"
                          onClick={() => {
                            analytics.track("Click", "Mobile menu open documents");
                            requestOpenDocs();
                            setMenuOpen(false);
                            setMobileSub(null);
                          }}
                        >
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded" style={{ color: "rgb(47 128 250)", background: "rgb(47 128 250)1f" }}>
                            <FolderOpen className="h-4 w-4" />
                          </span>
                          <span className="flex-1">{texts.openDocuments}</span>
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm font-medium leading-none transition-colors hover:bg-accent"
                          onClick={() => {
                            analytics.track("Click", "Mobile menu new document");
                            requestNewDoc();
                            setMenuOpen(false);
                            setMobileSub(null);
                          }}
                        >
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded" style={{ color: "rgb(16 185 129)", background: "rgb(16 185 129)1f" }}>
                            <Plus className="h-4 w-4" />
                          </span>
                          <span className="flex-1">{texts.createNew}</span>
                        </button>
                      </div>
                    )}
                    {mobileSub === "export" && (
                      <div className="flex flex-col">
                        {EXPORT_ITEMS.map((opt) => (
                          <button
                            key={`${opt.action}-${opt.key}`}
                            type="button"
                            className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm font-medium leading-none transition-colors hover:bg-accent"
                            onClick={() => {
                              analytics.track("Click", `Mobile menu export ${opt.action}-${opt.key}`);
                              if (opt.action === "copy") requestCopy();
                              else requestDownload(opt.key);
                              setMenuOpen(false);
                              setMobileSub(null);
                            }}
                          >
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded" style={opt.color ? { color: opt.color, background: `${opt.color}1f` } : undefined}>
                              {opt.icon}
                            </span>
                            <span className="flex-1">{exportItemLabel(texts, opt.key, opt.action)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {mobileSub === "legal" && (
                      <div className="flex flex-col">
                        {LEGAL_LINKS.map((l) => (
                          <Link
                            key={l.slug}
                            href={localePath(locale, l.slug)}
                            className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm font-medium leading-none transition-colors hover:bg-accent"
                            onClick={() => {
                              analytics.track("Click", l.track);
                              setMenuOpen(false);
                              setMobileSub(null);
                            }}
                          >
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded" style={{ color: l.color, background: `${l.color}1f` }}>
                              <ShieldCheck className="h-4 w-4" />
                            </span>
                            <span className="flex-1">{legalLinkLabel(texts, l)}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                    {mobileSub === "languages" && (
                      <ul className="flex flex-col gap-0.5">
                        {locales.map((l) => {
                          const active = l === locale;
                          return (
                            <li key={l}>
                              {active ? (
                                <span
                                  aria-current="true"
                                  className="flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-[13px] font-semibold leading-tight text-text"
                                >
                                  <span className="min-w-0 flex-1 truncate">{LOCALE_NAMES[l] ?? l}</span>
                                  <span className="ml-auto h-1 w-1 shrink-0 rounded-full bg-button" aria-hidden="true" />
                                </span>
                              ) : (
                                <Link
                                  href={swapLocale(pathname, l)}
                                  prefetch={false}
                                  className="flex w-full items-center rounded-md px-2 py-1.5 text-[13px] leading-tight text-hint transition-colors hover:bg-accent hover:text-text"
                                  onClick={() => {
                                    analytics.track("Click", `Mobile language ${l}`);
                                    setMenuOpen(false);
                                    setMobileSub(null);
                                  }}
                                >
                                  <span className="min-w-0 flex-1 truncate">{LOCALE_NAMES[l] ?? l}</span>
                                </Link>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {mobileSub === "theme" && (
                      <div className="flex flex-col">
                        {THEME_OPTIONS.map((opt) => (
                          <button
                            key={opt.key}
                            type="button"
                            aria-pressed={theme === opt.key}
                            className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm font-medium leading-none transition-colors hover:bg-accent"
                            onClick={() => {
                              analytics.track("Click", `Mobile theme ${opt.key}`);
                              setThemeChoice(opt.key);
                              setMenuOpen(false);
                              setMobileSub(null);
                            }}
                          >
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-hint">{opt.icon}</span>
                            <span className="flex-1">{themeOptionLabel(texts, opt.key)}</span>
                            {theme === opt.key && (
                              <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-button" aria-hidden="true" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Root level: the page links plus every tool as a row;
                     rows with their own items drill into a second level. */
                  <div className="flex flex-col">

                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm font-medium leading-none text-text transition-colors hover:bg-accent"
                      onClick={() => setMobileSub("docs")}
                    >
                      <span>{texts.documents}</span>
                      <ChevronRight className="h-4 w-4 text-hint" />
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm font-medium leading-none text-text transition-colors hover:bg-accent"
                      onClick={() => setMobileSub("export")}
                    >
                      <span>{texts.export}</span>
                      <ChevronRight className="h-4 w-4 text-hint" />
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm font-medium leading-none text-text transition-colors hover:bg-accent"
                      onClick={() => setMobileSub("languages")}
                    >
                      <span>{texts.languages}</span>
                      <ChevronRight className="h-4 w-4 text-hint" />
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm font-medium leading-none text-text transition-colors hover:bg-accent"
                      onClick={() => setMobileSub("legal")}
                    >
                      <span>{texts.legal}</span>
                      <ChevronRight className="h-4 w-4 text-hint" />
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm font-medium leading-none text-text transition-colors hover:bg-accent"
                      onClick={() => setMobileSub("theme")}
                    >
                      <span>{texts.theme}</span>
                      <ChevronRight className="h-4 w-4 text-hint" />
                    </button>
                    {links.map((l) => (
                      <Link
                        key={l.key}
                        href={l.href}
                        className="flex w-full items-center rounded-md px-2 py-2 text-sm font-medium leading-none text-text transition-colors hover:bg-accent"
                        onClick={() => {
                          analytics.track("Click", `Mobile menu ${l.key}`);
                          requestContentOpen();
                          setMenuOpen(false);
                          setMobileSub(null);
                        }}
                      >
                        {l.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {/* Desktop row: the tool buttons first, the Features/Guides page
            links at the end. Hidden below `sm` — on a phone these would
            overflow the bar and push the mobile menu off-screen, so the
            mobile group carries an explicit "Open editor" action instead. */}
        <nav className="mr-auto hidden items-center gap-0.5 pl-2 text-[13px] font-medium leading-none sm:flex">
          {toolButtons.map((btn) => (
            <span key={btn.kind} className="relative">
              {trigger(btn)}
              {openMenu === btn.kind && (
                <div
                  className={`absolute left-0 top-full mt-1 rounded-lg border border-border bg-card p-1.5 shadow-xl ${
                    btn.kind === "languages" ? "w-64" : "w-[248px]"
                  }`}
                >
                  {btn.kind === "docs" && (
                    <div className="flex flex-col">
                      <button
                        type="button"
                        className="group flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] font-medium leading-none transition-colors hover:bg-accent"
                        onClick={() => {
                          analytics.track("Click", "Header docs open");
                          requestOpenDocs();
                          setOpenMenu(null);
                        }}
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded" style={{ color: "rgb(47 128 250)", background: "rgb(47 128 250)1f" }}>
                          <FolderOpen className="h-4 w-4" />
                        </span>
                        <span className="flex-1">{texts.openDocuments}</span>
                        <ChevronRight className="h-4 w-4 text-hint opacity-0 transition-opacity group-hover:opacity-100" />
                      </button>
                      <button
                        type="button"
                        className="group flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] font-medium leading-none transition-colors hover:bg-accent"
                        onClick={() => {
                          analytics.track("Click", "Header docs new");
                          requestNewDoc();
                          setOpenMenu(null);
                        }}
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded" style={{ color: "rgb(16 185 129)", background: "rgb(16 185 129)1f" }}>
                          <Plus className="h-4 w-4" />
                        </span>
                        <span className="flex-1">{texts.createNew}</span>
                      </button>
                    </div>
                  )}
                  {btn.kind === "export" && (
                    <div className="flex flex-col">
                      {EXPORT_ITEMS.map((opt) => (
                        <button
                          key={`${opt.action}-${opt.key}`}
                          type="button"
                          className="group flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] font-medium leading-none transition-colors hover:bg-accent"
                          onClick={() => {
                            analytics.track("Click", `Header export ${opt.action}-${opt.key}`);
                            if (opt.action === "copy") requestCopy();
                            else requestDownload(opt.key);
                            setOpenMenu(null);
                          }}
                        >
                          <span
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded"
                            style={opt.color ? { color: opt.color, background: `${opt.color}1f` } : undefined}
                          >
                            {opt.icon}
                          </span>
                          <span className="flex-1">{exportItemLabel(texts, opt.key, opt.action)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {btn.kind === "legal" && (
                    <div className="flex flex-col">
                      {LEGAL_LINKS.map((l) => (
                        <Link
                          key={l.slug}
                          href={localePath(locale, l.slug)}
                          className="group flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium leading-none transition-colors hover:bg-accent"
                          onClick={() => {
                            analytics.track("Click", l.track);
                            setOpenMenu(null);
                          }}
                        >
                          <span
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded"
                            style={{ color: l.color, background: `${l.color}1f` }}
                          >
                            <ShieldCheck className="h-4 w-4" />
                          </span>
                          <span className="flex-1">{legalLinkLabel(texts, l)}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                  {btn.kind === "languages" && (
                    <ul className="flex max-h-[min(70vh,440px)] w-full flex-col overflow-y-auto">
                      {locales.map((l) => {
                        const active = l === locale;
                        return (
                          <li key={l}>
                            <Link
                              href={swapLocale(pathname, l)}
                              prefetch={false}
                              aria-current={active ? "true" : undefined}
                              className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] leading-tight transition-colors hover:bg-accent ${
                                active ? "font-semibold text-text" : "text-hint"
                              }`}
                              onClick={() => {
                                analytics.track("Click", `Header language ${l}`);
                                setOpenMenu(null);
                              }}
                            >
                              <span className="min-w-0 flex-1 truncate">{LOCALE_NAMES[l] ?? l}</span>
                              {active && (
                                <span className="ml-auto h-1 w-1 shrink-0 rounded-full bg-button" aria-hidden="true" />
                              )}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {btn.kind === "theme" && (
                    <div className="flex flex-col">
                      {THEME_OPTIONS.map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          role="menuitemradio"
                          aria-checked={theme === opt.key}
                          className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] font-medium leading-none text-text transition-colors hover:bg-accent"
                          onClick={() => {
                            analytics.track("Click", `Header theme ${opt.key}`);
                            setThemeChoice(opt.key);
                            setOpenMenu(null);
                          }}
                        >
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-hint">{opt.icon}</span>
                          <span className="flex-1">{themeOptionLabel(texts, opt.key)}</span>
                          {theme === opt.key && (
                            <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-button" aria-hidden="true" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </span>
          ))}
          {links.map((l) => (
            <Link
              key={l.key}
              href={l.href}
              className="rounded py-1 pl-2 pr-2 transition-colors hover:bg-accent"
              onClick={() => {
                analytics.track("Click", `Header ${l.key}`);
                requestContentOpen();
              }}
            >
              {l.label}
            </Link>
          ))}

        </nav>

        {/* Mobile: "Open the editor" on the right — a touch taller than the
            header's IQ square (28px). The site menu is next to the logo. */}
        <div className="ml-auto flex items-center sm:hidden">
          <button
            type="button"
            className="inline-flex h-7 shrink-0 items-center rounded bg-button px-2.5 text-[13px] font-semibold leading-none text-button-text transition-all active:scale-[0.99]"
            onClick={() => {
              analytics.track("Click", "Mobile open editor");
              openEditor();
            }}
          >
            {texts.openEditor}
          </button>
        </div>
      </div>
    </header>
  );
}
