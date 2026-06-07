import { api, HydrateClient } from "~/trpc/server";
import { TeamBuilder } from "./_components/TeamBuilder";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  void api.team.list.prefetch();
  void api.pokemon.listNames.prefetch();
  return (
    <HydrateClient>
        <TeamBuilder />
    </HydrateClient>
  );
}
