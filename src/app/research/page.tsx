import { api, HydrateClient } from "~/trpc/server";
import { ResearchPageClient } from "./_components/ResearchPageClient";

export const dynamic = "force-dynamic";

export default async function ResearchPage() {
  void api.pokemon.listSummaries.prefetch();
  void api.pokemon.getVgcTopPicks.prefetch();
  return (
    <HydrateClient>
      <ResearchPageClient />
    </HydrateClient>
  );
}
