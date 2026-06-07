"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { api } from "~/trpc/react";
import { TypeBadge } from "~/app/_components/TypeBadge";
import { COMPETITIVE_MOVES, type MoveSummary } from "~/lib/moves-data";
import { type PokemonType, type MoveCategory, ALL_POKEMON_TYPES } from "~/lib/types";

const CATEGORY_CONFIG: Record<MoveCategory, { label: string; color: string; bg: string }> = {
  physical: { label: "Physical", color: "#fb923c", bg: "rgba(251,146,60,0.15)" },
  special:  { label: "Special",  color: "#60a5fa", bg: "rgba(96,165,250,0.15)"  },
  status:   { label: "Status",   color: "#a78bfa", bg: "rgba(167,139,250,0.15)" },
};

function CategoryBadge({ category }: { category: MoveCategory }) {
  const { label, color, bg } = CATEGORY_CONFIG[category];
  return (
    <span
      className="shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
      style={{ color, background: bg }}
    >
      {label}
    </span>
  );
}

function MoveDetailPanel({ move }: { move: MoveSummary }) {
  const { data: detail, isFetching } = api.pokemon.getMove.useQuery(
    { moveName: move.slug },
    { staleTime: Infinity },
  );

  const { data: learners = [], isFetching: learnersLoading } = api.pokemon.getPokemonByMove.useQuery(
    { moveName: move.slug },
    { staleTime: Infinity },
  );

  const typeColor = CATEGORY_CONFIG[move.category].color;

  return (
    <div className="flex flex-col gap-5">
      {/* Category accent bar */}
      <div className="h-0.5 w-full rounded-full" style={{ background: typeColor }} />

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold tracking-tight text-white">{move.displayName}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <TypeBadge type={move.type} />
            <CategoryBadge category={move.category} />
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Power",    value: move.power    != null ? String(move.power)    : "—" },
          { label: "Accuracy", value: move.accuracy != null ? `${move.accuracy}%`   : "—" },
          { label: "PP",       value: String(move.pp) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl bg-zinc-800/60 px-3 py-3 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">{label}</div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-white">{value}</div>
          </div>
        ))}
      </div>

      {/* Effect */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Effect</p>
        {isFetching ? (
          <div className="space-y-2">
            <div className="shimmer h-3 rounded" />
            <div className="shimmer h-3 w-4/5 rounded" />
          </div>
        ) : detail?.effect ? (
          <p className="text-sm leading-relaxed text-zinc-300">{detail.effect}</p>
        ) : (
          <p className="text-sm text-zinc-600">No effect description available.</p>
        )}
      </div>

      {/* Pokémon that learn this move */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Learned by</p>
          {!learnersLoading && (
            <span className="text-[10px] text-zinc-700">{learners.length} Pokémon</span>
          )}
        </div>
        {learnersLoading ? (
          <div className="grid grid-cols-5 gap-1.5">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="shimmer h-16 rounded-xl" />
            ))}
          </div>
        ) : learners.length > 0 ? (
          <div className="max-h-100 overflow-y-auto rounded-xl border border-zinc-800/60 bg-zinc-900/20 p-2">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-1">
              {learners.map(p => (
                <div
                  key={p.name}
                  className="flex flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 transition hover:bg-zinc-800/60"
                >
                  <Image src={p.sprite} alt={p.name} width={40} height={40} unoptimized className="drop-shadow-sm" />
                  <span className="w-full truncate text-center text-[9px] capitalize leading-tight text-zinc-500">
                    {p.name.replace(/-/g, " ")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-zinc-600">No cached Pokémon learn this move yet.</p>
        )}
      </div>

      {/* PokeAPI id */}
      {detail && (
        <p className="text-[10px] text-zinc-700">
          Move #{String(detail.pokeApiId).padStart(3, "0")} · {move.slug}
        </p>
      )}
    </div>
  );
}

export function MovesTab() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<PokemonType | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<MoveCategory | null>(null);
  const [selected, setSelected] = useState<MoveSummary | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return COMPETITIVE_MOVES.filter(m => {
      const nameMatch = !q || m.displayName.toLowerCase().includes(q);
      const typeMatch = !typeFilter || m.type === typeFilter;
      const catMatch  = !categoryFilter || m.category === categoryFilter;
      return nameMatch && typeMatch && catMatch;
    });
  }, [query, typeFilter, categoryFilter]);

  return (
    <div className="flex gap-4 items-start">
      {/* ── Left: filters + list ────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {/* Search */}
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search moves…"
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30"
        />

        {/* Category filter */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Category</span>
          <div className="flex gap-1">
            {(["physical", "special", "status"] as MoveCategory[]).map(cat => {
              const { label, color, bg } = CATEGORY_CONFIG[cat];
              const isActive = categoryFilter === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(isActive ? null : cat)}
                  className="rounded-lg border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition"
                  style={isActive
                    ? { color, background: bg, borderColor: `${color}40` }
                    : { color: "#52525b", background: "transparent", borderColor: "#27272a" }
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Type filter */}
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Type</span>
          {ALL_POKEMON_TYPES.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(typeFilter === t ? null : t)}
              className={`rounded-full border px-2 py-0.5 text-[9px] font-bold capitalize transition ${
                typeFilter === t
                  ? "border-violet-500/50 bg-violet-900/30 text-violet-300"
                  : "border-zinc-800 text-zinc-600 hover:border-zinc-700 hover:text-zinc-400"
              }`}
            >
              {t}
            </button>
          ))}
          {(typeFilter !== null || categoryFilter !== null) && (
            <button
              onClick={() => { setTypeFilter(null); setCategoryFilter(null); }}
              className="ml-1 text-[10px] text-violet-500 hover:text-violet-400"
            >
              Clear
            </button>
          )}
        </div>

        {/* Count */}
        <p className="text-[11px] text-zinc-600">{filtered.length} moves</p>

        {/* Move list */}
        <div className="space-y-1">
          {filtered.map(m => (
            <button
              key={m.slug}
              onClick={() => setSelected(m)}
              className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition ${
                selected?.slug === m.slug
                  ? "border-violet-500/40 bg-violet-900/20"
                  : "border-zinc-800/60 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-800/60"
              }`}
            >
              <TypeBadge type={m.type} size="sm" />
              <span className="flex-1 truncate text-sm font-medium text-zinc-200">{m.displayName}</span>
              <CategoryBadge category={m.category} />
              <span className="w-8 shrink-0 text-right text-xs tabular-nums text-zinc-600">
                {m.power ?? "—"}
              </span>
              <span className="w-10 shrink-0 text-right text-[10px] tabular-nums text-zinc-700">
                {m.accuracy != null ? `${m.accuracy}%` : "—"}
              </span>
              <span className="w-8 shrink-0 text-right text-[10px] tabular-nums text-zinc-700">
                {m.pp}PP
              </span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="py-8 text-center text-xs text-zinc-600">No moves matching your filters.</p>
          )}
        </div>
      </div>

      {/* ── Right: detail panel ─────────────────────────────────────────────── */}
      <div
        className="panel-card sticky top-4 w-[48rem] shrink-0 overflow-y-auto p-5"
        style={{ maxHeight: "calc(100vh - 8rem)" }}
      >
        {selected ? (
          <MoveDetailPanel move={selected} />
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-zinc-800">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-800">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <p className="text-xs text-zinc-600">Select a move to see details</p>
          </div>
        )}
      </div>
    </div>
  );
}
