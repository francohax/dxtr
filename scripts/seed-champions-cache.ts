/**
 * Seeds the DB cache for every Pokemon in the Champions roster.
 *
 * Move data strategy:
 *   - Stats, sprites, and base moves come from PokeAPI.
 *   - Complete Gen 9 movepools (including egg/tutor moves) come from Showdown learnsets.
 *   - Egg moves from pre-evolution chains are included so Mirror Herb
 *     compatible moves (e.g. Maushold's "After You" via Tandemaus) are present.
 *
 * Usage: pnpm db:seed-champions
 */
import { PrismaClient } from "../generated/prisma/index.js";

const prisma = new PrismaClient();
const BASE = "https://pokeapi.co/api/v2";
const CONCURRENCY = 5;

const CHAMPIONS_POOL: string[] = [
  // Gen 1
  "venusaur", "venusaur-mega",
  "charizard", "charizard-mega-x", "charizard-mega-y",
  "blastoise", "blastoise-mega",
  "beedrill", "beedrill-mega",
  "pidgeot", "pidgeot-mega",
  "arbok", "pikachu",
  "raichu", "raichu-alola",
  "clefable",
  "ninetales", "ninetales-alola",
  "arcanine", "arcanine-hisui",
  "alakazam", "alakazam-mega",
  "machamp", "victreebel",
  "slowbro", "slowbro-mega", "slowbro-galar",
  "gengar", "gengar-mega",
  "kangaskhan", "kangaskhan-mega",
  "starmie",
  "pinsir", "pinsir-mega",
  "tauros", "tauros-paldea-combat-breed", "tauros-paldea-blaze-breed", "tauros-paldea-aqua-breed",
  "gyarados", "gyarados-mega",
  "ditto",
  "vaporeon", "jolteon", "flareon",
  "aerodactyl", "aerodactyl-mega",
  "snorlax", "dragonite",
  // Gen 2
  "meganium",
  "typhlosion", "typhlosion-hisui",
  "feraligatr", "ariados",
  "ampharos", "ampharos-mega",
  "azumarill", "politoed",
  "espeon", "umbreon",
  "slowking", "slowking-galar",
  "forretress",
  "steelix", "steelix-mega",
  "scizor", "scizor-mega",
  "heracross", "heracross-mega",
  "skarmory",
  "houndoom", "houndoom-mega",
  "tyranitar", "tyranitar-mega",
  // Gen 3
  "pelipper",
  "gardevoir", "gardevoir-mega",
  "sableye", "sableye-mega",
  "aggron", "aggron-mega",
  "medicham", "medicham-mega",
  "manectric", "manectric-mega",
  "sharpedo", "sharpedo-mega",
  "camerupt", "camerupt-mega",
  "torkoal",
  "altaria", "altaria-mega",
  "milotic", "castform",
  "banette", "banette-mega",
  "chimecho",
  "absol", "absol-mega",
  "glalie", "glalie-mega",
  // Gen 4
  "torterra", "infernape", "empoleon",
  "luxray", "roserade", "rampardos", "bastiodon",
  "lopunny", "lopunny-mega",
  "spiritomb",
  "garchomp", "garchomp-mega",
  "lucario", "lucario-mega",
  "hippowdon", "toxicroak",
  "abomasnow", "abomasnow-mega",
  "weavile", "rhyperior",
  "leafeon", "glaceon",
  "gliscor", "mamoswine",
  "gallade", "gallade-mega",
  "froslass",
  "rotom", "rotom-heat", "rotom-wash", "rotom-frost", "rotom-fan", "rotom-mow",
  // Gen 5
  "serperior", "emboar",
  "samurott", "samurott-hisui",
  "watchog", "liepard",
  "simisage", "simisear", "simipour",
  "excadrill",
  "audino", "audino-mega",
  "conkeldurr", "whimsicott", "krookodile",
  "cofagrigus", "garbodor",
  "zoroark", "zoroark-hisui",
  "reuniclus", "vanilluxe", "emolga", "chandelure", "beartic",
  "stunfisk", "stunfisk-galar",
  "golurk", "hydreigon", "volcarona",
  // Gen 6
  "chesnaught", "delphox", "greninja",
  "diggersby", "talonflame", "vivillon",
  "floette", "florges",
  "pangoro", "furfrou",
  "meowstic-male", "meowstic-female",
  "aegislash-shield", "aromatisse", "slurpuff",
  "clawitzer", "heliolisk",
  "tyrantrum", "aurorus",
  "sylveon", "hawlucha", "dedenne",
  "goodra", "goodra-hisui",
  "klefki", "trevenant",
  "gourgeist-average", "gourgeist-small", "gourgeist-large", "gourgeist-super",
  "avalugg", "avalugg-hisui",
  "noivern",
  // Gen 7
  "decidueye", "decidueye-hisui",
  "incineroar", "primarina",
  "toucannon", "crabominable",
  "lycanroc-midday", "lycanroc-midnight", "lycanroc-dusk",
  "toxapex", "mudsdale", "araquanid",
  "salazzle", "tsareena",
  "oranguru", "passimian",
  "mimikyu-disguised", "drampa", "kommo-o",
  // Gen 8
  "corviknight",
  "flapple", "appletun",
  "sandaconda", "polteageist", "hatterene",
  "mr-rime", "runerigus", "alcremie", "morpeko-full-belly",
  "dragapult",
  "wyrdeer", "kleavor",
  "basculegion-male", "basculegion-female",
  "sneasler",
  // Gen 9
  "meowscarada", "skeledirge", "quaquaval",
  "maushold-family-of-four", "garganacl",
  "armarouge", "ceruledge",
  "bellibolt", "scovillain", "espathra",
  "tinkaton", "palafin-zero", "orthworm", "glimmora",
  "farigiraf", "kingambit",
  "sinistcha", "archaludon", "hydrapple",
];

