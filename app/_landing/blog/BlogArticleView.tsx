import Link from "next/link";
import { DesktopShell } from "../desktop/DesktopShell";
import { OpenEditorButton } from "../desktop/OpenEditorButton";
import { FinalCta } from "../FinalCta";
import { Breadcrumbs } from "../Breadcrumbs";
import { PageTracker } from "../PageTracker";
import { Band, PRIMARY_BTN } from "../shell";
import { localeHome } from "@/lib/locale-paths";
import type { Locale } from "@/lib/locales";
import type { SiteTexts } from "../types";
import type { BlogArticleContent, BlogBlock, BlogManifestEntry } from "./types";
import { blogHref, renderInline } from "./inline";
import { formatBlogDate, type BlogCardData } from "./registry";

function BlockView({ block, locale }: { block: BlogBlock; locale: string }) {
  switch (block.type) {
    case "h2":
      return (
        <h2 className="mb-3 mt-10 text-xl font-semibold tracking-tight sm:text-2xl">
          {renderInline(block.text, locale)}
        </h2>
      );
    case "h3":
      return (
        <h3 className="mb-2 mt-8 text-lg font-semibold tracking-tight">
          {renderInline(block.text, locale)}
        </h3>
      );
    case "p":
      return (
        <p className="mb-4 text-[15px] leading-relaxed text-text/80 sm:text-base">
          {renderInline(block.text, locale)}
        </p>
      );
    case "list":
      return (
        <ul className="mb-4 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-text/80 marker:text-text/40 sm:text-base">
          {block.items.map((it, i) => (
            <li key={i}>{renderInline(it, locale)}</li>
          ))}
        </ul>
      );
    case "steps":
      return (
        <ol className="mb-4 list-decimal space-y-1.5 pl-5 text-[15px] leading-relaxed text-text/80 marker:text-text/40 sm:text-base">
          {block.items.map((it, i) => (
            <li key={i}>{renderInline(it, locale)}</li>
          ))}
        </ol>
      );
    case "code":
      return (
        <figure className="my-6">
          <pre className="overflow-x-auto font-mono text-[13px] leading-relaxed text-text/85">
            <code>{block.code}</code>
          </pre>
          {block.caption && (
            <figcaption className="mt-1.5 text-xs text-hint">{block.caption}</figcaption>
          )}
        </figure>
      );
    case "table":
      return (
        <div className="my-6 overflow-x-auto">
          <table className="w-full min-w-[480px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                {block.headers.map((h, i) => (
                  <th
                    key={i}
                    className="px-3 pb-2 text-start text-xs font-semibold tracking-wide text-hint first:pl-0 last:pr-0"
                  >
                    {renderInline(h, locale)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className="px-3 py-2 align-top text-text/80 first:pl-0 last:pr-0"
                    >
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
        <p className="my-4 flex gap-2.5 text-[15px] leading-relaxed text-text/80">
          <span aria-hidden="true">💡</span>
          <span>{renderInline(block.text, locale)}</span>
        </p>
      );
    case "note":
      return (
        <p className="mb-4 text-[15px] leading-relaxed text-text/80">
          {renderInline(block.text, locale)}
        </p>
      );
    case "cta":
      return (
        <div className="my-8 flex flex-col items-start gap-3">
          <p className="text-lg font-semibold tracking-tight">{block.heading}</p>
          <p className="max-w-[62ch] text-[15px] leading-relaxed text-text/75">
            {renderInline(block.text, locale)}
          </p>
          <OpenEditorButton track="Blog CTA" className={PRIMARY_BTN}>
            {block.buttonLabel}
          </OpenEditorButton>
        </div>
      );
    case "faq":
      return (
        <div className="mt-10 flex flex-col gap-6">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{block.heading}</h2>
          {block.items.map((it, i) => (
            <section key={i} className="flex flex-col gap-2">
              <h3 className="text-lg font-semibold tracking-tight">{renderInline(it.q, locale)}</h3>
              <p className="text-[15px] leading-relaxed text-text/75">
                {renderInline(it.a, locale)}
              </p>
            </section>
          ))}
        </div>
      );
    default:
      return null;
  }
}

// Article page: breadcrumbs + title + intro + the guide's blocks as one plain
// typographic column (no card), then the related guides and the closing CTA.
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
  return (
    <>
      <DesktopShell
        locale={locale}
        homeHref={localeHome(locale)}
        headerTexts={texts.header}
      >
        <div className="flex flex-col">
          <Band section="blog-article" className="px-6 pb-12 pt-8 sm:px-8 sm:pb-16 sm:pt-10">
            <article className="w-full max-w-[760px]">
              <Breadcrumbs
                homeHref={blogHref(locale)}
                homeLabel={blog.title}
                current={content.card.title}
              />
              <time
                dateTime={entry.date}
                className="mt-8 block text-xs font-medium uppercase tracking-wide text-hint"
              >
                {formatBlogDate(entry.date, locale)}
              </time>
              <h1 className="mt-2 text-balance text-3xl font-semibold leading-[1.15] tracking-tight text-text sm:text-4xl">
                {content.h1}
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-text/80">
                {renderInline(content.intro, locale)}
              </p>
              <div className="mt-2">
                {content.blocks.map((b, i) => (
                  <BlockView key={i} block={b} locale={locale} />
                ))}
              </div>
            </article>
          </Band>

          {related.length > 0 && (
            <Band section="blog-related" className="px-6 pb-12 sm:px-8 sm:pb-16">
              <div className="flex w-full max-w-[760px] flex-col gap-5">
                <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                  {blog.relatedHeading}
                </h2>
                <ol className="flex flex-col gap-7">
                  {related.map(({ entry: rel, title, excerpt }) => (
                    <li key={rel.id}>
                      <article className="flex flex-col items-start gap-1.5">
                        <h3 className="text-lg font-semibold leading-snug tracking-tight">
                          <Link
                            href={blogHref(locale, rel.id)}
                            prefetch={false}
                            className="underline-offset-4 transition-colors hover:underline hover:decoration-text/40"
                          >
                            {title}
                          </Link>
                        </h3>
                        <time
                          dateTime={rel.date}
                          className="text-xs font-medium uppercase tracking-wide text-hint"
                        >
                          {formatBlogDate(rel.date, locale)}
                        </time>
                        <p className="max-w-[62ch] text-[15px] leading-relaxed text-text/75">
                          {excerpt}
                        </p>
                      </article>
                    </li>
                  ))}
                </ol>
              </div>
            </Band>
          )}

          <Band section="blog-cta" className="px-6 pb-16 sm:px-8 sm:pb-24">
            <FinalCta
              heading={texts.finalCta.heading}
              headingAccent={texts.finalCta.headingAccent}
              sub={texts.finalCta.sub}
            />
          </Band>
        </div>
      </DesktopShell>
      <PageTracker page="Blog article" />
    </>
  );
}
