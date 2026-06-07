"use client";

import React from "react";
import { Tooltip } from "~/app/_components/Tooltip";

// ─── Stage multiplier table ────────────────────────────────────────────────────

const STAGE_MULTS: Record<number, string> = {
  [-6]: "×0.25",
  [-5]: "×0.29",
  [-4]: "×0.33",
  [-3]: "×0.40",
  [-2]: "×0.50",
  [-1]: "×0.67",
  [0]:  "×1.00",
  [1]:  "×1.50",
  [2]:  "×2.00",
  [3]:  "×2.50",
  [4]:  "×3.00",
  [5]:  "×3.50",
  [6]:  "×4.00",
};

function stageTooltip(label: string, stage: number) {
  const mult = STAGE_MULTS[stage] ?? "×1.00";
  const colour =
    stage > 0 ? "text-green-300" :
    stage < 0 ? "text-red-400"   : "text-zinc-400";

  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-semibold text-zinc-100">{label} Stage</span>
      <span>
        Current:{" "}
        <span className={`font-bold tabular-nums ${colour}`}>
          {stage > 0 ? `+${stage}` : stage} ({mult})
        </span>
      </span>
      <div className="mt-0.5 grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5 text-[10px] text-zinc-500">
        {([-6,-4,-2,0,2,4,6] as number[]).map(s => (
          <React.Fragment key={s}>
            <span className={s === stage ? "font-bold text-zinc-300" : ""}>{s > 0 ? `+${s}` : s}</span>
            <span className={s === stage ? "font-bold text-zinc-300" : ""}>{STAGE_MULTS[s]}</span>
          </React.Fragment>
        ))}
      </div>
      <span className="text-zinc-600 text-[10px]">Formula: (2 + stage) / 2 for +, 2 / (2 − stage) for −</span>
    </div>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

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
    stage < 0 ? "text-red-400"   :
                "text-zinc-400";
  const valueBg =
    stage > 0 ? "bg-green-900/25" :
    stage < 0 ? "bg-red-900/25"   : "";

  return (
    <div className={`flex items-center justify-between gap-2 transition-opacity ${isActive ? "opacity-100" : "opacity-35"}`}>
      <Tooltip content={stageTooltip(label, stage)} side="left">
        <span className={`cursor-default text-[11px] font-medium ${isActive ? "text-zinc-300" : "text-zinc-500"}`}>
          {label}
        </span>
      </Tooltip>
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

// ─── Panel ────────────────────────────────────────────────────────────────────

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
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

export function StatStagePanel({ stats, stages, activeKey, onChange, kbFocused, containerRef }: StatStagePanelProps) {
  return (
    <div
      ref={containerRef}
      tabIndex={containerRef ? 0 : undefined}
      className={`flex flex-col gap-2.5 rounded-xl border px-3 py-2.5 backdrop-blur-sm transition outline-none ${
        kbFocused
          ? "border-violet-500/60 bg-zinc-800/30 ring-1 ring-violet-500/20"
          : "border-zinc-700/40 bg-zinc-800/20"
      }`}
    >
      <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Stages</span>
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
