"use client";

interface StatStageRowProps {
  label: string;
  statKey: string;
  stage: number;
  isActive: boolean;
  onChange: (key: string, value: number) => void;
}

function StatStageRow({ label, statKey, stage, isActive, onChange }: StatStageRowProps) {
  const valueColour =
    stage > 0 ? "text-green-400" :
    stage < 0 ? "text-red-400" :
                "text-zinc-600";
  const valueBg =
    stage > 0 ? "bg-green-900/25" :
    stage < 0 ? "bg-red-900/25" :
                "";

  return (
    <div className={`flex items-center justify-between gap-2 transition-opacity ${isActive ? "opacity-100" : "opacity-35"}`}>
      <span className={`text-[11px] font-medium ${isActive ? "text-zinc-300" : "text-zinc-500"}`}>
        {label}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(statKey, Math.max(-6, stage - 1))}
          disabled={stage <= -6}
          className="flex h-5 w-5 items-center justify-center rounded-md bg-zinc-800 text-sm leading-none text-zinc-400 transition hover:bg-zinc-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
          aria-label={`Decrease ${label} stage`}
        >
          −
        </button>
        <span className={`w-7 rounded-md py-0.5 text-center text-[11px] font-bold tabular-nums ${valueColour} ${valueBg}`}>
          {stage > 0 ? `+${stage}` : stage}
        </span>
        <button
          onClick={() => onChange(statKey, Math.min(6, stage + 1))}
          disabled={stage >= 6}
          className="flex h-5 w-5 items-center justify-center rounded-md bg-zinc-800 text-sm leading-none text-zinc-400 transition hover:bg-zinc-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
          aria-label={`Increase ${label} stage`}
        >
          +
        </button>
      </div>
    </div>
  );
}

interface StatStat {
  key: string;
  label: string;
}

interface StatStagePanelProps {
  stats: StatStat[];
  stages: Record<string, number>;
  activeKey?: string;
  onChange: (key: string, value: number) => void;
  kbFocused?: boolean;
}

export function StatStagePanel({ stats, stages, activeKey, onChange, kbFocused }: StatStagePanelProps) {
  return (
    <div className={`flex flex-col gap-2.5 rounded-xl border px-3 py-2.5 backdrop-blur-sm transition ${
      kbFocused
        ? "border-violet-500/60 bg-zinc-800/30 ring-1 ring-violet-500/20"
        : "border-zinc-700/40 bg-zinc-800/20"
    }`}>
      <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Stages</span>
      {stats.map(({ key, label }) => (
        <StatStageRow
          key={key}
          label={label}
          statKey={key}
          stage={stages[key] ?? 0}
          isActive={key === activeKey}
          onChange={onChange}
        />
      ))}
    </div>
  );
}
