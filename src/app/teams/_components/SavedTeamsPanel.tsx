"use client";

import { useState } from "react";
import Image from "next/image";
import { api } from "~/trpc/react";
import { TypeBadge } from "~/app/_components/TypeBadge";
import { type PokemonType } from "~/lib/types";

interface SavedTeamsPanelProps {
  onLoad: (teamId: number) => Promise<void>;
}

export function SavedTeamsPanel({ onLoad }: SavedTeamsPanelProps) {
  const { data: teams = [] } = api.team.list.useQuery();
  const utils = api.useUtils();
  const deleteTeam = api.team.delete.useMutation({
    onSuccess: () => utils.team.list.invalidate(),
  });
  const [loadingId, setLoadingId] = useState<number | null>(null);

  if (teams.length === 0) return null;

  return (
    <div className="flex flex-col gap-4 border-t border-zinc-800 pt-8">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold">Saved Teams</h2>
        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
          {teams.length}
        </span>
      </div>
      {teams.map(team => {
        const sorted = [...team.slots].sort((a, b) => a.position - b.position);
        return (
          <div
            key={team.id}
            className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 transition hover:border-zinc-700"
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{team.name}</h3>
                <p className="text-xs text-zinc-500">
                  {team.slots.length} Pokémon · {new Date(team.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    setLoadingId(team.id);
                    await onLoad(team.id);
                    setLoadingId(null);
                  }}
                  disabled={loadingId === team.id}
                  className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50"
                >
                  {loadingId === team.id ? "Loading…" : "Load"}
                </button>
                <button
                  onClick={() => deleteTeam.mutate({ id: team.id })}
                  disabled={deleteTeam.isPending}
                  className="rounded-lg px-2 py-1.5 text-xs text-zinc-600 transition hover:bg-zinc-800 hover:text-red-400 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {Array.from({ length: 6 }).map((_, i) => {
                const slot = sorted[i];
                return slot ? (
                  <div key={slot.id} className="flex flex-col items-center gap-1">
                    <Image
                      src={slot.sprite}
                      alt={slot.name}
                      width={40}
                      height={40}
                      unoptimized
                      className="drop-shadow"
                    />
                    <div className="flex flex-wrap justify-center gap-0.5">
                      {slot.types.map(t => (
                        <TypeBadge key={t} type={t as PokemonType} size="sm" />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div
                    key={i}
                    className="flex h-10 items-center justify-center rounded-lg border border-dashed border-zinc-800 text-xs text-zinc-700"
                  >
                    —
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
