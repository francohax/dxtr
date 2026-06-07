export interface EvSpot {
  name: string;
  slug: string;
  evYield: number;
  location: string;
}

export interface EvStatRef {
  stat: "hp" | "attack" | "defense" | "spAttack" | "spDefense" | "speed";
  label: string;
  shortLabel: string;
  color: string;
  vitamin: string;
  feather: string;
  spots: EvSpot[];
  tip?: string;
}

export const EV_STAT_REFS: EvStatRef[] = [
  {
    stat: "hp",
    label: "HP",
    shortLabel: "HP",
    color: "#f87171",
    vitamin: "HP Up",
    feather: "Health Feather",
    spots: [
      { name: "Blissey",   slug: "blissey",  evYield: 2, location: "Routes, rare encounter" },
      { name: "Chansey",   slug: "chansey",  evYield: 1, location: "Routes, common" },
      { name: "Snorlax",   slug: "snorlax",  evYield: 2, location: "Overworld (one-time) / raids" },
      { name: "Wooper",    slug: "wooper",   evYield: 1, location: "Wetlands, common" },
    ],
    tip: "Chansey and Blissey are the fastest HP EV grind — find a chansey swarm or use Blissey raids.",
  },
  {
    stat: "attack",
    label: "Attack",
    shortLabel: "Atk",
    color: "#fb923c",
    vitamin: "Protein",
    feather: "Muscle Feather",
    spots: [
      { name: "Gumshoos",  slug: "gumshoos",  evYield: 2, location: "Routes, daytime" },
      { name: "Yungoos",   slug: "yungoos",   evYield: 1, location: "Routes, daytime" },
      { name: "Crabrawler", slug: "crabrawler", evYield: 1, location: "Berry trees" },
      { name: "Carvanha",  slug: "carvanha",  evYield: 1, location: "Fishing, rivers" },
    ],
    tip: "Power items (Power Bracer) add +8 Atk EVs per KO on top of the base yield.",
  },
  {
    stat: "defense",
    label: "Defense",
    shortLabel: "Def",
    color: "#facc15",
    vitamin: "Iron",
    feather: "Resist Feather",
    spots: [
      { name: "Forretress", slug: "forretress", evYield: 2, location: "Bug Den, forest routes" },
      { name: "Pineco",     slug: "pineco",     evYield: 1, location: "Headbutting trees" },
      { name: "Graveler",   slug: "graveler",   evYield: 2, location: "Cave routes" },
      { name: "Geodude",    slug: "geodude",    evYield: 1, location: "Cave routes, common" },
    ],
    tip: "Graveler gives 2 Def EVs per KO. Bring Repels to avoid non-target encounters.",
  },
  {
    stat: "spAttack",
    label: "Sp. Attack",
    shortLabel: "SpA",
    color: "#60a5fa",
    vitamin: "Calcium",
    feather: "Genius Feather",
    spots: [
      { name: "Magneton",  slug: "magneton",   evYield: 2, location: "Power Plant, caves" },
      { name: "Magnemite", slug: "magnemite",  evYield: 1, location: "Power Plant, common" },
      { name: "Gastly",    slug: "gastly",     evYield: 1, location: "Old Chateau, graveyards" },
      { name: "Ralts",     slug: "ralts",      evYield: 1, location: "Routes (rare), early game" },
    ],
    tip: "Magneton is the gold standard for SpA EVs — caves near the Power Plant have high spawn rates.",
  },
  {
    stat: "spDefense",
    label: "Sp. Defense",
    shortLabel: "SpD",
    color: "#4ade80",
    vitamin: "Zinc",
    feather: "Clever Feather",
    spots: [
      { name: "Tentacruel", slug: "tentacruel", evYield: 2, location: "Surfing, open water" },
      { name: "Tentacool",  slug: "tentacool",  evYield: 1, location: "Surfing, common" },
      { name: "Mantine",    slug: "mantine",    evYield: 2, location: "Surfing, rare" },
      { name: "Mantyke",    slug: "mantyke",    evYield: 1, location: "Surfing with Remoraid" },
    ],
    tip: "Surf routes near Tentacool/Tentacruel are the fastest SpD grind in most games.",
  },
  {
    stat: "speed",
    label: "Speed",
    shortLabel: "Spe",
    color: "#f472b6",
    vitamin: "Carbos",
    feather: "Swift Feather",
    spots: [
      { name: "Golbat",    slug: "golbat",     evYield: 2, location: "Caves, common" },
      { name: "Zubat",     slug: "zubat",      evYield: 1, location: "Caves, very common" },
      { name: "Joltik",    slug: "joltik",     evYield: 1, location: "Chargestone Cave" },
      { name: "Diglett",   slug: "diglett",    evYield: 1, location: "Diglett's Cave" },
    ],
    tip: "Golbat in caves gives 2 Spe EVs. Power Anklet adds +8 on top — easy 252 in ~24 KOs.",
  },
];

export const EV_SHORTCUTS = [
  { label: "Vitamins", desc: "+10 EVs per bottle, up to 252 per stat. Stack 25 to cap a stat (250) then add 1 feather." },
  { label: "Power Items", desc: "+8 EVs in the item's stat per KO, in addition to the base EV yield. Best combined with high-yield Pokémon." },
  { label: "Feathers", desc: "+1 EV in the corresponding stat. Unlimited — ideal for fine-tuning leftover EVs." },
  { label: "Macho Brace", desc: "Doubles all EV yield from KOs. Slower than Power Items but works for all stats simultaneously." },
  { label: "Exp. Share (SV+)", desc: "All party members gain EVs from a KO, even if they didn't battle. Great for EV training multiple Pokémon at once." },
];
