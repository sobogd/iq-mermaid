// Static picture of what the sample in Hero.tsx renders to. Hand-drawn SVG on
// purpose: rendering it with mermaid would put the whole mermaid runtime on
// every marketing page, and this shape never changes.
//
// Labels are English (Start / Ready? / Ship it / Fix it) in every locale
// because they are the sample source's node labels, shown verbatim next to it.
export function DiagramPreview({ className }: { className?: string }) {
  const box = "fill-[rgb(253_253_248)] stroke-[rgb(17_17_17)] dark:fill-[rgb(30_31_35)] dark:stroke-[rgb(250_250_250)]";
  const label = "fill-[rgb(17_17_17)] dark:fill-[rgb(250_250_250)]";
  const edge = "stroke-[rgb(101_103_94)] fill-none";
  const edgeLabel = "fill-[rgb(101_103_94)]";

  return (
    <svg
      viewBox="0 0 260 300"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Flowchart: Start, Ready?, Ship it, Fix it"
    >
      <g strokeWidth="1.5" fontFamily="ui-sans-serif, system-ui, sans-serif" fontSize="11">
        {/* Start */}
        <rect x="88" y="8" width="84" height="34" rx="6" className={box} />
        <text x="130" y="29" textAnchor="middle" className={label}>
          Start
        </text>

        {/* Ready? — diamond */}
        <path d="M130 66 L188 100 L130 134 L72 100 Z" className={box} />
        <text x="130" y="104" textAnchor="middle" className={label}>
          Ready?
        </text>

        {/* Ship it */}
        <rect x="10" y="176" width="84" height="34" rx="6" className={box} />
        <text x="52" y="197" textAnchor="middle" className={label}>
          Ship it
        </text>

        {/* Fix it */}
        <rect x="166" y="176" width="84" height="34" rx="6" className={box} />
        <text x="208" y="197" textAnchor="middle" className={label}>
          Fix it
        </text>

        <defs>
          <marker id="iqm-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0 0 L8 4 L0 8 z" className="fill-[hsl(30_8%_42%)]" />
          </marker>
        </defs>

        <path d="M130 42 L130 62" className={edge} markerEnd="url(#iqm-arrow)" />
        <path d="M104 120 L52 172" className={edge} markerEnd="url(#iqm-arrow)" />
        <path d="M156 120 L208 172" className={edge} markerEnd="url(#iqm-arrow)" />
        {/* Fix it -> Ready?, looping back around the right edge. */}
        <path d="M250 193 L256 193 L256 100 L190 100" className={edge} markerEnd="url(#iqm-arrow)" />

        <text x="70" y="150" textAnchor="middle" fontSize="10" className={edgeLabel}>
          Yes
        </text>
        <text x="192" y="150" textAnchor="middle" fontSize="10" className={edgeLabel}>
          No
        </text>
      </g>
    </svg>
  );
}
