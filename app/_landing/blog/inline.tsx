import React from "react";
import Link from "next/link";
import { localePath } from "@/lib/locale-paths";

// Markdown-lite renderer for blog strings (see types.ts for the syntax).
// Links resolve per locale at render time, so translated JSON carries the SAME
// href tokens as the English master and can never point at a wrong-locale URL.

const LINK_RE = /\[([^\]]+)\]\(([^)\s]+)\)/g;
const TOKEN_RE = /(\*\*[^*]+\*\*|`[^`]+`)/g;

export function blogHref(locale: string, slug?: string): string {
  return localePath(locale, slug ? `blog/${slug}` : "blog");
}

function resolveHref(target: string, locale: string): string {
  if (target === "app:" || target.startsWith("app:")) return localePath(locale, "app");
  if (target.startsWith("blog:")) return blogHref(locale, target.slice(5));
  return target;
}

/** Bold and inline code inside a plain run of text. */
function renderTokens(text: string, keyBase: string): React.ReactNode[] {
  return text.split(TOKEN_RE).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${keyBase}-b${i}`} className="font-semibold text-text">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 1) {
      return (
        <code
          key={`${keyBase}-c${i}`}
          className="rounded bg-card px-1.5 py-0.5 font-mono text-[0.9em] text-text"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

/** Parse a blog string into React nodes: links first, tokens inside the rest. */
export function renderInline(text: string, locale: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(LINK_RE);
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(...renderTokens(text.slice(last, m.index), `t${last}`));
    const href = resolveHref(m[2], locale);
    const external = href.startsWith("http");
    nodes.push(
      external ? (
        <a
          key={`l${m.index}`}
          href={href}
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-text"
        >
          {m[1]}
        </a>
      ) : (
        <Link
          key={`l${m.index}`}
          href={href}
          prefetch={false}
          className="underline underline-offset-2 hover:text-text"
        >
          {m[1]}
        </Link>
      ),
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(...renderTokens(text.slice(last), `t${last}`));
  return nodes;
}

/** JSON-LD and meta descriptions want plain text — drop the markup. */
export function plain(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)\s]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
}
