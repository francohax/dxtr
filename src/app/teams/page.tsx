import { api, HydrateClient } from "~/trpc/server";
import { TeamBuilder } from "./_components/TeamBuilder";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  void api.team.list.prefetch();
  void api.pokemon.listNames.prefetch();
  return (
    <HydrateClient>
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Team Builder</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Build your team, configure moves and stats, then save or load from your collection below.
          </p>
        </div>
        <TeamBuilder />
      </div>
    </HydrateClient>
  );
}
