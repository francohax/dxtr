import { PrismaClient } from "../generated/prisma/index.js";

const prisma = new PrismaClient();
const BASE = "https://pokeapi.co/api/v2";
const CONCURRENCY = 8;

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
}

async function fetchAllNames(): Promise<string[]> {
  const res = await fetch(`${BASE}/pokemon?limit=10000&offset=0`);
  if (!res.ok) throw new Error(`Failed to list Pokemon: ${res.status}`);
  const data = (await res.json()) as { results: { name: string }[] };
  return data.results.map((p) => p.name);
}

async function upsertPokemon(name: string): Promise<void> {
  const res = await fetch(`${BASE}/pokemon/${name}`);
  if (!res.ok) {
    process.stdout.write(`  ⚠ skip ${name} (${res.status})\n`);
    return;
  }
  const raw = (await res.json()) as RawPokemon;
  const stats = Object.fromEntries(raw.stats.map((s) => [s.stat.name, s.base_stat]));
  const sprite =
    raw.sprites.other?.["official-artwork"]?.front_default ??
    raw.sprites.front_default ??
    "";
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
    moveNames: raw.moves.map((m) => m.move.name),
  };
  await prisma.cachedPokemon.upsert({
    where: { id: raw.id },
    create: { id: raw.id, ...payload },
    update: payload,
  });
}

async function main() {
  console.log("Fetching Pokemon list from PokeAPI…");
  const names = await fetchAllNames();
  console.log(`Seeding ${names.length} Pokemon (${CONCURRENCY} parallel)…`);

  for (let i = 0; i < names.length; i += CONCURRENCY) {
    const batch = names.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map((n) => upsertPokemon(n)));
    const done = Math.min(i + CONCURRENCY, names.length);
    process.stdout.write(
      `\r  ${done}/${names.length} (${Math.round((done / names.length) * 100)}%)`,
    );
  }

  console.log("\nDone — Pokemon cache is up to date.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  void prisma.$disconnect();
  process.exit(1);
});
