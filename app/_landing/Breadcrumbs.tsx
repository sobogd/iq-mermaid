import Link from "next/link";

// Visible breadcrumb trail on blog articles, mirroring the trail the page's
// BreadcrumbList JSON-LD describes (see lib/structured-data.ts), so the two
// cannot drift. Rendered above the article title.
export function Breadcrumbs({
  homeHref,
  homeLabel,
  current,
}: {
  homeHref: string;
  homeLabel: string;
  current: string;
}) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2 text-sm text-hint">
        <li>
          <Link href={homeHref} className="transition-colors hover:text-text">
            {homeLabel}
          </Link>
        </li>
        {/* Separator is decorative — the list structure already carries the
            hierarchy for assistive tech. */}
        <li aria-hidden="true" className="text-hint/50">
          /
        </li>
        <li aria-current="page" className="font-medium text-text">
          {current}
        </li>
      </ol>
    </nav>
  );
}
