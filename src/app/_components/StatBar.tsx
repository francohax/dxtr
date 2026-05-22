interface StatBarProps {
  label: string;
  value: number;
  max?: number;
}

const STAT_COLOURS: Record<string, string> = {
  hp:       "bg-red-400",
  atk:      "bg-orange-400",
  def:      "bg-yellow-400",
  "sp.atk": "bg-blue-400",
  "sp.def": "bg-green-400",
  speed:    "bg-pink-400",
};

export function StatBar({ label, value, max = 255 }: StatBarProps) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const colour = STAT_COLOURS[label.toLowerCase()] ?? "bg-zinc-400";
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-right text-xs font-medium uppercase text-zinc-400">
        {label}
      </span>
      <span className="w-8 shrink-0 text-right text-xs tabular-nums text-zinc-300">
        {value}
      </span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colour}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
