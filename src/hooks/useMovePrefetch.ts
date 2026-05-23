import { useState, useEffect, useRef } from "react";
import { api } from "~/trpc/react";
import { type PokemonType, type MoveCategory } from "~/lib/types";

export interface MoveSummary {
  type:     PokemonType;
  category: MoveCategory;
  power:    number | null;
}

/**
 * Prefetches the first 24 move names via the tRPC cache, populating a Map as
 * each result arrives. Results are served from React Query's client-side cache
 * on subsequent opens, and from Next.js's HTTP cache at the server layer.
 * Cancels in-flight work on unmount or when the move list changes.
 */
export function useMovePrefetch(moveNames: string[], enabled: boolean): Map<string, MoveSummary> {
  const [summaries, setSummaries] = useState<Map<string, MoveSummary>>(new Map());
  const utils = api.useUtils();
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled || moveNames.length === 0) {
      setSummaries(new Map());
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setSummaries(new Map());

    const toFetch = moveNames.slice(0, 24);
    toFetch.forEach(name => {
      utils.pokemon.getMove.fetch({ moveName: name })
        .then(move => {
          if (controller.signal.aborted) return;
          setSummaries(prev => {
            const next = new Map(prev);
            next.set(name, { type: move.type, category: move.category, power: move.power });
            return next;
          });
        })
        .catch(() => { /* skip moves that fail silently */ });
    });

    return () => { controller.abort(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveNames, enabled]);

  return summaries;
}
