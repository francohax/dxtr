"use client";

import Image from "next/image";
import { NATURES, NATURE_KEYS, type NatureKey } from "~/lib/natures";
import { EV_STAT_REFS, EV_SHORTCUTS } from "~/lib/ev-training";
import { type StatKey } from "~/lib/natures";

// ── Nature Table ──────────────────────────────────────────────────────────────

const STAT_COLS: { key: StatKey; label: string; color: string }[] = [
  { key: "attack",    label: "Atk", color: "#fb923c" },
  { key: "defense",   label: "Def", color: "#facc15" },
  { key: "spAttack",  label: "SpA", color: "#60a5fa" },
  { key: "spDefense", label: "SpD", color: "#4ade80" },
  { key: "speed",     label: "Spe", color: "#f472b6" },
];

// Map diagonal positions to correct neutral natures in order
const NEUTRAL_NATURES: NatureKey[] = ["hardy", "docile", "serious", "bashful", "quirky"];
// Correct the diagonal: row 0 col 0 = hardy (atk/atk), etc.
const NATURE_TABLE: (NatureKey | null)[][] = STAT_COLS.map((rowStat, ri) =>
  STAT_COLS.map((colStat, ci) => {
    if (ri === ci) return NEUTRAL_NATURES[ri] ?? null;
    return NATURE_KEYS.find(n => {
      const { boost, reduce } = NATURES[n]!;
      return boost === colStat.key && reduce === rowStat.key;
    }) ?? null;
  })
);

function NatureTable() {
  return (
    <div className="panel-card overflow-x-auto p-4">
      <div className="mb-3 flex items-baseline gap-2">
        <span className="section-label">Nature Chart</span>
        <span className="text-[10px] text-zinc-600">Row = stat lowered · Column = stat boosted</span>
      </div>
      <table className="w-full border-collapse text-center text-xs">
        <thead>
          <tr>
            <th className="w-12 pb-2 pr-2 text-right text-[10px] font-normal text-zinc-700">↓ / ↑</th>
            {STAT_COLS.map(col => (
              <th key={col.key} className="pb-2 text-[11px] font-bold" style={{ color: col.color }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {STAT_COLS.map((rowStat, ri) => (
            <tr key={rowStat.key}>
              <td className="pr-2 text-right text-[11px] font-bold" style={{ color: rowStat.color }}>
                {rowStat.label}
              </td>
              {STAT_COLS.map((_colStat, ci) => {
                const nature = NATURE_TABLE[ri]?.[ci];
                const isNeutral = ri === ci;
                return (
                  <td key={ci} className="px-1 py-1">
                    {nature ? (
                      <span
                        className={`inline-block rounded-lg px-2 py-1 text-[10px] font-semibold capitalize transition ${
                          isNeutral
                            ? "bg-zinc-800/60 text-zinc-600"
                            : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                        }`}
                      >
                        {nature}
                      </span>
                    ) : (
                      <span className="text-zinc-800">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex items-center gap-4 text-[10px] text-zinc-600">
        <span><span className="font-bold" style={{ color: "#fb923c" }}>Coloured header</span> = boosted/lowered stat</span>
        <span><span className="font-bold text-zinc-500">Grey cell</span> = neutral (no effect)</span>
      </div>
    </div>
  );
}

// ── EV Training Reference ─────────────────────────────────────────────────────

const SPRITE_IDS: Record<string, number> = {
  blissey: 242, chansey: 113, snorlax: 143, wooper: 194,
  gumshoos: 735, yungoos: 734, crabrawler: 739, carvanha: 318,
  forretress: 205, pineco: 204, graveler: 75, geodude: 74,
  magneton: 82, magnemite: 81, gastly: 92, ralts: 280,
  tentacruel: 73, tentacool: 72, mantine: 226, mantyke: 458,
  golbat: 42, zubat: 41, joltik: 595, diglett: 50,
};

function EvTrainingRef() {
  return (
    <div className="space-y-4">
      <div className="panel-card p-4">
        <div className="mb-4 flex items-baseline gap-2">
          <span className="section-label">EV Training Reference</span>
          <span className="text-[10px] text-zinc-600">Best Pokémon to farm per stat</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {EV_STAT_REFS.map(ref => (
            <div key={ref.stat} className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-3">
              {/* Stat header */}
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: ref.color }}
                />
                <span className="text-sm font-bold" style={{ color: ref.color }}>{ref.label}</span>
                <span className="ml-auto text-[10px] text-zinc-600">{ref.vitamin}</span>
              </div>

              {/* Spots */}
              <div className="space-y-1.5">
                {ref.spots.map(spot => (
                  <div key={spot.slug} className="flex items-center gap-2">
                    {SPRITE_IDS[spot.slug] && (
                      <Image
                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${SPRITE_IDS[spot.slug]}.png`}
                        alt={spot.name}
                        width={28}
                        height={28}
                        unoptimized
                        className="shrink-0"
                      />
                    )}
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="text-xs font-medium text-zinc-300">{spot.name}</span>
                      <span className="truncate text-[10px] text-zinc-600">{spot.location}</span>
                    </div>
                    <span
                      className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                      style={{ color: ref.color, background: `${ref.color}15` }}
                    >
                      +{spot.evYield}
                    </span>
                  </div>
                ))}
              </div>

              {/* Tip */}
              {ref.tip && (
                <p className="mt-2 border-t border-zinc-800/60 pt-2 text-[10px] leading-relaxed text-zinc-600">
                  {ref.tip}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Shortcuts */}
      <div className="panel-card p-4">
        <span className="section-label mb-3 block">Training Shortcuts</span>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {EV_SHORTCUTS.map(s => (
            <div key={s.label} className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 px-3 py-2.5">
              <p className="mb-0.5 text-xs font-semibold text-violet-300">{s.label}</p>
              <p className="text-[10px] leading-relaxed text-zinc-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function TrainingTab() {
  return (
    <div className="flex flex-col gap-4">
      <NatureTable />
      <EvTrainingRef />
    </div>
  );
}
