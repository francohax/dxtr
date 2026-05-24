import { api, HydrateClient } from "~/trpc/server";
import { CalculatorPageClient } from "./_components/CalculatorPageClient";

export const dynamic = "force-dynamic";

export default async function CalculatorPage() {
  void api.pokemon.listNames.prefetch();
  return (
    <HydrateClient>
      <CalculatorPageClient />
    </HydrateClient>
  );
}
