import { type ReactNode } from "react";
import { type DamageResult } from "~/lib/damage";
import { calcOhkoOdds, defenderHpAtL50 } from "~/lib/ohko";
import { Tooltip } from "./Tooltip";

// ─── Modifier pill tooltips ────────────────────────────────────────────────────

const BASE_TOOLTIP = (
  <div className="flex flex-col gap-1">
    <span className="font-semibold text-zinc-100">Base Damage</span>
    <span className="font-mono text-[10px] text-zinc-400">⌊ ⌊(2×Lv÷5+2)×Power×Atk/Def ÷ 50⌋ + 2 ⌋</span>
    <span className="mt-0.5 text-zinc-500 text-[10px]">Before any multipliers or the damage roll.</span>
  </div>
);

const STAB_TOOLTIP = (
  <div className="flex flex-col gap-1">
    <span className="font-semibold text-zinc-100">STAB</span>
    <span>Same-Type Attack Bonus</span>
    <span>Move type matches user&apos;s type → <span className="text-green-300 font-medium">×1.5</span></span>
    <span className="text-zinc-500 text-[10px]">Adaptability ability raises this to ×2.</span>
  </div>
);

const TYPE_TOOLTIP_MAP: Record<number, ReactNode> = {
  0:    <div className="flex flex-col gap-1"><span className="font-semibold text-zinc-400">Immune (×0)</span><span className="text-zinc-500">Defender is immune — no damage dealt.</span></div>,
  0.25: <div className="flex flex-col gap-1"><span className="font-semibold text-orange-400">Doubly Resisted (×¼)</span><span className="text-zinc-500 text-[10px]">Two type resistances compound.</span></div>,
  0.5:  <div className="flex flex-col gap-1"><span className="font-semibold text-orange-300">Not Very Effective (×½)</span><span className="text-zinc-500 text-[10px]">One type resistance applies.</span></div>,
  1:    <div className="flex flex-col gap-1"><span className="font-semibold text-zinc-300">Neutral (×1)</span><span className="text-zinc-500 text-[10px]">No type advantage or disadvantage.</span></div>,
  2:    <div className="flex flex-col gap-1"><span className="font-semibold text-green-300">Super Effective (×2)</span><span className="text-zinc-500 text-[10px]">One type weakness applies.</span></div>,
  4:    <div className="flex flex-col gap-1"><span className="font-semibold text-emerald-300">Extremely Effective (×4)</span><span className="text-zinc-500 text-[10px]">Two type weaknesses compound.</span></div>,
};

function typeTooltip(te: number): ReactNode {
  return TYPE_TOOLTIP_MAP[te] ?? (
    <div className="flex flex-col gap-1">
      <span className="font-semibold text-zinc-100">Type Effectiveness</span>
      <span>Multiplier: <span className="font-medium text-zinc-300">×{te}</span></span>
    </div>
  );
}

const WEATHER_TOOLTIP = (
  <div className="flex flex-col gap-1">
    <span className="font-semibold text-zinc-100">Weather Modifier</span>
    <span>Sun → Fire <span className="text-orange-300 font-medium">×1.5</span>, Water <span className="text-blue-300 font-medium">×0.5</span></span>
    <span>Rain → Water <span className="text-blue-300 font-medium">×1.5</span>, Fire <span className="text-orange-300 font-medium">×0.5</span></span>
  </div>
);

const TERRAIN_TOOLTIP = (
  <div className="flex flex-col gap-1">
    <span className="font-semibold text-zinc-100">Terrain Modifier</span>
    <span>Electric / Grassy / Psychic → <span className="text-green-300 font-medium">×1.3</span></span>
    <span>Misty (Dragon) → <span className="text-red-400 font-medium">×0.5</span></span>
    <span className="text-zinc-500 text-[10px]">Only applies to grounded Pokémon.</span>
  </div>
);

const CRIT_TOOLTIP = (
  <div className="flex flex-col gap-1">
    <span className="font-semibold text-yellow-300">Critical Hit</span>
    <span>Damage <span className="text-yellow-300 font-medium">×1.5</span></span>
    <span className="text-zinc-500 text-[10px]">Ignores defender&apos;s +stat stages and attacker&apos;s −stat stages.</span>
  </div>
);

const ITEM_TOOLTIP = (
  <div className="flex flex-col gap-1">
    <span className="font-semibold text-zinc-100">Item Modifier</span>
    <span className="text-zinc-400">Applied after terrain / crit in the modifier chain.</span>
    <span className="text-zinc-500 text-[10px]">Includes Choice Band/Specs, Life Orb, type-boosts, etc.</span>
  </div>
);

