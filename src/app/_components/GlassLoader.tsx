interface GlassLoaderProps {
  className?: string;
}

export function GlassLoader({ className }: GlassLoaderProps) {
  return (
    <div
      aria-hidden
      className={`absolute inset-0 z-10 overflow-hidden rounded-[inherit] ${className ?? ""}`}
    >
      <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-[2px]" />
      <div className="shimmer absolute inset-0" />
    </div>
  );
}
