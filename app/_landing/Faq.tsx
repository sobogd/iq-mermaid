export type FaqItem = { q: string; a: string };

// FAQ as one full-width column of type: the heading block on top, then every
// question and its answer beneath it. No sticky side column, no grid.
export function Faq({
  heading,
  headingAccent,
  sub,
  items,
}: {
  heading: string;
  headingAccent: string;
  sub: string;
  items: FaqItem[];
}) {
  return (
    <div className="flex flex-col gap-y-12">
      <div className="flex flex-col items-start gap-3">
        <h2 className="text-2xl font-semibold leading-[1.15] tracking-tight text-text sm:text-3xl">
          {heading} {headingAccent}
        </h2>
        <p className="max-w-[62ch] text-[15px] leading-relaxed text-text/75">{sub}</p>
      </div>

      <div className="flex flex-col gap-y-8">
        {items.map((item) => (
          <section key={item.q} className="flex flex-col gap-2">
            <h3 className="text-lg font-semibold leading-snug tracking-tight text-text">{item.q}</h3>
            <p className="text-[15px] leading-relaxed text-text/75">{item.a}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
