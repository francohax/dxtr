"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import { api } from "~/trpc/react";
import { TypeBadge } from "~/app/_components/TypeBadge";
import { StatBar } from "~/app/_components/StatBar";
import { type PokemonSummary, type PokemonType } from "~/lib/types";

interface PokemonPickerModalProps {
  label: string;
  current: PokemonSummary | null;
  onSelect: (p: PokemonSummary) => void;
  onClose: () => void;
}

export function PokemonPickerModal({ label, current, onSelect, onClose }: PokemonPickerModalProps) {
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: allNames = [] } = api.pokemon.listNames.useQuery(undefined, { staleTime: Infinity });

  const { data: pokemon, isFetching, error } = api.pokemon.search.useQuery(
    { query: chosen ?? "" },
    { enabled: !!chosen, retry: false }
  );

  const matches = useMemo(() => {
    if (query.length < 2) return [];
    const q = query.toLowerCase().replace(/\s/g, "-");
    return allNames.filter(n => n.includes(q)).slice(0, 20);
  }, [query, allNames]);

  useEffect(() => {
    // Small delay so the modal animation completes before focus
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function pick(name: string) {
    setChosen(name);
    setQuery(name.replace(/-/g, " "));
  }

  function reset() {
    setChosen(null);
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="animate-fade-in relative w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-950 p-5 shadow-2xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
            Select {label}
          </span>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setChosen(null); }}
            placeholder="Charizard, Garchomp, 006…"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30"
          />
          {matches.length > 0 && !chosen && (
            <ul className="absolute top-full z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 py-1 shadow-2xl">
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

        {/* Loading */}
        {isFetching && (
          <div className="mt-4 flex items-center justify-center py-8 text-sm text-zinc-500">
            Loading…
          </div>
        )}

        {/* Error */}
        {error && <p className="mt-3 text-xs text-red-400">{error.message}</p>}

        {/* Result card */}
        {pokemon && chosen && !isFetching && (
          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-start gap-4">
              <div className="flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-xl bg-zinc-800/80">
                <Image
                  src={pokemon.sprite}
                  alt={pokemon.name}
                  width={80}
                  height={80}
                  unoptimized
                  className="drop-shadow-lg"
                />
              </div>
              <div className="flex flex-1 flex-col gap-2 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold capitalize tracking-tight text-white truncate">{pokemon.name}</h3>
                  <span className="shrink-0 text-xs text-zinc-500">
                    #{String(pokemon.pokeApiId).padStart(3, "0")}
                  </span>
                </div>
                <div className="flex gap-1">
                  {pokemon.types.map(t => (
                    <TypeBadge key={t} type={t as PokemonType} size="sm" />
                  ))}
                </div>
                <div className="flex flex-col gap-0.5 pt-0.5">
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
                onClick={() => { onSelect(pokemon); onClose(); }}
                className="flex-1 rounded-xl bg-violet-600 py-2 text-sm font-semibold text-white transition hover:bg-violet-500"
              >
                Use as {label}
              </button>
              <button
                onClick={reset}
                className="rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-400 transition hover:border-zinc-600 hover:text-white"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Keep-current hint */}
        {current && !pokemon && (
          <p className="mt-3 text-center text-xs text-zinc-600">
            Press <kbd className="rounded bg-zinc-800 px-1 py-0.5 font-mono text-[10px] text-zinc-500">Esc</kbd> or
            click outside to keep{" "}
            <span className="capitalize text-zinc-500">{current.name}</span>
          </p>
        )}
      </div>
    </div>
  );
}
