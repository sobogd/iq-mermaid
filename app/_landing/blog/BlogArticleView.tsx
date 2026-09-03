import Link from "next/link";
import { Header } from "../Header";
import { Footer, productLinksFor } from "../Footer";
import { FinalCta } from "../FinalCta";
import { Breadcrumbs } from "../Breadcrumbs";
import { PageTracker } from "../PageTracker";
import { Container, Band, PAGE, PRIMARY_BTN } from "../shell";
import { localeHome, localePath } from "@/lib/locale-paths";
import type { Locale } from "@/lib/locales";
import type { SiteTexts } from "../types";
import type { BlogArticleContent, BlogBlock, BlogManifestEntry } from "./types";
import { blogHref, renderInline } from "./inline";
import { formatBlogDate, type BlogCardData } from "./registry";

function BlockView({ block, locale, appHref }: { block: BlogBlock; locale: string; appHref: string }) {
  switch (block.type) {
    case "h2":
      return (
        <h2 className="mb-4 mt-10 text-xl font-semibold tracking-tight sm:text-2xl">
          {renderInline(block.text, locale)}
        </h2>
      );
    case "h3":
      return (
        <h3 className="mb-3 mt-8 text-lg font-semibold">{renderInline(block.text, locale)}</h3>
      );
    case "p":
      return (
        <p className="mb-3 text-[15px] leading-relaxed text-text/80">
          {renderInline(block.text, locale)}
        </p>
      );
    case "list":
      return (
        <ul className="mb-3 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-text/80 marker:text-text/40">
          {block.items.map((it, i) => (
            <li key={i}>{renderInline(it, locale)}</li>
          ))}
        </ul>
      );
    case "steps":
      return (
        <ol className="mb-3 list-decimal space-y-1.5 pl-5 text-[15px] leading-relaxed text-text/80 marker:text-text/40">
          {block.items.map((it, i) => (
            <li key={i}>{renderInline(it, locale)}</li>
          ))}
        </ol>
      );
    case "code":
      return (
        <figure className="my-5">
          <pre className="overflow-x-auto rounded-xl border border-border bg-card p-4 font-mono text-[13px] leading-relaxed">
            <code>{block.code}</code>
          </pre>
          {block.caption && (
            <figcaption className="mt-2 text-xs text-hint">{block.caption}</figcaption>
          )}
        </figure>
      );
    case "table":
      return (
        <div className="my-5 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-border bg-card">
                {block.headers.map((h, i) => (
                  <th key={i} className="px-4 py-3 text-start font-semibold">
                    {renderInline(h, locale)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri} className="border-b border-border last:border-b-0">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-4 py-3 align-top text-text/80">
                      {renderInline(cell, locale)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "tip":
      return (
        <div className="my-4 rounded-xl border border-border bg-card px-4 py-3 text-[14px] leading-relaxed text-text/80">
          💡 {renderInline(block.text, locale)}
        </div>
      );
    case "note":
      return (
        <div className="my-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[14px] leading-relaxed text-text/80">
          {renderInline(block.text, locale)}
        </div>
      );
    case "cta":
      return (
        <div className="my-6 flex flex-col items-start gap-3 rounded-2xl border border-border bg-[hsl(28_48%_93%)] p-6 dark:bg-[hsl(28_15%_13%)]">
          <p className="text-lg font-semibold">{block.heading}</p>
          <p className="text-sm leading-relaxed text-hint/80">{renderInline(block.text, locale)}</p>
          <Link href={appHref} prefetch={false} className={PRIMARY_BTN}>
            {block.buttonLabel}
          </Link>
        </div>
      );
    case "faq":
      return (
        <div className="mt-10">
          <h2 className="mb-4 text-xl font-semibold tracking-tight sm:text-2xl">{block.heading}</h2>
          <div className="flex flex-col gap-3">
            {block.items.map((it, i) => (
              <div key={i} className="rounded-xl border border-border px-4 py-3">
                <p className="text-[15px] font-semibold">{it.q}</p>
                <p className="mt-1.5 text-[15px] leading-relaxed text-text/80">
                  {renderInline(it.a, locale)}
                </p>
              </div>
            ))}
          </div>
        </div>
      );
    default:
      return null;
  }
}

// Article page: header → article card (breadcrumb, date, h1, intro, blocks) →
// related articles → final CTA → footer.
export function BlogArticleView({
  locale,
  texts,
  entry,
  content,
  related,
}: {
  locale: Locale;
  texts: SiteTexts;
  entry: BlogManifestEntry;
  content: BlogArticleContent;
  related: BlogCardData[];
}) {
  const blog = texts.blog;
  const appHref = localePath(locale, "app");
  return (
    <main className={PAGE}>
      <Header homeHref={localeHome(locale)} locale={locale} texts={texts.header} />
      <Container>
        <Band section="blog-article">
          <article className="rounded-2xl border border-border p-6 sm:p-10">
            <div className="mx-auto max-w-[720px]">
              <Breadcrumbs
                homeHref={blogHref(locale)}
                homeLabel={blog.title}
                current={content.card.title}
              />
              <time
                dateTime={entry.date}
                className="mt-6 block text-xs font-medium uppercase tracking-wide text-hint/70"
              >
                {formatBlogDate(entry.date, locale)}
              </time>
              <h1 className="mt-2 text-2xl font-medium leading-[1.2] tracking-tight sm:text-[2rem]">
                {content.h1}
              </h1>
              <p className="mt-4 text-base leading-relaxed text-text/80">
                {renderInline(content.intro, locale)}
              </p>
              <div className="mt-6">
                {content.blocks.map((b, i) => (
                  <BlockView key={i} block={b} locale={locale} appHref={appHref} />
                ))}
              </div>
            </div>
          </article>
        </Band>

        {related.length > 0 && (
          <Band section="blog-related">
            <h2 className="mb-4 text-xl font-semibold tracking-tight">{blog.relatedHeading}</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {related.map(({ entry: rel, title, excerpt }) => (
                <Link
                  key={rel.id}
                  href={blogHref(locale, rel.id)}
                  prefetch={false}
                  className="group flex flex-col gap-2 rounded-2xl border border-border p-6 transition-colors hover:bg-card"
                >
                  <time
                    dateTime={rel.date}
                    className="text-xs font-medium uppercase tracking-wide text-hint/70"
                  >
                    {formatBlogDate(rel.date, locale)}
                  </time>
                  <h3 className="text-lg font-semibold leading-snug">{title}</h3>
                  <p className="text-sm leading-relaxed text-hint/80">{excerpt}</p>
                </Link>
              ))}
            </div>
          </Band>
        )}

        <Band section="blog-cta">
          <FinalCta
            heading={texts.finalCta.heading}
            headingAccent={texts.finalCta.headingAccent}
            sub={texts.finalCta.sub}
            ctaLabel={texts.finalCta.ctaLabel}
            ctaHref={appHref}
          />
        </Band>
      </Container>
      <Footer
        locale={locale}
        pathname={blogHref(locale, entry.id)}
        texts={texts.footer}
        productLinks={productLinksFor(locale, { editor: texts.header.openEditor, blog: texts.header.blog })}
      />
      <PageTracker page="Blog article" />
    </main>
  );
}
