import { type DamageResult } from "~/lib/damage";

interface DamageResultCardProps {
  result: DamageResult;
  moveName: string;
  attackerName: string;
  defenderName: string;
}

export function DamageResultCard({ result, moveName, attackerName, defenderName }: DamageResultCardProps) {
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
                                        "text-emerald-300 font-black";

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="text-sm text-zinc-400">
        <span className="font-semibold capitalize text-white">{attackerName}</span>
        {" uses "}
        <span className="font-semibold capitalize text-violet-300">{moveName.replace(/-/g, " ")}</span>
        {" on "}
        <span className="font-semibold capitalize text-white">{defenderName}</span>
      </div>

      <div className="flex items-end gap-4">
        <div className="flex flex-col">
          <span className="text-xs text-zinc-500">Damage range</span>
          <span className="text-4xl font-black tabular-nums">
            {result.min}–{result.max}
          </span>
        </div>
        <span className={`mb-1 text-sm font-semibold ${effectColour}`}>{effectLabel}</span>
      </div>

      <div className="grid grid-cols-3 divide-x divide-zinc-800 rounded-xl border border-zinc-800">
        {[
          { label: "STAB",  value: result.stab === 1.5 ? "×1.5" : "×1.0" },
          { label: "Type",  value: `×${result.typeEffectiveness}` },
          { label: "Avg",   value: String(result.average) },
        ].map(({ label, value }) => (
          <div key={label} className="flex flex-col items-center py-3">
            <span className="text-xs text-zinc-500">{label}</span>
            <span className="text-lg font-bold">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
