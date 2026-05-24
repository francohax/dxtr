import { api, HydrateClient } from "~/trpc/server";
import { DamageCalculator } from "./_components/DamageCalculator";
import { SavedCalcsPanel } from "./_components/SavedCalcsPanel";

export default async function CalculatorPage() {
  void api.pokemon.listNames.prefetch();
  return (
    <HydrateClient>
      <div className="flex h-full min-h-screen">
        {/* Left: calculator */}
        <div className="flex-1 overflow-y-auto">
          <DamageCalculator />
        </div>

        {/* Right: saved calcs — lg+ only */}
        <aside className="hidden w-80 shrink-0 border-l border-zinc-800/60 lg:flex lg:flex-col">
          <SavedCalcsPanel />
        </aside>
      </div>
    </HydrateClient>
  );
}
