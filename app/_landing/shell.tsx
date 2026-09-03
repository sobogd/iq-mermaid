export const NARROW = "max-w-[1000px] mx-auto px-4 sm:px-6";
export const PAGE = "relative flex flex-col gap-6";
export const CARD = "rounded-2xl border border-border";

export const BTN_BOX =
  "h-10 px-4 text-sm font-semibold rounded-lg whitespace-nowrap inline-flex items-center justify-center transition-all active:scale-[0.99]";

// Same brand gradient as iq-rest (app/_landing/components/shell.tsx there).
export const PRIMARY_FILL = "bg-gradient-to-br from-[hsl(9,100%,58%)] to-[hsl(35,95%,55%)] text-white";
export const PRIMARY_BTN = `${BTN_BOX} ${PRIMARY_FILL} hover:opacity-90`;
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
