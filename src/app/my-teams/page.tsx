import { api, HydrateClient } from "~/trpc/server";
import { SavedTeamsList } from "./_components/SavedTeamsList";

export default async function MyTeamsPage() {
  void api.team.list.prefetch();
  return (
    <HydrateClient>
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">My Teams</h1>
          <p className="mt-1 text-sm text-zinc-400">All your saved teams.</p>
        </div>
        <SavedTeamsList />
      </div>
    </HydrateClient>
  );
}
