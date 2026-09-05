import { PRIMARY_BTN } from "./shell";
import { OpenEditorButton } from "./desktop/OpenEditorButton";

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

// Home hero: pure type — headline, one paragraph, the single "Open editor"
// action. No cards, no previews. Copy is mermaid; geometry is PostHog's.
export function Hero({ texts }: { texts: HeroTexts }) {
  return (
    <div className="flex max-w-2xl flex-col items-start gap-5">
      <h1 className="text-balance text-3xl font-semibold leading-[1.1] tracking-tight text-text sm:text-4xl">
        {texts.title} {texts.titleAccent}
      </h1>
      <p className="text-pretty text-[17px] leading-relaxed text-text/80 sm:text-lg">{texts.description}</p>
      <OpenEditorButton track="Hero open editor" className={PRIMARY_BTN}>
        {texts.ctaOpen}
      </OpenEditorButton>
    </div>
  );
}
