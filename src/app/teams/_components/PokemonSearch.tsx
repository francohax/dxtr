"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { api } from "~/trpc/react";
import { TypeBadge } from "~/app/_components/TypeBadge";
import { StatBar } from "~/app/_components/StatBar";
import { type PokemonSummary } from "~/lib/types";

interface PokemonSearchProps {
  onSelect: (pokemon: PokemonSummary) => void;
  autoFocus?: boolean;
}

export function PokemonSearch({ onSelect, autoFocus }: PokemonSearchProps) {
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<string | null>(null);

  const { data: allNames = [] } = api.pokemon.listNames.useQuery(undefined, {
    staleTime: Infinity,
  });

  const { data: pokemon, isFetching, error } = api.pokemon.search.useQuery(
    { query: chosen ?? "" },
    { enabled: !!chosen, retry: false }
  );

  const matches = useMemo(() => {
    if (query.length < 2) return [];
    const q = query.toLowerCase().replace(/\s/g, "-");
    return allNames.filter(n => n.includes(q)).slice(0, 20);
  }, [query, allNames]);

  function pick(name: string) {
    setChosen(name);
    setQuery(name.replace(/-/g, " "));
  }

  function reset() {
    setChosen(null);
    setQuery("");
  }

  if (pokemon && chosen) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-start gap-4">
            <Image
              src={pokemon.sprite}
              alt={pokemon.name}
              width={96}
              height={96}
              className="shrink-0 drop-shadow-lg"
              unoptimized
            />
            <div className="flex flex-1 flex-col gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold capitalize">{pokemon.name}</h3>
                <span className="text-sm text-zinc-500">#{String(pokemon.pokeApiId).padStart(3, "0")}</span>
              </div>
              <div className="flex gap-1">
                {pokemon.types.map(t => <TypeBadge key={t} type={t} size="sm" />)}
              </div>
              <div className="flex flex-col gap-1 pt-1">
                <StatBar label="HP"     value={pokemon.baseStats.hp} />
                <StatBar label="Atk"    value={pokemon.baseStats.attack} />
                <StatBar label="Def"    value={pokemon.baseStats.defense} />
                <StatBar label="Sp.Atk" value={pokemon.baseStats.spAttack} />
                <StatBar label="Sp.Def" value={pokemon.baseStats.spDefense} />
                <StatBar label="Speed"  value={pokemon.baseStats.speed} />
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => onSelect(pokemon)}
              className="flex-1 rounded-xl bg-violet-600 py-2 text-sm font-semibold text-white transition hover:bg-violet-500"
            >
              Add to Team
            </button>
            <button
              onClick={reset}
              className="rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-400 transition hover:text-white"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col gap-2">
      <input
        autoFocus={autoFocus}
        value={query}
        onChange={e => { setQuery(e.target.value); setChosen(null); }}
        placeholder="Charizard, pikachu, 25…"
        className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
      />
      {isFetching && <p className="text-xs text-zinc-500">Loading…</p>}
      {error && <p className="text-sm text-red-400">{error.message}</p>}
      {matches.length > 0 && !chosen && (
        <ul className="absolute top-full z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 py-1 shadow-2xl">
          {matches.map(name => (
            <li key={name}>
              <button
                onClick={() => pick(name)}
                className="w-full px-4 py-1.5 text-left text-sm capitalize transition hover:bg-zinc-800"
              >
                {name.replace(/-/g, " ")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
