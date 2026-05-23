"use client";

import { type BattleConfig, type Weather, type Terrain } from "~/lib/types";

const WEATHER_OPTIONS: { value: Weather; label: string }[] = [
  { value: "none",      label: "Clear"      },
  { value: "sun",       label: "Harsh Sun"  },
  { value: "rain",      label: "Rain"       },
  { value: "sandstorm", label: "Sandstorm"  },
  { value: "hail",      label: "Hail"       },
];

const TERRAIN_OPTIONS: { value: Terrain; label: string }[] = [
  { value: "none",     label: "None"     },
  { value: "electric", label: "Electric" },
  { value: "grassy",   label: "Grassy"   },
  { value: "psychic",  label: "Psychic"  },
  { value: "misty",    label: "Misty"    },
];

interface BattleConfigPanelProps {
  config: BattleConfig;
  onChange: (config: BattleConfig) => void;
}

export function BattleConfigPanel({ config, onChange }: BattleConfigPanelProps) {
  function update<K extends keyof BattleConfig>(key: K, value: BattleConfig[K]) {
    onChange({ ...config, [key]: value });
  }

  return (
    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-4">
      <span className="mb-3 block text-[11px] font-semibold uppercase tracking-widest text-zinc-600">
        Battle Config
      </span>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Level */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-zinc-500">Level</label>
          <input
            type="number"
            min={1}
            max={100}
            value={config.level}
            onChange={e => {
              const v = Math.max(1, Math.min(100, Number(e.target.value) || 50));
              update("level", v);
            }}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>

        {/* Weather */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-zinc-500">Weather</label>
          <select
            value={config.weather}
            onChange={e => update("weather", e.target.value as Weather)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30"
          >
            {WEATHER_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Terrain */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-zinc-500">Terrain</label>
          <select
            value={config.terrain}
            onChange={e => update("terrain", e.target.value as Terrain)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30"
          >
            {TERRAIN_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Critical hit */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-zinc-500">Critical Hit</label>
          <button
            role="switch"
            aria-checked={config.isCritical}
            onClick={() => update("isCritical", !config.isCritical)}
            className={`flex h-[38px] items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition ${
              config.isCritical
                ? "border-yellow-600/60 bg-yellow-900/30 text-yellow-300"
                : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
            }`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>{config.isCritical ? "×1.5 crit" : "No crit"}</span>
          </button>
        </div>
      </div>

      {/* Active modifier hints */}
      {(config.weather !== "none" || config.terrain !== "none" || config.isCritical) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {config.weather !== "none" && (
            <span className="rounded-lg bg-blue-950/50 px-2 py-0.5 text-xs font-medium text-blue-300 ring-1 ring-blue-800/50">
              {config.weather === "sun"  ? "Fire ×1.5 · Water ×0.5" :
               config.weather === "rain" ? "Water ×1.5 · Fire ×0.5" :
               config.weather}
            </span>
          )}
          {config.terrain !== "none" && (
            <span className="rounded-lg bg-green-950/50 px-2 py-0.5 text-xs font-medium text-green-300 ring-1 ring-green-800/50">
              {config.terrain === "electric" ? "Electric ×1.3" :
               config.terrain === "grassy"   ? "Grass ×1.3" :
               config.terrain === "psychic"  ? "Psychic ×1.3" :
               config.terrain === "misty"    ? "Dragon ×0.5" :
               config.terrain}
            </span>
          )}
          {config.isCritical && (
            <span className="rounded-lg bg-yellow-950/50 px-2 py-0.5 text-xs font-medium text-yellow-300 ring-1 ring-yellow-800/50">
              Crit ×1.5
            </span>
          )}
        </div>
      )}
    </div>
  );
}