// PokeAPI form slug → Showdown learnset key when they diverge
const SHOWDOWN_KEY_OVERRIDES: Record<string, string> = {
  "maushold-family-of-four": "maushold",
  "aegislash-shield": "aegislash",
  "lycanroc-midday": "lycanroc",
  "mimikyu-disguised": "mimikyu",
  "morpeko-full-belly": "morpeko",
  "basculegion-male": "basculegion",
  "basculegion-female": "basculegionfemale",
  "meowstic-male": "meowstic",
  "meowstic-female": "meowsticfemale",
  "gourgeist-average": "gourgeist",
  "palafin-zero": "palafin",
  "tauros-paldea-combat-breed": "taurospaldeacombat",
  "tauros-paldea-blaze-breed": "taurospaldeablaze",
  "tauros-paldea-aqua-breed": "taurospaldeaaqua",
};

interface RawStat { base_stat: number; stat: { name: string } }
interface RawType { type: { name: string } }
interface RawMove { move: { name: string } }
interface RawSprites {
  front_default: string | null;
  other?: { "official-artwork"?: { front_default: string | null } };
}
interface RawPokemon {
  id: number;
  name: string;
  sprites: RawSprites;
  types: RawType[];
  stats: RawStat[];
  moves: RawMove[];
  species: { name: string; url: string };
}
interface RawSpecies {
  evolves_from_species: { name: string; url: string } | null;
}

// showdown-key → Map<moveKey, learnCodes[]>
type ShowdownLearnsets = Map<string, Map<string, string[]>>;

async function fetchShowdownLearnsets(): Promise<ShowdownLearnsets> {
  const res = await fetch("https://play.pokemonshowdown.com/data/learnsets.js");
  const text = await res.text();

  const result: ShowdownLearnsets = new Map();
  const speciesRegex = /(\w+):\{learnset:\{([^}]+)\}/g;
  let m: RegExpExecArray | null;

  while ((m = speciesRegex.exec(text)) !== null) {
    const key = m[1]!.toLowerCase();
    const movesStr = m[2]!;
    const moves = new Map<string, string[]>();
    const moveRegex = /(\w+):\[([^\]]+)\]/g;
    let mm: RegExpExecArray | null;
    while ((mm = moveRegex.exec(movesStr)) !== null) {
      const moveName = mm[1]!.toLowerCase();
      const codes = mm[2]!.replace(/"/g, "").split(",");
      moves.set(moveName, codes);
    }
    result.set(key, moves);
  }
  return result;
}

async function buildMoveNameLookup(): Promise<Map<string, string>> {
  // showdown-key (no hyphens) → PokeAPI slug (hyphenated)
  const res = await fetch(`${BASE}/move?limit=10000`);
  const data = (await res.json()) as { results: { name: string }[] };
  return new Map(data.results.map((m) => [m.name.replace(/-/g, ""), m.name]));
}

// Returns species names of all ancestors, closest first: [parent, grandparent, ...]
async function getAncestors(speciesUrl: string): Promise<string[]> {
  try {
    const res = await fetch(speciesUrl);
    if (!res.ok) return [];
    const spec = (await res.json()) as RawSpecies;
    if (!spec.evolves_from_species) return [];
    const parent = spec.evolves_from_species;
    const grandparents = await getAncestors(parent.url);
    return [parent.name, ...grandparents];
  } catch {
    return [];
  }
}

