"use client";

import Image from "next/image";
import { api } from "~/trpc/react";
import { TypeBadge } from "~/app/_components/TypeBadge";
import { type PokemonType } from "~/lib/types";

interface TeamCardProps {
  id: number;
  name: string;
  slots: {
    id: number;
    position: number;
    name: string;
    sprite: string;
    types: string[];
  }[];
  createdAt: Date;
}

export function TeamCard({ id, name, slots, createdAt }: TeamCardProps) {
  const utils = api.useUtils();
  const deleteTeam = api.team.delete.useMutation({
    onSuccess: () => utils.team.list.invalidate(),
  });

  const sorted = [...slots].sort((a, b) => a.position - b.position);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-zinc-700">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold">{name}</h3>
          <p className="text-xs text-zinc-500">
            {createdAt.toLocaleDateString()} · {slots.length} Pokémon
          </p>
        </div>
        <button
          onClick={() => deleteTeam.mutate({ id })}
          disabled={deleteTeam.isPending}
          className="rounded-lg px-2 py-1 text-xs text-zinc-600 transition hover:bg-zinc-800 hover:text-red-400 disabled:opacity-50"
        >
          Delete
        </button>
      </div>

      <div className="grid grid-cols-6 gap-2">
        {Array.from({ length: 6 }).map((_, i) => {
          const slot = sorted[i];
          return slot ? (
            <div key={slot.id} className="flex flex-col items-center gap-1">
              <Image src={slot.sprite} alt={slot.name} width={48} height={48} unoptimized className="drop-shadow" />
              <div className="flex flex-wrap justify-center gap-0.5">
                {slot.types.map(t => <TypeBadge key={t} type={t as PokemonType} size="sm" />)}
              </div>
            </div>
          ) : (
            <div key={i} className="flex h-12 items-center justify-center rounded-lg border border-dashed border-zinc-800 text-zinc-700">
              —
            </div>
          );
        })}
      </div>
    </div>
  );
}
