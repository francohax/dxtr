"use client";

import React from "react";
import { type BattleConfig, type Weather, type Terrain } from "~/lib/types";

// ─── Pill definitions (no "none" — clicking active deselects) ─────────────────

const WEATHER_OPTIONS: { value: Weather; label: string; activeClass: string }[] = [
  { value: "sun", label: "Harsh Sun", activeClass: "border-orange-500/80 bg-orange-900/50 text-orange-200" },
  { value: "rain", label: "Rain", activeClass: "border-blue-500/80   bg-blue-900/50   text-blue-200" },
  { value: "sandstorm", label: "Sandstorm", activeClass: "border-amber-500/80  bg-amber-900/50  text-amber-200" },
  { value: "hail", label: "Hail", activeClass: "border-cyan-500/80   bg-cyan-900/50   text-cyan-200" },
];

const TERRAIN_OPTIONS: { value: Terrain; label: string; activeClass: string }[] = [
  { value: "electric", label: "Electric", activeClass: "border-yellow-500/80 bg-yellow-900/50 text-yellow-200" },
  { value: "grassy", label: "Grassy", activeClass: "border-green-500/80  bg-green-900/50  text-green-200" },
  { value: "psychic", label: "Psychic", activeClass: "border-purple-500/80 bg-purple-900/50 text-purple-200" },
  { value: "misty", label: "Misty", activeClass: "border-pink-500/80   bg-pink-900/50   text-pink-200" },
];

const PILL_INACTIVE = "border-zinc-800 bg-zinc-900/60 text-zinc-600 hover:border-zinc-700 hover:text-zinc-400";

// ─── 2×2 pill grid ────────────────────────────────────────────────────────────

interface PillGridProps<T extends string> {
  label: string;
  options: { value: T; label: string; activeClass: string }[];
  selected: T | "none";
  onSelect: (value: T | "none") => void;
}

function PillGrid<T extends string>({ label, options, selected, onSelect }: PillGridProps<T>) {
  return (
    <div className="flex flex-1 flex-col gap-1.5">
      <span className="text-xs font-medium text-zinc-500">{label}</span>
      <div className="grid grid-cols-2 gap-1.5">
        {options.map(o => (
          <button
            key={o.value}
            onClick={() => onSelect(o.value === selected ? "none" : o.value)}
            aria-pressed={o.value === selected}
            className={`rounded-lg border px-2 py-1.5 text-center text-[11px] font-medium leading-tight transition ${o.value === selected ? o.activeClass : PILL_INACTIVE
              }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Toggle button ────────────────────────────────────────────────────────────

interface ToggleButtonProps {
  label: string;
  active: boolean;
  onToggle: () => void;
  activeClass: string;
  icon: React.ReactNode;
  activeLabel: string;
  inactiveLabel: string;
}

function ToggleButton({ label, active, onToggle, activeClass, icon, activeLabel, inactiveLabel }: ToggleButtonProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-zinc-500">{label}</span>
      <button
        role="switch"
        aria-checked={active}
        onClick={onToggle}
        className={`flex h-[34px] items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition ${active
          ? activeClass
          : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
          }`}
      >
        {icon}
        <span>{active ? activeLabel : inactiveLabel}</span>
      </button>
    </div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

interface BattleConfigPanelProps {
  config: BattleConfig;
  onChange: (config: BattleConfig) => void;
  levelInputRef?: React.RefObject<HTMLInputElement | null>;
}

export function BattleConfigPanel({ config, onChange, levelInputRef }: BattleConfigPanelProps) {
  function update<K extends keyof BattleConfig>(key: K, value: BattleConfig[K]) {
    onChange({ ...config, [key]: value });
  }

  const hasActive = config.weather !== "none" || config.terrain !== "none" || config.isCritical || config.attackerBurned;

  return (
    <div className="glass-card p-4">
      <span className="mb-3 block text-[11px] font-semibold uppercase tracking-widest text-zinc-600">
        Battle Config
      </span>

      <div className="flex flex-col gap-3">

        {/* Weather + Terrain grids side by side */}
        <div className="flex gap-4">
          <PillGrid
            label="Weather"
            options={WEATHER_OPTIONS}
            selected={config.weather}
            onSelect={v => update("weather", v as Weather)}
          />
          <PillGrid
            label="Terrain"
            options={TERRAIN_OPTIONS}
            selected={config.terrain}
            onSelect={v => update("terrain", v as Terrain)}
          />
        </div>

        {/* Level + toggles */}
        <div className="flex gap-2 w-full">
          <div className="w-full md:w-1/2 flex items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-zinc-500">Level</span>
              <input
                ref={levelInputRef}
                type="number"
                min={1}
                max={100}
                value={config.level}
                onChange={e => {
                  const v = Math.max(1, Math.min(100, Number(e.target.value) || 50));
                  update("level", v);
                }}
                className="w-16 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-center text-sm text-white outline-none transition hover:border-zinc-600 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>

            <ToggleButton
              label="Critical Hit"
              active={config.isCritical}
              onToggle={() => update("isCritical", !config.isCritical)}
              activeClass="border-yellow-600/60 bg-yellow-900/30 text-yellow-300"
              icon={
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              }
              activeLabel="Crit"
              inactiveLabel="Crit"
            />

            <ToggleButton
              label="Burn"
              active={config.attackerBurned}
              onToggle={() => update("attackerBurned", !config.attackerBurned)}
              activeClass="border-orange-600/60 bg-orange-900/30 text-orange-300"
              icon={
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                </svg>
              }
              activeLabel="Burned"
              inactiveLabel="Burned"
            />
          </div>

          {/* Active modifier effect hints */}
          {hasActive && (
            <div className="w-full h-15 px-2 mt-3 flex flex-wrap gap-0.5">
              {config.weather !== "none" && (
                <span className="h-5 rounded-lg bg-blue-950/50 px-2 py-0.5 text-xs font-medium text-blue-300 ring-1 ring-blue-800/50">
                  {config.weather === "sun" ? "Fire ×1.5 · Water ×0.5" :
                    config.weather === "rain" ? "Water ×1.5 · Fire ×0.5" :
                      config.weather}
                </span>
              )}
              {config.terrain !== "none" && (
                <span className="h-5 rounded-lg bg-green-950/50 px-2 py-0.5 text-xs font-medium text-green-300 ring-1 ring-green-800/50">
                  {config.terrain === "electric" ? "Electric ×1.3" :
                    config.terrain === "grassy" ? "Grass ×1.3" :
                      config.terrain === "psychic" ? "Psychic ×1.3" :
                        config.terrain === "misty" ? "Dragon ×0.5" :
                          config.terrain}
                </span>
              )}
              {config.isCritical && (
                <span className="h-5 rounded-lg bg-yellow-950/50 px-2 py-0.5 text-xs font-medium text-yellow-300 ring-1 ring-yellow-800/50">
                  Crit ×1.5
                </span>
              )}
              {config.attackerBurned && (
                <span className="h-5 rounded-lg bg-orange-950/50 px-2 py-0.5 text-xs font-medium text-orange-300 ring-1 ring-orange-800/50">
                  Burn: Phys. Atk ÷2
                </span>
              )}
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