function stageMultTooltip(mult: number): ReactNode {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-semibold text-zinc-100">Stat Stage Modifier</span>
      <span>
        Net multiplier:{" "}
        <span className={`font-bold ${mult > 1 ? "text-green-300" : mult < 1 ? "text-red-400" : "text-zinc-400"}`}>
          ×{mult.toFixed(2)}
        </span>
      </span>
      <span className="text-zinc-500 text-[10px]">Product of attacker&apos;s attack stage and defender&apos;s defense stage.</span>
    </div>
  );
}

const PREROLL_TOOLTIP = (
  <div className="flex flex-col gap-1">
    <span className="font-semibold text-zinc-100">Pre-roll Damage</span>
    <span className="text-zinc-400">Base damage × all modifiers, before the random roll.</span>
    <span className="mt-0.5 text-zinc-500 text-[10px]">The random roll is 85–100% (16 discrete values).<br />Min = Pre-roll × 0.85, Max = Pre-roll × 1.0</span>
  </div>
);

// ─── Pill ─────────────────────────────────────────────────────────────────────

interface ModifierPillProps {
  label: string;
  value: string;
  highlight?: boolean;
  tooltip?: React.ReactNode;
}

function ModifierPill({ label, value, highlight, tooltip }: ModifierPillProps) {
  const pill = (
    <div className={`flex flex-col items-center rounded-xl px-2.5 py-1.5 ${highlight ? "bg-violet-900/40 ring-1 ring-violet-700" : "bg-zinc-800/60"}`}>
      <span className="text-[9px] font-medium uppercase tracking-wider text-zinc-500">{label}</span>
      <span className={`text-xs font-bold tabular-nums ${highlight ? "text-violet-300" : "text-zinc-200"}`}>{value}</span>
    </div>
  );

  if (!tooltip) return pill;
  return (
    <Tooltip content={tooltip} side="top">
      {pill}
    </Tooltip>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

interface DamageResultCardProps {
  result: DamageResult;
  moveName: string;
  moveType?: string;
  attackerName: string;
  defenderName: string;
  defenderBaseHp: number;
}

export function DamageResultCard({
  result,
  moveName,
  moveType,
  attackerName,
  defenderName,
  defenderBaseHp,
}: DamageResultCardProps) {
  const effectLabel =
    result.typeEffectiveness === 0    ? "Immune" :
    result.typeEffectiveness === 0.25 ? "Doubly resisted (¼×)" :
    result.typeEffectiveness < 1      ? "Not very effective (½×)" :
    result.typeEffectiveness === 1    ? "Neutral" :
    result.typeEffectiveness === 2    ? "Super effective! (2×)" :
                                        "Extremely effective! (4×)";

  const effectColour =
    result.typeEffectiveness === 0    ? "text-zinc-600" :
    result.typeEffectiveness < 1      ? "text-orange-400" :
    result.typeEffectiveness === 1    ? "text-zinc-500" :
    result.typeEffectiveness === 2    ? "text-green-400" :
                                        "text-emerald-300";

  const defHp = defenderHpAtL50(defenderBaseHp);
  const ohkoOdds = calcOhkoOdds(result.modifiedBeforeRandom, defHp);
  const ohkoPercent = Math.round(ohkoOdds * 100);
  const ohkoRolls = Math.round(ohkoOdds * 16);

  const ohkoLabel =
    ohkoOdds === 0 ? `Won't OHKO (max ${result.max} vs ${defHp} HP)` :
    ohkoOdds === 1 ? "Always OHKOs!" :
                     `${ohkoRolls}/16 rolls OHKO (${ohkoPercent}%)`;

  const ohkoColour =
    ohkoOdds === 0 ? "text-zinc-500" :
    ohkoOdds === 1 ? "text-green-400" :
                     "text-yellow-400";

  return (
    <div className="animate-fade-in relative overflow-hidden rounded-2xl border border-zinc-700/50 bg-zinc-800/30 px-6 py-5 backdrop-blur-sm">
      {/* Move-type top accent */}
      {moveType && (
        <div
          className="absolute inset-x-0 top-0 h-[5px] opacity-70"
          style={{ background: `var(--color-type-${moveType})` }}
        />
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-8">

        {/* Left zone: header + modifier chain */}
        <div className="flex flex-1 flex-col gap-3">
          <p className="text-sm text-zinc-400">
            <span className="font-semibold capitalize text-white">{attackerName}</span>
            {" uses "}
            <span className="font-semibold capitalize text-violet-300">{moveName.replace(/-/g, " ")}</span>
            {" on "}
            <span className="font-semibold capitalize text-white">{defenderName}</span>
          </p>

          {/* Modifier chain */}
          <div className="flex flex-wrap items-center gap-1.5">
            <ModifierPill label="Base" value={String(result.baseDamage)} tooltip={BASE_TOOLTIP} />
            <span className="text-[11px] text-zinc-700">×</span>
            <ModifierPill label="STAB" value={result.stab === 1.5 ? "×1.5" : "×1"} highlight={result.stab === 1.5} tooltip={STAB_TOOLTIP} />
            <span className="text-[11px] text-zinc-700">×</span>
            <ModifierPill label="Type" value={`×${result.typeEffectiveness}`} highlight={result.typeEffectiveness !== 1} tooltip={typeTooltip(result.typeEffectiveness)} />
            {result.weatherMult !== 1 && (
              <>
                <span className="text-[11px] text-zinc-700">×</span>
                <ModifierPill label="Weather" value={`×${result.weatherMult}`} highlight tooltip={WEATHER_TOOLTIP} />
              </>
            )}
            {result.terrainMult !== 1 && (
              <>
                <span className="text-[11px] text-zinc-700">×</span>
                <ModifierPill label="Terrain" value={`×${result.terrainMult}`} highlight tooltip={TERRAIN_TOOLTIP} />
              </>
            )}
            {result.critMult !== 1 && (
              <>
                <span className="text-[11px] text-zinc-700">×</span>
                <ModifierPill label="Crit" value={`×${result.critMult}`} highlight tooltip={CRIT_TOOLTIP} />
              </>
            )}
            {result.itemMult !== undefined && (
              <>
                <span className="text-[11px] text-zinc-700">×</span>
                <ModifierPill label="Item" value={`×${result.itemMult}`} highlight tooltip={ITEM_TOOLTIP} />
              </>
            )}
            {result.stageMult !== undefined && result.stageMult !== 1 && (
              <>
                <span className="text-[11px] text-zinc-700">×</span>
                <ModifierPill label="Stage" value={`×${result.stageMult.toFixed(2)}`} highlight tooltip={stageMultTooltip(result.stageMult)} />
              </>
            )}
            <span className="text-[11px] text-zinc-700">=</span>
            <ModifierPill label="Pre-roll" value={String(Math.floor(result.modifiedBeforeRandom))} tooltip={PREROLL_TOOLTIP} />
          </div>

          {/* HP bar */}
          {(() => {
            const minPct    = Math.min(100, (result.min / defHp) * 100);
            const maxPct    = Math.min(100, (result.max / defHp) * 100);
            const remainPct = Math.max(0, 100 - maxPct);
            const rangePct  = maxPct - minPct;
            const remainColour =
              remainPct > 50 ? "bg-green-500" :
              remainPct > 25 ? "bg-yellow-400" :
              remainPct > 0  ? "bg-red-400"   : "";
            const remainHp = Math.max(0, defHp - result.max);
            return (
              <div className="flex flex-col gap-1.5">
                <div className="relative h-3 w-86 overflow-hidden rounded-full bg-zinc-800/70">
                  <div
                    className={`absolute inset-y-0 left-0 transition-all duration-500 ${remainColour}`}
                    style={{ width: `${remainPct}%` }}
                  />
                  <div
                    className="absolute inset-y-0 bg-red-500/40 transition-all duration-500"
                    style={{ left: `${remainPct}%`, width: `${rangePct}%` }}
                  />
                  <div
                    className="absolute inset-y-0 right-0 bg-red-600/70 transition-all duration-500"
                    style={{ width: `${minPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] tabular-nums text-zinc-400">
                  <span>{remainHp} HP remaining</span>
                  <span>{Math.round((result.max / defHp) * 100)}% max damage</span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Divider */}
        <div className="hidden w-px self-stretch bg-zinc-700/50 lg:block" />

        {/* Right zone: damage range + OHKO */}
        <div className="w-48 flex flex-col gap-3 lg:items-end">
          <div className="lg:text-right">
            <div className="flex items-end gap-2 lg:justify-end">
              <span className="text-4xl font-black tabular-nums leading-none text-white">
                {result.min}–{result.max}
              </span>
            </div>
            <span className={`text-xs font-semibold ${effectColour}`}>{effectLabel}</span>
          </div>

          {/* OHKO row */}
          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold ${ohkoColour}`}>{ohkoLabel}</span>
            {ohkoOdds > 0 && ohkoOdds < 1 && (
              <div className="h-2 w-20 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-yellow-500 transition-all duration-500"
                  style={{ width: `${ohkoPercent}%` }}
                />
              </div>
            )}
            {ohkoOdds === 1 && (
              <span className="rounded-full bg-green-900/50 px-2.5 py-0.5 text-xs font-bold text-green-400 ring-1 ring-green-800">
                100%
              </span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
