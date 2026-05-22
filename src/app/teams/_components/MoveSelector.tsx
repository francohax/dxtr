"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { TypeBadge } from "~/app/_components/TypeBadge";
import { type MoveDetail, type PokemonType } from "~/lib/types";

interface MoveSelectorProps {
  moveNames: string[];
  selectedMoves: MoveDetail[];
  onToggle: (move: MoveDetail) => void;
}

export function MoveSelector({ moveNames, selectedMoves, onToggle }: MoveSelectorProps) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = moveNames.filter(n =>
    n.includes(search.toLowerCase().replace(/\s/g, "-"))
  );
  const selectedNames = new Set(selectedMoves.map(m => m.name));

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        autoFocus
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Filter moves…"
        className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
      />
      <p className="text-xs text-zinc-500">{selectedMoves.length}/4 moves selected</p>
      <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto pr-1">
        {filtered.map(moveName => (
          <MoveRow
            key={moveName}
            moveName={moveName}
            isSelected={selectedNames.has(moveName)}
            isExpanded={expanded === moveName}
            canSelect={selectedMoves.length < 4 || selectedNames.has(moveName)}
            onToggle={onToggle}
            onExpand={() => setExpanded(prev => prev === moveName ? null : moveName)}
          />
        ))}
      </ul>
    </div>
  );
}

interface MoveRowProps {
  moveName: string;
  isSelected: boolean;
  isExpanded: boolean;
  canSelect: boolean;
  onToggle: (move: MoveDetail) => void;
  onExpand: () => void;
}

function MoveRow({ moveName, isSelected, isExpanded, canSelect, onToggle, onExpand }: MoveRowProps) {
  const { data, isFetching } = api.pokemon.getMove.useQuery(
    { moveName },
    { enabled: isExpanded || isSelected, staleTime: Infinity }
  );

  return (
    <li className={`rounded-xl border transition ${
      isSelected ? "border-violet-600 bg-violet-950" : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
    }`}>
      <div className="flex items-center gap-2 px-3 py-2">
        <button onClick={onExpand} className="flex-1 text-left text-sm capitalize">
          {moveName.replace(/-/g, " ")}
        </button>
        {data && <TypeBadge type={data.type as PokemonType} size="sm" />}
        <button
          disabled={!canSelect && !isSelected}
          onClick={() => { if (data) onToggle(data); else onExpand(); }}
          className={`shrink-0 rounded-lg px-2 py-1 text-xs font-semibold transition ${
            isSelected
              ? "bg-violet-600 text-white hover:bg-red-600"
              : "bg-zinc-700 text-zinc-200 hover:bg-violet-600 hover:text-white disabled:opacity-40"
          }`}
        >
          {isSelected ? "Remove" : isFetching ? "…" : "Add"}
        </button>
      </div>
      {isExpanded && data && (
        <div className="flex gap-4 border-t border-zinc-800 px-3 py-2 text-xs text-zinc-400">
          <span>Cat: <span className="capitalize text-zinc-200">{data.category}</span></span>
          <span>Pwr: <span className="text-zinc-200">{data.power ?? "—"}</span></span>
          <span>Acc: <span className="text-zinc-200">{data.accuracy ?? "—"}</span></span>
          <span>PP: <span className="text-zinc-200">{data.pp}</span></span>
        </div>
      )}
    </li>
  );
}
