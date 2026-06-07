interface StatBarProps {
  label: string;
  value: number;
  max?: number;
}

const STAT_GRADIENT: Record<string, { fill: string; glow: string }> = {
  hp:       { fill: "linear-gradient(to right, #fca5a5, #f87171)", glow: "rgba(248,113,113,0.45)" },
  atk:      { fill: "linear-gradient(to right, #fdba74, #fb923c)", glow: "rgba(251,146,60,0.45)"  },
  def:      { fill: "linear-gradient(to right, #fde047, #facc15)", glow: "rgba(250,204,21,0.4)"   },
  "sp.atk": { fill: "linear-gradient(to right, #93c5fd, #60a5fa)", glow: "rgba(96,165,250,0.45)"  },
  "sp.def": { fill: "linear-gradient(to right, #86efac, #4ade80)", glow: "rgba(74,222,128,0.4)"   },
  speed:    { fill: "linear-gradient(to right, #f9a8d4, #f472b6)", glow: "rgba(244,114,182,0.45)" },
};

const DEFAULT_FILL = { fill: "linear-gradient(to right, #a1a1aa, #71717a)", glow: "rgba(113,113,122,0.3)" };

export function StatBar({ label, value, max = 255 }: StatBarProps) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const { fill, glow } = STAT_GRADIENT[label.toLowerCase()] ?? DEFAULT_FILL;

  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-right text-xs font-medium uppercase text-zinc-400">
        {label}
      </span>
      <span className="w-8 shrink-0 text-right text-xs tabular-nums text-zinc-300">
        {value}
      </span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: fill,
            boxShadow: `0 0 8px ${glow}`,
          }}
        />
      </div>
    </div>
  );
}
