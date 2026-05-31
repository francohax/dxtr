"use client";

import { useMemo } from "react";
import { TypeBadge } from "~/app/_components/TypeBadge";
import { getTeamOffensiveCoverage, getTeamDefensiveSummary } from "~/lib/coverage";
import { type TeamSlotConfig, type PokemonType } from "~/lib/types";

interface TeamCoveragePanelProps {
  slots: (TeamSlotConfig | null)[];
}

export function TeamCoveragePanel({ slots }: TeamCoveragePanelProps) {
  const filledSlots = slots.filter((s): s is TeamSlotConfig => s !== null);

  const teamMoveTypes = useMemo<PokemonType[][]>(
    () =>
      filledSlots.map(s =>
        s.moves
          .filter(m => m.category !== "status")
          .map(m => m.type)
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slots]
  );

  const teamDefenderTypes = useMemo<PokemonType[][]>(
    () => filledSlots.map(s => s.pokemon.types),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slots]
  );

  const offCoverage = useMemo(
    () => getTeamOffensiveCoverage(teamMoveTypes),
    [teamMoveTypes]
  );

  const defSummary = useMemo(
    () => getTeamDefensiveSummary(teamDefenderTypes),
    [teamDefenderTypes]
  );

  const topWeaknesses = defSummary
    .filter(e => e.weakCount > 0)
    .sort((a, b) => b.weakCount - a.weakCount);

  const topResistances = defSummary
    .filter(e => e.resistCount + e.immuneCount > 0)
    .sort((a, b) => (b.resistCount + b.immuneCount) - (a.resistCount + a.immuneCount))
    .slice(0, 6);

  if (filledSlots.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-6 py-4 text-sm text-zinc-600">
        Add Pokémon to see team coverage analytics.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">
        Team Coverage
      </p>
      <div className="grid gap-6 md:grid-cols-3">
        {/* Offensive coverage */}
        <div>
          <p className="mb-2 text-xs font-medium text-zinc-400">
            Offensive — Super-effective vs.
          </p>
          {offCoverage.superEffective.length === 0 ? (
            <p className="text-xs text-zinc-600">No super-effective coverage yet.</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {offCoverage.superEffective.map(t => <TypeBadge key={t} type={t} />)}
            </div>
          )}
          {offCoverage.notVeryEffective.length > 0 && (
            <div className="mt-2">
              <p className="mb-1 text-xs text-zinc-600">Not covered (resisted by all):</p>
              <div className="flex flex-wrap gap-1">
                {offCoverage.notVeryEffective.map(t => (
                  <TypeBadge key={t} type={t} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Defensive weaknesses */}
        <div>
          <p className="mb-2 text-xs font-medium text-zinc-400">
            Defensive — Weaknesses
          </p>
          {topWeaknesses.length === 0 ? (
            <p className="text-xs text-zinc-600">No shared weaknesses.</p>
          ) : (
            <div className="space-y-1.5">
              {topWeaknesses.map(({ type, weakCount }) => (
                <div key={type} className="flex items-center gap-2">
                  <TypeBadge type={type} />
                  <div className="flex gap-0.5">
                    {Array.from({ length: weakCount }).map((_, i) => (
                      <div key={i} className="h-2 w-2 rounded-full bg-red-500/70" />
                    ))}
                  </div>
                  <span className="text-xs text-zinc-500">
                    {weakCount}× weak
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Defensive resistances / immunities */}
        <div>
          <p className="mb-2 text-xs font-medium text-zinc-400">
            Defensive — Resistances
          </p>
          {topResistances.length === 0 ? (
            <p className="text-xs text-zinc-600">No resistances yet.</p>
          ) : (
            <div className="space-y-1.5">
              {topResistances.map(({ type, resistCount, immuneCount }) => (
                <div key={type} className="flex items-center gap-2">
                  <TypeBadge type={type} />
                  {immuneCount > 0 && (
                    <span className="rounded bg-zinc-800 px-1 py-0.5 text-xs text-zinc-400">
                      {immuneCount}× immune
                    </span>
                  )}
                  {resistCount > 0 && (
                    <span className="text-xs text-zinc-500">
                      {resistCount}× resist
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
