export type StatKey = "hp" | "attack" | "defense" | "spAttack" | "spDefense" | "speed";

export type NatureKey =
  | "hardy" | "lonely" | "brave" | "adamant" | "naughty"
  | "bold"  | "docile" | "relaxed" | "impish" | "lax"
  | "timid" | "hasty"  | "serious" | "jolly"  | "naive"
  | "modest" | "mild"  | "quiet"   | "bashful" | "rash"
  | "calm"  | "gentle" | "sassy"   | "careful" | "quirky";

export const NATURES: Record<string, { boost: StatKey | null; reduce: StatKey | null }> = {
  hardy:   { boost: null,          reduce: null },
  lonely:  { boost: "attack",      reduce: "defense" },
  brave:   { boost: "attack",      reduce: "speed" },
  adamant: { boost: "attack",      reduce: "spAttack" },
  naughty: { boost: "attack",      reduce: "spDefense" },
  bold:    { boost: "defense",     reduce: "attack" },
  docile:  { boost: null,          reduce: null },
  relaxed: { boost: "defense",     reduce: "speed" },
  impish:  { boost: "defense",     reduce: "spAttack" },
  lax:     { boost: "defense",     reduce: "spDefense" },
  timid:   { boost: "speed",       reduce: "attack" },
  hasty:   { boost: "speed",       reduce: "defense" },
  serious: { boost: null,          reduce: null },
  jolly:   { boost: "speed",       reduce: "spAttack" },
  naive:   { boost: "speed",       reduce: "spDefense" },
  modest:  { boost: "spAttack",    reduce: "attack" },
  mild:    { boost: "spAttack",    reduce: "defense" },
  quiet:   { boost: "spAttack",    reduce: "speed" },
  bashful: { boost: null,          reduce: null },
  rash:    { boost: "spAttack",    reduce: "spDefense" },
  calm:    { boost: "spDefense",   reduce: "attack" },
  gentle:  { boost: "spDefense",   reduce: "defense" },
  sassy:   { boost: "spDefense",   reduce: "speed" },
  careful: { boost: "spDefense",   reduce: "spAttack" },
  quirky:  { boost: null,          reduce: null },
};

export const NATURE_NAMES = Object.keys(NATURES) as string[];

export function getNatureMultiplier(nature: string, stat: StatKey): number {
  const n = NATURES[nature];
  if (!n) return 1.0;
  if (n.boost === stat) return 1.1;
  if (n.reduce === stat) return 0.9;
  return 1.0;
}

// ─── Plan API ─────────────────────────────────────────────────────────────────

// [boosted stat, lowered stat] — null = neutral
const NATURE_EFFECTS: Record<NatureKey, [StatKey | null, StatKey | null]> = {
  hardy:   [null,        null],
  lonely:  ["attack",   "defense"],
  brave:   ["attack",   "speed"],
  adamant: ["attack",   "spAttack"],
  naughty: ["attack",   "spDefense"],
  bold:    ["defense",  "attack"],
  docile:  [null,        null],
  relaxed: ["defense",  "speed"],
  impish:  ["defense",  "spAttack"],
  lax:     ["defense",  "spDefense"],
  timid:   ["speed",    "attack"],
  hasty:   ["speed",    "defense"],
  serious: [null,        null],
  jolly:   ["speed",    "spAttack"],
  naive:   ["speed",    "spDefense"],
  modest:  ["spAttack", "attack"],
  mild:    ["spAttack", "defense"],
  quiet:   ["spAttack", "speed"],
  bashful: [null,        null],
  rash:    ["spAttack", "spDefense"],
  calm:    ["spDefense", "attack"],
  gentle:  ["spDefense", "defense"],
  sassy:   ["spDefense", "speed"],
  careful: ["spDefense", "spAttack"],
  quirky:  [null,        null],
};

export function getNatureMult(nature: NatureKey, stat: StatKey): number {
  const [boosted, lowered] = NATURE_EFFECTS[nature];
  if (boosted === stat) return 1.1;
  if (lowered === stat)  return 0.9;
  return 1.0;
}

export function getNatureModifiedStats(nature: NatureKey): { boosted: StatKey | null; lowered: StatKey | null } {
  const [boosted, lowered] = NATURE_EFFECTS[nature];
  return { boosted, lowered };
}

export const NATURE_KEYS: NatureKey[] = [
  "hardy", "lonely", "brave", "adamant", "naughty",
  "bold",  "docile", "relaxed", "impish", "lax",
  "timid", "hasty",  "serious", "jolly",  "naive",
  "modest", "mild",  "quiet",   "bashful", "rash",
  "calm",  "gentle", "sassy",   "careful", "quirky",
];

export function calcStat(opts: {
  base: number;
  iv: number;
  ev: number;
  level: number;
  nature: string;
  stat: StatKey;
}): number {
  const { base, iv, ev, level, nature, stat } = opts;
  const core = 2 * base + iv + Math.floor(ev / 4);
  if (stat === "hp") {
    return Math.floor((core * level) / 100) + level + 10;
  }
  const raw = Math.floor((core * level) / 100) + 5;
  return Math.floor(raw * getNatureMultiplier(nature, stat));
}
