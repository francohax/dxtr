"use client";

import Link from "next/link";
import { api } from "~/trpc/react";
import { TeamCard } from "./TeamCard";

export function SavedTeamsList() {
  const [teams] = api.team.list.useSuspenseQuery();

  if (teams.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-zinc-800 py-16 text-center">
        <p className="text-zinc-500">No teams saved yet.</p>
        <Link
          href="/teams"
          className="rounded-xl bg-violet-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-violet-500"
        >
          Build your first team
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {teams.map(team => (
        <TeamCard
          key={team.id}
          id={team.id}
          name={team.name}
          slots={team.slots}
          createdAt={team.createdAt}
        />
      ))}
    </div>
  );
}
