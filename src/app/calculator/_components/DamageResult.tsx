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
    <div className={`flex flex-col items-center rounded-xl px-2.5 py-1.5 ${highlight ? "bg-violet-900/40 ring-1 ring-violet-700" : "bg-zinc-800/60"}`}>
      <span className="text-[9px] font-medium uppercase tracking-wider text-zinc-500">{label}</span>
      <span className={`text-xs font-bold tabular-nums ${highlight ? "text-violet-300" : "text-zinc-200"}`}>{value}</span>
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
    result.typeEffectiveness === 0    ? "Immune" :
    result.typeEffectiveness === 0.25 ? "Doubly resisted (¼×)" :
    result.typeEffectiveness < 1      ? "Not very effective (½×)" :
    result.typeEffectiveness === 1    ? "Neutral" :
    result.typeEffectiveness === 2    ? "Super effective! (2×)" :
                                        "Doubly super effective! (4×)";

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
          className="absolute inset-x-0 top-0 h-[10px] opacity-70"
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
            <ModifierPill label="Base" value={String(result.baseDamage)} />
            <span className="text-[11px] text-zinc-700">×</span>
            <ModifierPill label="STAB" value={result.stab === 1.5 ? "×1.5" : "×1"} highlight={result.stab === 1.5} />
            <span className="text-[11px] text-zinc-700">×</span>
            <ModifierPill label="Type" value={`×${result.typeEffectiveness}`} highlight={result.typeEffectiveness !== 1} />
            {result.weatherMult !== 1 && (
              <>
                <span className="text-[11px] text-zinc-700">×</span>
                <ModifierPill label="Weather" value={`×${result.weatherMult}`} highlight />
              </>
            )}
            {result.terrainMult !== 1 && (
              <>
                <span className="text-[11px] text-zinc-700">×</span>
                <ModifierPill label="Terrain" value={`×${result.terrainMult}`} highlight />
              </>
            )}
            {result.critMult !== 1 && (
              <>
                <span className="text-[11px] text-zinc-700">×</span>
                <ModifierPill label="Crit" value={`×${result.critMult}`} highlight />
              </>
            )}
            {result.stageMult !== undefined && result.stageMult !== 1 && (
              <>
                <span className="text-[11px] text-zinc-700">×</span>
                <ModifierPill label="Stage" value={`×${result.stageMult.toFixed(2)}`} highlight />
              </>
            )}
            <span className="text-[11px] text-zinc-700">=</span>
            <ModifierPill label="Pre-roll" value={String(Math.floor(result.modifiedBeforeRandom))} />
          </div>

          {/* HP bar — three segments: remaining / uncertain / certain damage */}
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
                <div className="relative h-3 w-full overflow-hidden rounded-full bg-zinc-800/70">
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
                <div className="flex justify-between text-[10px] tabular-nums text-zinc-600">
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
        <div className="flex flex-col gap-3 lg:items-end">
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
