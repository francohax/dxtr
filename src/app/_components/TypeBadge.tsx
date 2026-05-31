import { type PokemonType } from "~/lib/types";

const TYPE_COLOURS: Record<PokemonType, string> = {
  normal:   "bg-[#A8A878] text-white",
  fire:     "bg-[#F08030] text-white",
  water:    "bg-[#6890F0] text-white",
  electric: "bg-[#F8D030] text-zinc-900",
  grass:    "bg-[#78C850] text-white",
  ice:      "bg-[#98D8D8] text-zinc-900",
  fighting: "bg-[#C03028] text-white",
  poison:   "bg-[#A040A0] text-white",
  ground:   "bg-[#E0C068] text-zinc-900",
  flying:   "bg-[#A890F0] text-white",
  psychic:  "bg-[#F85888] text-white",
  bug:      "bg-[#A8B820] text-white",
  rock:     "bg-[#B8A038] text-white",
  ghost:    "bg-[#705898] text-white",
  dragon:   "bg-[#7038F8] text-white",
  dark:     "bg-[#705848] text-white",
  steel:    "bg-[#B8B8D0] text-zinc-900",
  fairy:    "bg-[#EE99AC] text-white",
};

interface TypeBadgeProps {
  type: PokemonType;
  size?: "sm" | "md";
}

export function TypeBadge({ type, size = "md" }: TypeBadgeProps) {
  const colour = TYPE_COLOURS[type];
  const padding = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";
  return (
    <span className={`${colour} ${padding} inline-block rounded-full font-semibold capitalize tracking-wide antialiased ring-1 ring-inset ring-white/20 shadow-sm shadow-black/30`}>
      {type}
    </span>
  );
}
