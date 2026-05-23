"use client";

import { useState } from "react";
import Image from "next/image";
import { api } from "~/trpc/react";
import { calculateDamage, getTypeEffectiveness } from "~/lib/damage";
import { type DamageResult } from "~/lib/damage";
import { type PokemonSummary, type MoveDetail, type PokemonType } from "~/lib/types";
import { DamageResultCard } from "./DamageResult";
import { TypeBadge } from "~/app/_components/TypeBadge";

function PokemonPicker({
  label,
  value,
  onPick,
}: {
  label: string;
  value: PokemonSummary | null;
  onPick: (p: PokemonSummary) => void;
}) {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");

  const { data, isFetching, error } = api.pokemon.search.useQuery(
    { query: submitted },
    { enabled: !!submitted, retry: false }
  );

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-zinc-400">{label}</label>
      {value ? (
        <div className="flex items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-900 p-3">
          <Image src={value.sprite} alt={value.name} width={48} height={48} unoptimized />
          <div>
            <p className="text-sm font-semibold capitalize">{value.name}</p>
            <div className="flex gap-1">
              {value.types.map(t => <TypeBadge key={t} type={t as PokemonType} size="sm" />)}
            </div>
          </div>
          <button
            onClick={() => { setSubmitted(""); setQuery(""); }}
            className="ml-auto text-xs text-zinc-600 hover:text-white"
          >
            Change
          </button>
        </div>
      ) : (
        <form onSubmit={e => { e.preventDefault(); setSubmitted(query.trim()); }} className="flex gap-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Pokemon name…"
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-500"
          />
          <button
            type="submit"
            disabled={!query || isFetching}
            className="rounded-xl bg-violet-600 px-3 py-2 text-sm text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {isFetching ? "…" : "Find"}
          </button>
        </form>
      )}
      {error && <p className="text-xs text-red-400">{error.message}</p>}
      {data && !value && (
        <button
          onClick={() => onPick(data)}
          className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-left text-sm capitalize transition hover:border-violet-600"
        >
          Use <span className="font-semibold">{data.name}</span>
        </button>
      )}
    </div>
  );
}

export function DamageCalculator() {
  const [attacker, setAttacker] = useState<PokemonSummary | null>(null);
  const [defender, setDefender] = useState<PokemonSummary | null>(null);
  const [moveQuery, setMoveQuery] = useState("");
  const [moveSubmitted, setMoveSubmitted] = useState("");
  const [result, setResult] = useState<{ dmg: DamageResult; move: MoveDetail } | null>(null);

  const { data: moveData, isFetching: moveFetching, error: moveError } =
    api.pokemon.getMove.useQuery(
      { moveName: moveSubmitted },
      { enabled: !!moveSubmitted, retry: false }
    );

  function calculate() {
    if (!attacker || !defender || !moveData) return;
    const isPhysical = moveData.category === "physical";
    const attackStat  = isPhysical ? attacker.baseStats.attack   : attacker.baseStats.spAttack;
    const defenseStat = isPhysical ? defender.baseStats.defense  : defender.baseStats.spDefense;
    const stab = attacker.types.includes(moveData.type as PokemonType);
    const te   = getTypeEffectiveness(moveData.type as PokemonType, defender.types as PokemonType[]);
    const dmg  = calculateDamage({ level: 50, power: moveData.power ?? 0, attackStat, defenseStat, stab, typeEffectiveness: te });
    setResult({ dmg, move: moveData });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <PokemonPicker label="Attacker" value={attacker} onPick={p => { setAttacker(p); setResult(null); }} />
        <PokemonPicker label="Defender" value={defender} onPick={p => { setDefender(p); setResult(null); }} />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-zinc-400">Move</label>
        <form
          onSubmit={e => { e.preventDefault(); setMoveSubmitted(moveQuery.trim()); setResult(null); }}
          className="flex gap-2"
        >
          <input
            value={moveQuery}
            onChange={e => setMoveQuery(e.target.value)}
            placeholder="flamethrower, earthquake…"
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-500"
          />
          <button
            type="submit"
            disabled={!moveQuery || moveFetching}
            className="rounded-xl bg-violet-600 px-3 py-2 text-sm text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {moveFetching ? "…" : "Load"}
          </button>
        </form>
        {moveError && <p className="text-xs text-red-400">{moveError.message}</p>}
        {moveData && (
          <div className="flex items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm">
            <span className="font-medium capitalize">{moveData.name.replace(/-/g, " ")}</span>
            <TypeBadge type={moveData.type as PokemonType} size="sm" />
            <span className="text-zinc-500">{moveData.category} · Pwr {moveData.power ?? "—"}</span>
          </div>
        )}
      </div>

      <button
        onClick={calculate}
        disabled={!attacker || !defender || !moveData}
        className="w-full rounded-xl bg-violet-600 py-3 font-semibold text-white transition hover:bg-violet-500 disabled:opacity-40"
      >
        Calculate Damage
      </button>

      {result && attacker && defender && (
        <DamageResultCard
          result={result.dmg}
          moveName={result.move.name}
          attackerName={attacker.name}
          defenderName={defender.name}
          defenderBaseHp={defender.baseStats.hp}
        />
      )}
    </div>
  );
}
