"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { api } from "~/trpc/react";
import { TypeBadge } from "~/app/_components/TypeBadge";
import { StatBar } from "~/app/_components/StatBar";
import { TypeFilterBar } from "~/app/calculator/_components/TypeFilterBar";
import { TypeMatchupGrid } from "~/app/teams/_components/TypeMatchupGrid";
import { COMPETITIVE_MOVES } from "~/lib/moves-data";
import { type PokemonType, type MoveCategory } from "~/lib/types";

// ── Type colours ──────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<PokemonType, string> = {
  normal: "#A8A878", fire: "#F08030", water: "#6890F0", electric: "#F8D030",
  grass: "#78C850", ice: "#98D8D8", fighting: "#C03028", poison: "#A040A0",
  ground: "#E0C068", flying: "#A890F0", psychic: "#F85888", bug: "#A8B820",
  rock: "#B8A038", ghost: "#705898", dragon: "#7038F8", dark: "#705848",
  steel: "#B8B8D0", fairy: "#EE99AC",
};

const CATEGORY_COLORS: Record<MoveCategory, string> = {
  physical: "#fb923c",
  special:  "#60a5fa",
  status:   "#a78bfa",
};

// ── Movepool table ────────────────────────────────────────────────────────────

interface SlimMove {
  type: PokemonType;
  category: MoveCategory;
  power: number | null;
  accuracy: number | null;
  pp: number;
}

type SortCol  = "name" | "type" | "category" | "power" | "accuracy" | "pp";
type SortDir  = "asc" | "desc";

function SortButton({
  col, label, sortCol, sortDir, onSort, className = "",
}: {
  col: SortCol; label: string; sortCol: SortCol; sortDir: SortDir;
  onSort: (c: SortCol) => void; className?: string;
}) {
  const isActive = sortCol === col;
  return (
    <button
      onClick={() => onSort(col)}
      className={`flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-widest transition ${
        isActive ? "text-violet-400" : "text-zinc-600 hover:text-zinc-400"
      } ${className}`}
    >
      {label}
      {isActive && <span className="text-[8px]">{sortDir === "asc" ? " ↑" : " ↓"}</span>}
    </button>
  );
}

