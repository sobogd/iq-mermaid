import { Zap, Code2, Shapes, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CARD } from "./shell";
import type { StatCard } from "./types";

// Positional icons (index-matched to `statCards` in texts.json).
const ICONS: LucideIcon[] = [Zap, Code2, Shapes, Wallet];

export function StatCards({ items }: { items: StatCard[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
      {items.map(({ title, sub }, i) => {
        const Icon = ICONS[i] ?? Zap;
        return (
          <div key={title} className={`${CARD} flex flex-col gap-1.5 p-5 sm:p-6`}>
            <Icon className="mb-1 h-7 w-7 text-button" />
            <div className="font-semibold">{title}</div>
            <p className="text-sm text-hint">{sub}</p>
          </div>
        );
      })}
    </div>
  );
}
