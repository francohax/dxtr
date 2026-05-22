"use client";

import { useState } from "react";
import Image from "next/image";
import { api } from "~/trpc/react";
import { TypeBadge } from "~/app/_components/TypeBadge";
import { StatBar } from "~/app/_components/StatBar";
import { type PokemonSummary } from "~/lib/types";

interface PokemonSearchProps {
  onSelect: (pokemon: PokemonSummary) => void;
}

export function PokemonSearch({ onSelect }: PokemonSearchProps) {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");

  const { data, isFetching, error } = api.pokemon.search.useQuery(
    { query: submitted },
    { enabled: submitted.length > 0, retry: false }
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(query.trim());
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Charizard, pikachu, 25…"
          className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
        />
        <button
          type="submit"
          disabled={!query.trim() || isFetching}
          className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500 disabled:opacity-50"
        >
          {isFetching ? "…" : "Find"}
        </button>
      </form>

      {error && (
        <p className="text-sm text-red-400">{error.message}</p>
      )}

      {data && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-start gap-4">
            <Image
              src={data.sprite}
              alt={data.name}
              width={96}
              height={96}
              className="shrink-0 drop-shadow-lg"
              unoptimized
            />
            <div className="flex flex-1 flex-col gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold capitalize">{data.name}</h3>
                <span className="text-sm text-zinc-500">#{String(data.pokeApiId).padStart(3, "0")}</span>
              </div>
              <div className="flex gap-1">
                {data.types.map(t => <TypeBadge key={t} type={t} size="sm" />)}
              </div>
              <div className="flex flex-col gap-1 pt-1">
                <StatBar label="HP"     value={data.baseStats.hp} />
                <StatBar label="Atk"    value={data.baseStats.attack} />
                <StatBar label="Def"    value={data.baseStats.defense} />
                <StatBar label="Sp.Atk" value={data.baseStats.spAttack} />
                <StatBar label="Sp.Def" value={data.baseStats.spDefense} />
                <StatBar label="Speed"  value={data.baseStats.speed} />
              </div>
            </div>
          </div>
          <button
            onClick={() => onSelect(data)}
            className="mt-4 w-full rounded-xl bg-violet-600 py-2 text-sm font-semibold text-white transition hover:bg-violet-500"
          >
            Add to Team
          </button>
        </div>
      )}
    </div>
  );
}
