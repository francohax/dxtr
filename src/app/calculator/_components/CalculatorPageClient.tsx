"use client";

import { useState } from "react";
import { type RouterOutputs } from "~/trpc/react";
import { DamageCalculator } from "./DamageCalculator";
import { SavedCalcsPanel } from "./SavedCalcsPanel";

type SavedCalc = RouterOutputs["calc"]["list"][number];

export function CalculatorPageClient() {
  const [loadRequest, setLoadRequest] = useState<SavedCalc | null>(null);

  return (
    <div className="flex h-full min-h-screen">
      <div className="mx-auto flex-1 overflow-y-auto">
        <DamageCalculator
          loadRequest={loadRequest}
          onLoadClear={() => setLoadRequest(null)}
        />
      </div>
      <aside className="hidden w-72 shrink-0 border-l border-zinc-800/60 lg:flex lg:flex-col">
        <SavedCalcsPanel onLoadCalc={setLoadRequest} />
      </aside>
    </div>
  );
}
