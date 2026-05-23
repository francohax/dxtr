import { api, HydrateClient } from "~/trpc/server";
import { DamageCalculator } from "./_components/DamageCalculator";

export default async function CalculatorPage() {
  void api.pokemon.listNames.prefetch();
  return (
    <HydrateClient>
      <div className="flex flex-col items-center">
        <div className="w-full max-w-2xl lg:max-w-5xl">
          <DamageCalculator />
        </div>
      </div>
    </HydrateClient>
  );
}
