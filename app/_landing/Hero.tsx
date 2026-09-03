import Link from "next/link";
import { CARD, OUTLINE_BTN, PRIMARY_BTN } from "./shell";
import { DiagramPreview } from "./DiagramPreview";

export type HeroTexts = {
  badgeFree: string;
  badgeNoSignup: string;
  badgeDiagrams: string;
  title: string;
  titleAccent: string;
  description: string;
  ctaOpen: string;
  ctaLearn: string;
  mockCodeLabel: string;
  mockDiagramLabel: string;
};

// The mermaid source shown next to the preview. Deliberately not localized:
// mermaid keywords are the same in every language, and a translated `flowchart
// TD` would be teaching the wrong thing.
const SAMPLE = `flowchart TD
  A[Start] --> B{Ready?}
  B -->|Yes| C[Ship it]
  B -->|No| D[Fix it]
  D --> B`;

const BADGE = "rounded-full border border-border px-3 py-1 text-xs font-semibold text-hint";

// Same card-as-hero treatment as iq-rest's landing: one bordered block, copy
// on the left, a live-looking product still on the right. The preview is a
// hand-drawn SVG rather than a mermaid render — the marketing pages must not
// pull the ~500 kB mermaid bundle just to show one diagram.
export function Hero({ texts, appHref }: { texts: HeroTexts; appHref: string }) {
  return (
    <div className={`${CARD} grid grid-cols-1 gap-8 p-6 sm:p-8 lg:grid-cols-[5fr_6fr] lg:items-center`}>
      <div className="flex flex-col items-start gap-4">
        <div className="flex flex-wrap gap-2">
          <span className={BADGE}>{texts.badgeFree}</span>
          <span className={BADGE}>{texts.badgeNoSignup}</span>
          <span className={BADGE}>{texts.badgeDiagrams}</span>
        </div>
        <h1 className="text-3xl font-medium leading-[1.1] tracking-tight sm:text-[2.5rem]">
          {texts.title}{" "}
          <span className="bg-gradient-to-br from-[hsl(9,100%,58%)] to-[hsl(35,95%,55%)] bg-clip-text text-transparent">
            {texts.titleAccent}
          </span>
        </h1>
        <p className="text-sm leading-relaxed text-hint/80 sm:text-base">{texts.description}</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <Link href={appHref} className={PRIMARY_BTN}>
            {texts.ctaOpen}
          </Link>
          <Link href="#features" className={OUTLINE_BTN}>
            {texts.ctaLearn}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <figure className="flex flex-col gap-2">
          <figcaption className="text-xs font-semibold uppercase tracking-wide text-hint">
            {texts.mockCodeLabel}
          </figcaption>
          <pre className="overflow-x-auto rounded-xl border border-border bg-card p-4 font-mono text-[12px] leading-relaxed text-text">
            <code>{SAMPLE}</code>
          </pre>
        </figure>
        <figure className="flex flex-col gap-2">
          <figcaption className="text-xs font-semibold uppercase tracking-wide text-hint">
            {texts.mockDiagramLabel}
          </figcaption>
          <div className="flex flex-1 items-center justify-center rounded-xl border border-border bg-card p-4">
            <DiagramPreview className="h-auto w-full max-w-[260px]" />
          </div>
        </figure>
      </div>
    </div>
  );
}
