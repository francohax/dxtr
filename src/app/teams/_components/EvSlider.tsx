"use client";

const STAT_SLIDER_COLORS: Record<string, string> = {
  hp:        "#f87171",
  attack:    "#fb923c",
  defense:   "#facc15",
  spAttack:  "#60a5fa",
  spDefense: "#4ade80",
  speed:     "#f472b6",
};

interface EvSliderProps {
  statKey: string;
  label: string;
  value: number;
  max: number;
  remaining: number;
  onChange: (value: number) => void;
}

export function EvSlider({ statKey, label, value, max, remaining: _remaining, onChange }: EvSliderProps) {
  const color = STAT_SLIDER_COLORS[statKey] ?? "#8b5cf6";
  const fillPct = Math.round((value / 252) * 100);
  const cappedMax = Math.min(max, 252);

  function handleSlider(raw: number) {
    const clamped = Math.min(raw, cappedMax);
    onChange(clamped);
  }

  function handleInput(raw: string) {
    const parsed = parseInt(raw);
    if (isNaN(parsed)) return;
    const clamped = Math.min(252, Math.max(0, parsed));
    const effective = Math.min(clamped, cappedMax);
    onChange(effective);
  }

  return (
    <div className="grid grid-cols-[2.5rem_1fr_3rem] items-center gap-2">
      <span className="text-right text-xs font-mono text-zinc-500">{label}</span>
      <input
        type="range"
        min={0}
        max={252}
        value={value}
        onChange={e => handleSlider(parseInt(e.target.value))}
        className="ev-slider"
        style={{
          "--slider-color": color,
          background: `linear-gradient(to right, ${color} 0%, ${color} ${fillPct}%, rgb(39 39 42) ${fillPct}%, rgb(39 39 42) 100%)`,
        } as React.CSSProperties}
      />
      <input
        type="number"
        min={0}
        max={252}
        value={value}
        onChange={e => handleInput(e.target.value)}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-1.5 py-0.5 text-center text-xs text-white outline-none focus:border-violet-500 [appearance:textfield]"
      />
    </div>
  );
}
