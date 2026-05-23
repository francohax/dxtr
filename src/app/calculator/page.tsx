import { api, HydrateClient } from "~/trpc/server";
import { DamageCalculator } from "./_components/DamageCalculator";

export default async function CalculatorPage() {
  void api.pokemon.listNames.prefetch();
  return (
    <HydrateClient>
      <div className="flex flex-col items-center">
        <div className="w-full max-w-2xl lg:max-w-5xl">
          <div className="mb-8 text-center">


            {/* Hotkey legend */}
            <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-[11px] text-zinc-700">
              {([
                [["1", "2"],        "Attacker / Defender"],
                [["e", "b"],        "EV / Buff panel"],
                [["a","s","↑","↓"], "Phys / Spec stat"],
                [["+","−","← →"],   "Adjust value"],
                [["Enter"],         "Pokemon search"],
                [["K"],             "Move search"],
                [["Esc"],           "Clear focus"],
                [["1–0"],           "Type filter (in picker)"],
              ] as [string[], string][]).map(([keys, desc]) => (
                <span key={desc} className="flex items-center gap-1">
                  {keys.map(k => (
                    <kbd key={k} className="rounded bg-zinc-900 px-1 py-0.5 font-mono text-zinc-600">{k}</kbd>
                  ))}
                  <span>{desc}</span>
                </span>
              ))}
            </div>


          </div>
          <DamageCalculator />
        </div>
      </div>
    </HydrateClient>
  );
}
