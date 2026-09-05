// Layout + button tokens for the PostHog-style desktop landing.
//
// The whole site lives inside a glass AppWindow, so "cards" are translucent
// white-on-glass (PostHog surfaces content as `bg-white/xx backdrop-blur`
// panels rather than opaque boxes) and CTAs use the IQ-Mermaid orange.
export const NARROW = "max-w-[960px] mx-auto px-4 sm:px-6";
export const PAGE = "relative flex flex-col gap-6";
export const CARD = "rounded-lg border border-border/70 bg-card backdrop-blur-xl";

export const BTN_BOX =
  "h-10 px-4 text-sm font-semibold rounded-md whitespace-nowrap inline-flex items-center justify-center transition-all active:scale-[0.99]";

// Accent CTA: solid red `#d9534f` fill with white text.
export const PRIMARY_FILL = "bg-button text-button-text";
export const PRIMARY_BTN = `${BTN_BOX} ${PRIMARY_FILL} hover:brightness-95`;
export const OUTLINE_BTN = `${BTN_BOX} border border-border text-text bg-transparent hover:bg-card`;

export function Container({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`w-full`}>
      <div className={`${NARROW} flex flex-col gap-6 ${className}`}>{children}</div>
    </div>
  );
}

export function Band({
  id,
  section,
  className = "",
  children,
}: {
  id?: string;
  /** Stable name of the band, kept as a data attribute so a section can be
   *  referred to without relying on `id` (an anchor target, not always set). */
  section?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} data-section={section} className={className}>
      {children}
    </section>
  );
}
