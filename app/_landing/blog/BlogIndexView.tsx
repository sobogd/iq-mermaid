import Link from "next/link";
import { Header } from "../Header";
import { Footer, productLinksFor } from "../Footer";
import { Container, Band, PAGE } from "../shell";
import { localeHome, localePath } from "@/lib/locale-paths";
import type { Locale } from "@/lib/locales";
import type { SiteTexts } from "../types";
import { blogHref } from "./inline";
import { formatBlogDate, type BlogCardData } from "./registry";

// Blog index: header → title band → 2-per-row card grid (newest first) →
// footer. Same page shell as the home page; cards reuse the landing card skin.
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
    <main className={PAGE}>
      <Header homeHref={localeHome(locale)} locale={locale} texts={texts.header} />
      <Container>
        <Band section="blog-intro">
          <h1 className="text-3xl font-medium leading-[1.15] tracking-tight sm:text-4xl">{blog.title}</h1>
          <p className="mt-3 max-w-[640px] text-sm leading-relaxed text-hint/80 sm:text-base">
            {blog.intro}
          </p>
        </Band>

        <Band section="blog-list" className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {cards.map(({ entry, title, excerpt }) => (
            <Link
              key={entry.id}
              href={blogHref(locale, entry.id)}
              prefetch={false}
              className="group flex flex-col gap-3 rounded-2xl border border-border p-6 transition-colors hover:bg-card"
            >
              <time
                dateTime={entry.date}
                className="text-xs font-medium uppercase tracking-wide text-hint/70"
              >
                {formatBlogDate(entry.date, locale)}
              </time>
              <h2 className="text-lg font-semibold leading-snug sm:text-xl">{title}</h2>
              <p className="text-sm leading-relaxed text-hint/80">{excerpt}</p>
              <span className="mt-auto pt-1 text-sm font-semibold underline-offset-2 group-hover:underline">
                {blog.readMore} →
              </span>
            </Link>
          ))}
        </Band>
      </Container>
      <Footer
        locale={locale}
        pathname={localePath(locale, "blog")}
        texts={texts.footer}
        productLinks={productLinksFor(locale, { editor: texts.header.openEditor, blog: texts.header.blog })}
      />
    </main>
  );
}
