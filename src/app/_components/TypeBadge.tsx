import { type PokemonType } from "~/lib/types";

const TYPE_CONFIG: Record<
  PokemonType,
  { bg: string; light: string; text: string }
> = {
  normal:   { bg: "#A8A878", light: "#C8C8A8", text: "#fff" },
  fire:     { bg: "#F08030", light: "#FFAA58", text: "#fff" },
  water:    { bg: "#6890F0", light: "#90B0FF", text: "#fff" },
  electric: { bg: "#F8D030", light: "#FFE868", text: "#3f3f3f" },
  grass:    { bg: "#78C850", light: "#9AE070", text: "#fff" },
  ice:      { bg: "#98D8D8", light: "#C0EEEE", text: "#3f3f3f" },
  fighting: { bg: "#C03028", light: "#E05040", text: "#fff" },
  poison:   { bg: "#A040A0", light: "#C060C0", text: "#fff" },
  ground:   { bg: "#E0C068", light: "#F0DC90", text: "#3f3f3f" },
  flying:   { bg: "#A890F0", light: "#C8B0FF", text: "#fff" },
  psychic:  { bg: "#F85888", light: "#FF80A8", text: "#fff" },
  bug:      { bg: "#A8B820", light: "#C8D840", text: "#fff" },
  rock:     { bg: "#B8A038", light: "#D8C058", text: "#fff" },
  ghost:    { bg: "#705898", light: "#9070B8", text: "#fff" },
  dragon:   { bg: "#7038F8", light: "#9060FF", text: "#fff" },
  dark:     { bg: "#705848", light: "#906868", text: "#fff" },
  steel:    { bg: "#B8B8D0", light: "#D8D8E8", text: "#3f3f3f" },
  fairy:    { bg: "#EE99AC", light: "#FFB8C8", text: "#fff" },
};

interface TypeBadgeProps {
  type: PokemonType;
  size?: "sm" | "md";
}

export function TypeBadge({ type, size = "md" }: TypeBadgeProps) {
  const { bg, light, text } = TYPE_CONFIG[type];
  const padding = size === "sm" ? "0.125rem 0.5rem" : "0.2rem 0.65rem";
  const fontSize = size === "sm" ? "0.65rem" : "0.72rem";

  return (
    <span
      style={{
        background: `linear-gradient(135deg, ${light} 0%, ${bg} 65%)`,
        color: text,
        padding,
        fontSize,
        fontWeight: 700,
        letterSpacing: "0.07em",
        textTransform: "capitalize",
        borderRadius: "9999px",
        display: "inline-flex",
        alignItems: "center",
        lineHeight: 1,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.3), 0 1px 4px rgba(0,0,0,0.45), 0 0 0 1px rgba(0,0,0,0.15)`,
        whiteSpace: "nowrap",
      }}
    >
      {type}
    </span>
  );
}
