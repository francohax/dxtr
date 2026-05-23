"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { api } from "~/trpc/react";
import { TypeBadge } from "~/app/_components/TypeBadge";
import { type MoveDetail, type PokemonType } from "~/lib/types";

interface MoveFuzzySearchProps {
  moveNames: string[];
  value: MoveDetail | null;
  onSelect: (move: MoveDetail) => void;
  onClear: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export function MoveFuzzySearch({ moveNames, value, onSelect, onClear, inputRef }: MoveFuzzySearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const utils = api.useUtils();

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const filtered = useMemo(() => {
    if (!query) return moveNames.slice(0, 40);
    const q = query.toLowerCase().replace(/\s/g, "-");
    return moveNames.filter(n => n.includes(q)).slice(0, 40);
  }, [query, moveNames]);

  async function handleSelect(moveName: string) {
    setOpen(false);
    setLoading(true);
    try {
      const move = await utils.pokemon.getMove.fetch({ moveName });
      onSelect(move);
    } finally {
      setLoading(false);
    }
  }

  // Filled state — show selected move card
  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5">
        <TypeBadge type={value.type as PokemonType} size="sm" />
        <span className="flex-1 text-sm font-medium capitalize text-white">
          {value.name.replace(/-/g, " ")}
        </span>
        <span className="text-xs text-zinc-500">
          {value.category}
        </span>
        <span className="text-xs font-mono text-zinc-500">
          Pwr {value.power ?? "—"} · Acc {value.accuracy ?? "—"}
        </span>
        <button
          onClick={onClear}
          className="ml-1 rounded-lg p-1 text-zinc-600 transition hover:text-zinc-300"
          aria-label="Clear move"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    );
  }

  // Empty state — fuzzy search dropdown
  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={moveNames.length === 0 ? "Select an attacker first…" : "Filter attacker's moves…"}
          disabled={moveNames.length === 0}
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 disabled:cursor-not-allowed disabled:opacity-40"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
            Loading…
          </span>
        )}
      </div>

      {open && filtered.length > 0 && (
        <ul className="absolute top-full z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-950 py-1 shadow-2xl">
          {filtered.map(name => (
            <li key={name}>
              <button
                onClick={() => handleSelect(name)}
                className="w-full px-3 py-1.5 text-left text-sm capitalize text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
              >
                {name.replace(/-/g, " ")}
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && query.length >= 2 && filtered.length === 0 && (
        <div className="absolute top-full z-20 mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-xs text-zinc-500 shadow-2xl">
          No moves matching &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  );
}
