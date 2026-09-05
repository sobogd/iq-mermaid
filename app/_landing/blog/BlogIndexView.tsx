import Link from "next/link";
import { DesktopShell } from "../desktop/DesktopShell";
import { Band } from "../shell";
import { PageTracker } from "../PageTracker";
import { localeHome } from "@/lib/locale-paths";
import type { Locale } from "@/lib/locales";
import type { SiteTexts } from "../types";
import { blogHref } from "./inline";
import { formatBlogDate, type BlogCardData } from "./registry";

// Blog index inside the desktop: h1 + intro, then the guides as one running
// list of plain links — no cards. Copy is the same as before.
export function BlogIndexView({
  locale,
  texts,
  cards,
}: {
  locale: Locale;
  texts: SiteTexts;
  cards: BlogCardData[];
}) {
  const blog = texts.blog;
  return (
    <main className="pointer-events-none relative">
      <DesktopShell
        locale={locale}
        homeHref={localeHome(locale)}
        headerTexts={texts.header}
      >
        <div className="flex flex-col">
          <Band section="blog-intro" className="px-6 pb-8 pt-8 sm:px-8 sm:pb-12 sm:pt-10">
            <div className="flex max-w-3xl flex-col items-start gap-3">
              <h1 className="text-3xl font-semibold leading-[1.15] tracking-tight text-text sm:text-4xl">
                {blog.title}
              </h1>
              <p className="text-[15px] leading-relaxed text-text/75 sm:text-base">{blog.intro}</p>
            </div>
          </Band>

          <Band section="blog-list" className="px-6 pb-16 sm:px-8 sm:pb-24">
            <ol className="flex w-full max-w-3xl flex-col gap-10 sm:gap-12">
              {cards.map(({ entry, title, excerpt }) => (
                <li key={entry.id}>
                  <article className="flex flex-col items-start gap-2">
                    <h2 className="text-xl font-semibold leading-snug tracking-tight text-text sm:text-2xl">
                      <Link
                        href={blogHref(locale, entry.id)}
                        prefetch={false}
                        className="underline-offset-4 transition-colors hover:underline hover:decoration-text/40"
                      >
                        {title}
                      </Link>
                    </h2>
                    <time
                      dateTime={entry.date}
                      className="text-xs font-medium uppercase tracking-wide text-hint"
                    >
                      {formatBlogDate(entry.date, locale)}
                    </time>
                    <p className="max-w-[62ch] text-[15px] leading-relaxed text-text/75">{excerpt}</p>
                    <Link
                      href={blogHref(locale, entry.id)}
                      prefetch={false}
                      className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-text underline decoration-text/30 underline-offset-4 transition-colors hover:decoration-text"
                    >
                      {blog.readMore} →
                    </Link>
                  </article>
                </li>
              ))}
            </ol>
          </Band>
        </div>
      </DesktopShell>
      <PageTracker page="Blog" />
    </main>
  );
}
