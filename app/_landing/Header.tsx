"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { NARROW, PRIMARY_BTN } from "./shell";
import { LogoIcon } from "./LogoIcon";
import { localePath } from "@/lib/locale-paths";
import { lockScroll } from "@/lib/scroll-lock";
import { defaultLocale, type Locale } from "@/lib/locales";
import { analytics } from "@/lib/analytics";

export type HeaderTexts = {
  logo: string;
  features: string;
  blog: string;
  faq: string;
  openEditor: string;
  menu: string;
};

const DEFAULT_TEXTS: HeaderTexts = {
  logo: "Mermaid",
  features: "Features",
  blog: "Blog",
  faq: "FAQ",
  openEditor: "Open editor",
  menu: "Menu",
};

// Same bar as iq-rest's landing header (sticky, blurred, one primary CTA on
// the right) scaled down to this site's three links. No account controls and
// no quota badge: the editor is free and has no sign-in.
export function Header({
  homeHref = "/",
  locale = defaultLocale,
  texts = DEFAULT_TEXTS,
}: {
  homeHref?: string;
  locale?: Locale;
  texts?: HeaderTexts;
}) {
  const appHref = localePath(locale, "app");
  // `key` is the locale-stable analytics label; `label` is the translated
  // text shown to the visitor — names must not vary by language, or one
  // funnel becomes thirty.
  const links = [
    { href: `${homeHref}#features`, label: texts.features, key: "features" },
    { href: localePath(locale, "blog"), label: texts.blog, key: "blog" },
    { href: `${homeHref}#faq`, label: texts.faq, key: "faq" },
  ];

  const [menuOpen, setMenuOpen] = useState(false);
  // Lock page scroll while the panel is open — swipes inside the panel then
  // scroll the panel only, never the page behind it.
  useEffect(() => {
    if (!menuOpen) return;
    return lockScroll();
  }, [menuOpen]);

  const menuRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // The slide-in panel is portaled to <body>: the header's backdrop-blur makes
  // it the containing block for fixed descendants, which would pin the panel
  // inside the bar instead of the viewport.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      if (panelRef.current?.contains(e.target as Node)) return;
      setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <header id="top" className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur-md">
      <div className={`${NARROW} flex h-14 items-center justify-between gap-3 sm:h-16`}>
        <Link
          href={homeHref}
          className="flex shrink-0 items-center gap-1.5 text-lg font-semibold tracking-tight sm:text-xl"
          onClick={() => analytics.track("Click", "Header logo")}
        >
          <LogoIcon className="h-7 w-7 sm:h-8 sm:w-8" />
          {texts.logo}
        </Link>
        <nav className="mr-auto hidden items-center gap-6 pl-8 text-sm font-semibold sm:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="transition-opacity hover:opacity-70"
              onClick={() => analytics.track("Click", `Header ${l.key}`)}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <Link
          href={appHref}
          className={`hidden shrink-0 sm:inline-flex ${PRIMARY_BTN}`}
          onClick={() => analytics.track("Click", "Header open editor")}
        >
          {texts.openEditor}
        </Link>
        <div className="flex min-w-0 items-center gap-2 sm:hidden">
          <Link
            href={appHref}
            className={`${PRIMARY_BTN} h-9 px-3`}
            onClick={() => analytics.track("Click", "Header open editor")}
          >
            {texts.openEditor}
          </Link>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              aria-label={texts.menu}
              aria-expanded={menuOpen}
              onClick={() => {
                analytics.track("Click", `Header menu ${menuOpen ? "close" : "open"}`);
                setMenuOpen((v) => !v);
              }}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-transparent text-text transition-all hover:bg-card active:scale-[0.99]"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            {mounted &&
              createPortal(
                <div className="sm:hidden">
                  <div
                    className={`fixed inset-x-0 bottom-0 top-14 z-40 bg-black/30 transition-opacity duration-200 ${
                      menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
                    }`}
                    onClick={() => setMenuOpen(false)}
                  />
                  <div
                    ref={panelRef}
                    className={`fixed bottom-0 right-0 top-14 z-50 flex w-72 max-w-[85vw] flex-col border-l border-border bg-bg p-3 shadow-xl transition-transform duration-200 ${
                      menuOpen ? "translate-x-0" : "translate-x-full"
                    }`}
                  >
                    <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain">
                      {links.map((l) => (
                        <Link
                          key={l.href}
                          href={l.href}
                          className="rounded-lg px-3 py-2 text-sm font-semibold transition-opacity hover:opacity-70"
                          onClick={() => {
                            analytics.track("Click", `Mobile menu ${l.key}`);
                            setMenuOpen(false);
                          }}
                        >
                          {l.label}
                        </Link>
                      ))}
                    </div>
                    <div className="shrink-0 border-t border-border pt-3">
                      <Link
                        href={appHref}
                        className={`${PRIMARY_BTN} w-full`}
                        onClick={() => {
                          analytics.track("Click", "Mobile menu open editor");
                          setMenuOpen(false);
                        }}
                      >
                        {texts.openEditor}
                      </Link>
                    </div>
                  </div>
                </div>,
                document.body,
              )}
          </div>
        </div>
      </div>
    </header>
  );
}
