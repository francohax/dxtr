import { type DamageResult } from "~/lib/damage";
import { calcOhkoOdds, defenderHpAtL50 } from "~/lib/ohko";

interface DamageResultCardProps {
  result: DamageResult;
  moveName: string;
  moveType?: string;
  attackerName: string;
  defenderName: string;
  defenderBaseHp: number;
}

function ModifierPill({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex flex-col items-center rounded-xl px-3 py-2 ${highlight ? "bg-violet-900/40 ring-1 ring-violet-700" : "bg-zinc-800/60"}`}>
      <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">{label}</span>
      <span className={`text-sm font-bold tabular-nums ${highlight ? "text-violet-300" : "text-zinc-200"}`}>{value}</span>
    </div>
  );
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
    result.typeEffectiveness === 0    ? "Immune — no effect" :
    result.typeEffectiveness === 0.25 ? "Doubly resisted (¼×)" :
    result.typeEffectiveness < 1      ? "Not very effective… (½×)" :
    result.typeEffectiveness === 1    ? "Neutral" :
    result.typeEffectiveness === 2    ? "Super effective! (2×)" :
                                        "Doubly super effective! (4×)";

  const effectColour =
    result.typeEffectiveness === 0    ? "text-zinc-600" :
    result.typeEffectiveness < 1      ? "text-orange-400" :
    result.typeEffectiveness === 1    ? "text-zinc-400" :
    result.typeEffectiveness === 2    ? "text-green-400" :
                                        "text-emerald-300";

  const defHp = defenderHpAtL50(defenderBaseHp);
  const ohkoOdds = calcOhkoOdds(result.modifiedBeforeRandom, defHp);
  const ohkoPercent = Math.round(ohkoOdds * 100);
  const ohkoRolls = Math.round(ohkoOdds * 16);

  const ohkoLabel =
    ohkoOdds === 0   ? `Won't OHKO (max ${result.max} vs ${defHp} HP)` :
    ohkoOdds === 1   ? "Always OHKOs!" :
                       `${ohkoRolls}/16 rolls OHKO (${ohkoPercent}%)`;

  const ohkoColour =
    ohkoOdds === 0 ? "text-zinc-500" :
    ohkoOdds === 1 ? "text-green-400" :
                     "text-yellow-400";

  return (
    <div className="animate-fade-in relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-zinc-700/50 bg-zinc-800/30 p-6 backdrop-blur-sm">
      {/* Move-type top accent */}
      {moveType && (
        <div
          className="absolute inset-x-0 top-0 h-[2px] opacity-70"
          style={{ background: `var(--color-type-${moveType})` }}
        />
      )}

      {/* Header */}
      <p className="text-sm text-zinc-400">
        <span className="font-semibold capitalize text-white">{attackerName}</span>
        {" uses "}
        <span className="font-semibold capitalize text-violet-300">{moveName.replace(/-/g, " ")}</span>
        {" on "}
        <span className="font-semibold capitalize text-white">{defenderName}</span>
      </p>

      {/* Damage range — hero number */}
      <div className="flex items-end gap-3">
        <div className="flex flex-col">
          <span className="text-xs text-zinc-500">Damage range</span>
          <span className="text-5xl font-black tabular-nums leading-none">
            {result.min}–{result.max}
          </span>
        </div>
        <span className={`mb-1 text-sm font-semibold ${effectColour}`}>{effectLabel}</span>
      </div>

      {/* Modifier chain */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-600">Modifier breakdown</p>
        <div className="flex flex-wrap items-center gap-2">
          <ModifierPill label="Base" value={String(result.baseDamage)} />
          <span className="text-zinc-600">×</span>
          <ModifierPill
            label="STAB"
            value={result.stab === 1.5 ? "×1.5" : "×1.0"}
            highlight={result.stab === 1.5}
          />
          <span className="text-zinc-600">×</span>
          <ModifierPill
            label="Type"
            value={`×${result.typeEffectiveness}`}
            highlight={result.typeEffectiveness !== 1}
          />
          {result.weatherMult !== 1 && (
            <>
              <span className="text-zinc-600">×</span>
              <ModifierPill label="Weather" value={`×${result.weatherMult}`} highlight />
            </>
          )}
          {result.terrainMult !== 1 && (
            <>
              <span className="text-zinc-600">×</span>
              <ModifierPill label="Terrain" value={`×${result.terrainMult}`} highlight />
            </>
          )}
          {result.critMult !== 1 && (
            <>
              <span className="text-zinc-600">×</span>
              <ModifierPill label="Crit" value={`×${result.critMult}`} highlight />
            </>
          )}
          <span className="text-zinc-600">=</span>
          <ModifierPill label="Pre-roll" value={String(Math.floor(result.modifiedBeforeRandom))} />
        </div>
      </div>

      {/* OHKO odds */}
      <div className="flex items-center justify-between rounded-xl border border-zinc-700/50 bg-zinc-900/50 px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-600">OHKO odds</span>
          <span className={`text-sm font-semibold ${ohkoColour}`}>{ohkoLabel}</span>
        </div>
        {ohkoOdds > 0 && ohkoOdds < 1 && (
          <div className="flex h-8 w-24 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-yellow-500 transition-all duration-500"
              style={{ width: `${ohkoPercent}%` }}
            />
          </div>
        )}
        {ohkoOdds === 1 && (
          <span className="rounded-full bg-green-900/50 px-3 py-1 text-xs font-bold text-green-400 ring-1 ring-green-800">
            100%
          </span>
        )}
      </div>
    </div>
  );
}
