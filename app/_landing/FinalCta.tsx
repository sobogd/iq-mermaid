// The closing block of the page: an h2 and one muted line, full width —
// no button, no box, nothing wrapping the text into a narrow column.
export function FinalCta({
  heading,
  headingAccent,
  sub,
}: {
  heading: string;
  headingAccent: string;
  sub: string;
}) {
  return (
    <div className="flex w-full flex-col gap-3">
      <h2 className="text-balance text-2xl font-semibold leading-[1.15] tracking-tight text-text sm:text-3xl">
        {heading} {headingAccent}
      </h2>
      <p className="text-pretty text-[15px] leading-relaxed text-text/75 sm:text-base">{sub}</p>
    </div>
  );
}