function MovepoolTable({ moveNames, moveCache }: { moveNames: string[]; moveCache: Map<string, SlimMove> }) {
  const [sortCol, setSortCol] = useState<SortCol>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [groupByType, setGroupByType]         = useState(false);
  const [groupByCategory, setGroupByCategory] = useState(false);

  function handleSort(col: SortCol) {
    if (sortCol === col) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir(col === "power" || col === "accuracy" ? "desc" : "asc");
    }
  }

  const sorted = useMemo(() => {
    const arr = moveNames.map(name => ({ name, data: moveCache.get(name) ?? null }));
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortCol) {
        case "name":     cmp = a.name.localeCompare(b.name); break;
        case "type":     cmp = (a.data?.type     ?? "\xff").localeCompare(b.data?.type     ?? "\xff"); break;
        case "category": cmp = (a.data?.category ?? "\xff").localeCompare(b.data?.category ?? "\xff"); break;
        case "power":    cmp = (a.data?.power    ?? -1) - (b.data?.power    ?? -1); break;
        case "accuracy": cmp = (a.data?.accuracy ?? -1) - (b.data?.accuracy ?? -1); break;
        case "pp":       cmp = (a.data?.pp       ??  0) - (b.data?.pp       ??  0); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [moveNames, moveCache, sortCol, sortDir]);

  // Nested groups: type (primary) → category (secondary)
  type Row = { name: string; data: SlimMove | null };
  type SubGroup = { catKey: string | null; rows: Row[] };
  type Group    = { typeKey: string | null; subgroups: SubGroup[] };

  const groups = useMemo((): Group[] => {
    function splitByCat(rows: Row[]): SubGroup[] {
      if (!groupByCategory) return [{ catKey: null, rows }];
      const map = new Map<string, Row[]>();
      for (const r of rows) {
        const k = r.data?.category ?? "unknown";
        if (!map.has(k)) map.set(k, []);
        map.get(k)!.push(r);
      }
      return [...map.keys()].sort().map(k => ({ catKey: k, rows: map.get(k)! }));
    }

    if (!groupByType) {
      return [{ typeKey: null, subgroups: splitByCat(sorted) }];
    }

    const map = new Map<string, Row[]>();
    for (const r of sorted) {
      const k = r.data?.type ?? "unknown";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    }
    return [...map.keys()].sort().map(k => ({
      typeKey: k,
      subgroups: splitByCat(map.get(k)!),
    }));
  }, [sorted, groupByType, groupByCategory]);

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Movepool</p>
          <span className="text-[10px] text-zinc-700">{moveNames.length} moves</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="mr-1 text-[9px] font-semibold uppercase tracking-widest text-zinc-700">Group</span>
          <button
            onClick={() => setGroupByType(v => !v)}
            className={`rounded-md px-2 py-0.5 text-[9px] font-semibold transition ${
              groupByType ? "bg-violet-500/20 text-violet-300" : "text-zinc-600 hover:text-zinc-400"
            }`}
          >
            Type
          </button>
          <button
            onClick={() => setGroupByCategory(v => !v)}
            className={`rounded-md px-2 py-0.5 text-[9px] font-semibold transition ${
              groupByCategory ? "bg-violet-500/20 text-violet-300" : "text-zinc-600 hover:text-zinc-400"
            }`}
          >
            Category
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900/20">
        {/* Column headers */}
        <div className="flex items-center gap-2 border-b border-zinc-800/60 bg-zinc-900/60 px-3 py-1.5">
          <div className="w-[52px] shrink-0">
            <SortButton col="type" label="Type" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
          </div>
          <div className="flex-1 min-w-0">
            <SortButton col="name" label="Name" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
          </div>
          <div className="w-16 shrink-0">
            <SortButton col="category" label="Cat" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
          </div>
          <div className="w-9 shrink-0 flex justify-end">
            <SortButton col="power" label="Pwr" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="justify-end" />
          </div>
          <div className="w-10 shrink-0 flex justify-end">
            <SortButton col="accuracy" label="Acc" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="justify-end" />
          </div>
          <div className="w-9 shrink-0 flex justify-end">
            <SortButton col="pp" label="PP" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="justify-end" />
          </div>
        </div>

        {/* Rows */}
        <div className="max-h-80 overflow-y-auto">
          {groups.map(({ typeKey, subgroups }) => (
            <div key={typeKey ?? "all"}>
              {/* Type group header */}
              {typeKey !== null && (
                <div className="sticky top-0 z-10 flex items-center gap-2 bg-zinc-900/80 px-3 py-1 backdrop-blur-sm">
                  {typeKey !== "unknown" ? (
                    <>
                      <TypeBadge type={typeKey as PokemonType} size="sm" />
                      <span className="text-[10px] text-zinc-600">
                        ({subgroups.reduce((n, sg) => n + sg.rows.length, 0)})
                      </span>
                    </>
                  ) : (
                    <span className="text-[10px] text-zinc-600">
                      Unknown ({subgroups.reduce((n, sg) => n + sg.rows.length, 0)})
                    </span>
                  )}
                </div>
              )}

              {subgroups.map(({ catKey, rows }) => (
                <div key={catKey ?? "all"}>
                  {/* Category sub-group header */}
                  {catKey !== null && (
                    <div className="flex items-center gap-2 bg-zinc-900/40 px-3 py-0.5">
                      {catKey !== "unknown" ? (
                        <>
                          <span
                            className="text-[9px] font-bold uppercase tracking-widest"
                            style={{ color: CATEGORY_COLORS[catKey as MoveCategory] }}
                          >
                            {catKey}
                          </span>
                          <span className="text-[9px] text-zinc-700">({rows.length})</span>
                        </>
                      ) : (
                        <span className="text-[9px] text-zinc-700">Unknown ({rows.length})</span>
                      )}
                    </div>
                  )}

                  {/* Data rows */}
                  {rows.map(({ name, data }) => {
                    const typeColor = data ? TYPE_COLORS[data.type] : "#3f3f46";
                    return (
                      <div
                        key={name}
                        className="flex items-center gap-2 border-l-2 px-3 py-1.5 transition hover:bg-zinc-800/40"
                        style={{ borderLeftColor: typeColor }}
                      >
                        <div className="w-[52px] shrink-0">
                          {data ? (
                            <TypeBadge type={data.type} size="sm" />
                          ) : (
                            <span className="text-[9px] text-zinc-700">—</span>
                          )}
                        </div>
                        <span className="flex-1 min-w-0 truncate text-xs capitalize text-zinc-200">
                          {name.replace(/-/g, " ")}
                        </span>
                        <div className="w-16 shrink-0">
                          {data ? (
                            <span
                              className="text-[9px] font-bold uppercase tracking-wide"
                              style={{ color: CATEGORY_COLORS[data.category] }}
                            >
                              {data.category}
                            </span>
                          ) : (
                            <span className="text-[9px] text-zinc-700">—</span>
                          )}
                        </div>
                        <span className="w-9 shrink-0 text-right text-xs tabular-nums text-zinc-400">
                          {data?.power ?? "—"}
                        </span>
                        <span className="w-10 shrink-0 text-right text-xs tabular-nums text-zinc-500">
                          {data?.accuracy != null ? `${data.accuracy}%` : "—"}
                        </span>
                        <span className="w-9 shrink-0 text-right text-[10px] tabular-nums text-zinc-600">
                          {data ? String(data.pp) : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main tab ──────────────────────────────────────────────────────────────────

export function PokemonTab() {
  const [query, setQuery]             = useState("");
  const [typeFilters, setTypeFilters] = useState<PokemonType[]>([]);
  const [championsOnly, setChampionsOnly] = useState(true);
  const [chosen, setChosen]           = useState<string | null>(null);

  const moveCache = useMemo(() => {
    return new Map<string, SlimMove>(
      COMPETITIVE_MOVES.map(mv => [mv.slug, {
        type: mv.type, category: mv.category,
        power: mv.power, accuracy: mv.accuracy, pp: mv.pp,
      }])
    );
  }, []);

  const { data: allSummaries = [] } = api.pokemon.listSummaries.useQuery(undefined, { staleTime: Infinity });
  const { data: vgcData = [] }      = api.pokemon.getVgcTopPicks.useQuery(undefined, { staleTime: Infinity });
  const { data: pokemon, isFetching } = api.pokemon.search.useQuery(
    { query: chosen ?? "" },
    { enabled: !!chosen, retry: false },
  );

  const pool = championsOnly && vgcData.length > 0 ? vgcData : allSummaries;

  const matches = useMemo(() => {
    if (!query && typeFilters.length === 0) return pool;
    const q = query.toLowerCase().replace(/\s/g, "-");
    return pool.filter(s => {
      const nameMatch = !query || s.name.includes(q);
      const typeMatch = typeFilters.length === 0 || typeFilters.every(f => s.types.includes(f));
      return nameMatch && typeMatch;
    });
  }, [query, pool, typeFilters]);

  const bst = pokemon ? Object.values(pokemon.baseStats).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="flex items-start gap-4">
      {/* ── Left: search + grid ───────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name…"
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30"
          />
          <button
            role="switch"
            aria-checked={championsOnly}
            onClick={() => setChampionsOnly(v => !v)}
            className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
              championsOnly
                ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                : "border-zinc-700 bg-zinc-900 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span>★</span>
            <span>Champions</span>
          </button>
        </div>

        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-3 py-2">
          <TypeFilterBar selected={typeFilters} onChange={setTypeFilters} />
        </div>

        <div className="flex items-center justify-between px-0.5">
          <span className="text-[11px] text-zinc-600">{matches.length} Pokémon</span>
          {typeFilters.length > 0 && (
            <button onClick={() => setTypeFilters([])} className="text-[11px] text-violet-500 hover:text-violet-400">
              Clear filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2">
          {matches.map(s => (
            <button
              key={s.name}
              onClick={() => setChosen(s.name)}
              className={`group flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center transition ${
                chosen === s.name
                  ? "border-violet-500/50 bg-violet-900/20"
                  : "border-zinc-800/50 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-800/60"
              }`}
            >
              <Image src={s.sprite} alt={s.name} width={64} height={64} unoptimized className="drop-shadow-sm" />
              <span className="w-full truncate text-[10px] capitalize leading-tight text-zinc-500 group-hover:text-zinc-300">
                {s.name.replace(/-/g, " ")}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Right: detail panel ───────────────────────────────────────────── */}
      <div
        className="panel-card sticky top-4 w-[48rem] shrink-0 overflow-y-auto p-5"
        style={{ maxHeight: "calc(100vh - 8rem)" }}
      >
        {isFetching ? (
          <div className="space-y-3">
            <div className="shimmer h-28 rounded-2xl" />
            <div className="shimmer h-4 rounded-lg" />
            <div className="shimmer h-4 w-3/4 rounded-lg" />
            <div className="shimmer h-36 rounded-xl" />
          </div>
        ) : pokemon && chosen ? (
          <div className="flex flex-col gap-5">

            {/* Identity */}
            <div className="flex items-center gap-4">
              <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl bg-zinc-800/80">
                <Image src={pokemon.sprite} alt={pokemon.name} width={100} height={100} unoptimized className="drop-shadow-lg" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="truncate text-lg font-bold capitalize tracking-tight text-white">
                    {pokemon.name.replace(/-/g, " ")}
                  </h2>
                  <span className="shrink-0 text-sm text-zinc-500">
                    #{String(pokemon.pokeApiId).padStart(3, "0")}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {pokemon.types.map(t => <TypeBadge key={t} type={t} />)}
                </div>
                <div className="rounded-md bg-zinc-800/80 px-2 py-1 text-center text-xs font-semibold text-zinc-400">
                  BST {bst}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {/* Base stats */}
              <div className="w-full">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Base Stats</p>
                <div className="flex flex-col gap-0.5">
                  <StatBar label="HP"     value={pokemon.baseStats.hp} />
                  <StatBar label="Atk"    value={pokemon.baseStats.attack} />
                  <StatBar label="Def"    value={pokemon.baseStats.defense} />
                  <StatBar label="Sp.Atk" value={pokemon.baseStats.spAttack} />
                  <StatBar label="Sp.Def" value={pokemon.baseStats.spDefense} />
                  <StatBar label="Speed"  value={pokemon.baseStats.speed} />
                </div>
              </div>

              {/* Type matchups */}
              <TypeMatchupGrid defenderTypes={pokemon.types} />
            </div>

            {/* Movepool table */}
            {pokemon.moveNames.length > 0 && (
              <MovepoolTable moveNames={pokemon.moveNames} moveCache={moveCache} />
            )}

          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-zinc-800">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-800">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <circle cx="12" cy="12" r="3" fill="currentColor" />
              </svg>
            </div>
            <p className="text-xs text-zinc-600">Click a Pokémon to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}
