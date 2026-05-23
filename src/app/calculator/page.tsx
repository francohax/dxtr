import { api, HydrateClient } from "~/trpc/server";
import { DamageCalculator } from "./_components/DamageCalculator";

export default async function CalculatorPage() {
  void api.pokemon.listNames.prefetch();
  return (
    <HydrateClient>
      <div className="flex flex-col items-center">
        <div className="w-full max-w-2xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight">Damage Calculator</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Level 50 · Base stats · Gen 6+ formula
            </p>
          </div>
          <DamageCalculator />
        </div>
      </div>
    </HydrateClient>
  );
}