function showdownKey(pokemonName: string): string {
  return SHOWDOWN_KEY_OVERRIDES[pokemonName] ?? pokemonName.replace(/-/g, "").toLowerCase();
}

function showdownMovesToPokeApi(
  sdKey: string,
  learnsets: ShowdownLearnsets,
  lookup: Map<string, string>,
  eggOnly: boolean,
): string[] {
  const entry = learnsets.get(sdKey);
  if (!entry) return [];

  const out: string[] = [];
  for (const [moveKey, codes] of entry) {
    const isGen9 = codes.some((c) => c.startsWith("9"));
    const isEgg = codes.some((c) => c === "9E");
    if (!isGen9) continue;
    if (eggOnly && !isEgg) continue;
    const apiName = lookup.get(moveKey);
    if (apiName) out.push(apiName);
  }
  return out;
}

const failed: string[] = [];

async function upsertPokemon(
  name: string,
  learnsets: ShowdownLearnsets,
  moveLookup: Map<string, string>,
): Promise<void> {
  const res = await fetch(`${BASE}/pokemon/${name}`);
  if (!res.ok) {
    failed.push(`${name} (HTTP ${res.status})`);
    return;
  }
  const raw = (await res.json()) as RawPokemon;
  const stats = Object.fromEntries(raw.stats.map((s) => [s.stat.name, s.base_stat]));
  const sprite =
    raw.sprites.other?.["official-artwork"]?.front_default ??
    raw.sprites.front_default ??
    "";

  // Start with PokeAPI moves (level-up + TM, already SV-valid)
  const allMoves = new Set(raw.moves.map((m) => m.move.name));

  // Add all Gen 9 moves from Showdown for this Pokemon (catches tutors + any PokeAPI gaps)
  const sdKey = showdownKey(name);
  showdownMovesToPokeApi(sdKey, learnsets, moveLookup, false).forEach((m) => allMoves.add(m));

  // Inherit egg moves from ancestors (Mirror Herb / picnic egg-move transfer chain)
  const ancestors = await getAncestors(raw.species.url);
  for (const ancestor of ancestors) {
    const ancestorKey = ancestor.replace(/-/g, "").toLowerCase();
    showdownMovesToPokeApi(ancestorKey, learnsets, moveLookup, true).forEach((m) =>
      allMoves.add(m),
    );
  }

  const payload = {
    name: raw.name,
    sprite,
    types: raw.types.map((t) => t.type.name),
    hp: stats["hp"] ?? 0,
    attack: stats["attack"] ?? 0,
    defense: stats["defense"] ?? 0,
    spAttack: stats["special-attack"] ?? 0,
    spDefense: stats["special-defense"] ?? 0,
    speed: stats["speed"] ?? 0,
    moveNames: [...allMoves],
  };

  await prisma.cachedPokemon.upsert({
    where: { id: raw.id },
    create: { id: raw.id, ...payload },
    update: payload,
  });
}

async function main() {
  console.log("Fetching Showdown learnsets…");
  const learnsets = await fetchShowdownLearnsets();
  console.log(`  Loaded ${learnsets.size} species.\n`);

  console.log("Fetching PokeAPI move name lookup…");
  const moveLookup = await buildMoveNameLookup();
  console.log(`  Loaded ${moveLookup.size} moves.\n`);

  console.log(`Seeding ${CHAMPIONS_POOL.length} Champions Pokemon (${CONCURRENCY} parallel)…\n`);

  for (let i = 0; i < CHAMPIONS_POOL.length; i += CONCURRENCY) {
    const batch = CHAMPIONS_POOL.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map((n) => upsertPokemon(n, learnsets, moveLookup)));
    const done = Math.min(i + CONCURRENCY, CHAMPIONS_POOL.length);
    process.stdout.write(
      `\r  ${done}/${CHAMPIONS_POOL.length} (${Math.round((done / CHAMPIONS_POOL.length) * 100)}%)`,
    );
  }

  console.log("\n");

  if (failed.length > 0) {
    console.error(`FAILED (${failed.length}):`);
    failed.forEach((f) => console.error(`  ✗ ${f}`));
    process.exit(1);
  } else {
    console.log(`All ${CHAMPIONS_POOL.length} Champions Pokemon seeded with complete movepools.`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  void prisma.$disconnect();
  process.exit(1);
});
