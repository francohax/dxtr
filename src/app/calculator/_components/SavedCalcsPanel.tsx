"use client";

import { useAuth } from "@clerk/nextjs";
import { SignInButton } from "@clerk/nextjs";
import { api, type RouterOutputs } from "~/trpc/react";
import { SavedCalcCard } from "./SavedCalcCard";

type SavedCalc = RouterOutputs["calc"]["list"][number];

interface SavedCalcsPanelProps {
  onLoadCalc?: (calc: SavedCalc) => void;
}

export function SavedCalcsPanel({ onLoadCalc }: SavedCalcsPanelProps) {
  const { isSignedIn } = useAuth();

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-zinc-800/60 px-4 py-3">
      </div>

      {isSignedIn ? (
        <SavedCalcsList onLoadCalc={onLoadCalc} />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-xs text-zinc-600">Sign in to save and recall calculations.</p>
          <SignInButton mode="modal">
            <button className="rounded-lg bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-400 transition hover:bg-violet-500/20">
              Sign in
            </button>
          </SignInButton>
        </div>
      )}
    </div>
  );
}

function SavedCalcsList({ onLoadCalc }: { onLoadCalc?: (calc: SavedCalc) => void }) {
  const { data: calcs, isLoading, refetch } = api.calc.list.useQuery();
  const deleteMutation = api.calc.delete.useMutation({
    onSuccess: () => void refetch(),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 p-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-zinc-800/50" />
        ))}
      </div>
    );
  }

  if (!calcs || calcs.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <p className="text-xs text-zinc-600">No saved calculations yet.</p>
        <p className="mt-1 text-[11px] text-zinc-700">Run a calc and hit Save to record it here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
      {calcs.map(calc => (
        <SavedCalcCard
          key={calc.id}
          calc={calc}
          onDelete={id => deleteMutation.mutate({ id })}
          onLoad={onLoadCalc}
        />
      ))}
    </div>
  );
}
