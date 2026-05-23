interface SkeletonBlockProps {
  className?: string;
}

export function SkeletonBlock({ className }: SkeletonBlockProps) {
  return (
    <div
      aria-hidden
      className={`relative overflow-hidden rounded-lg bg-zinc-800/50 ${className ?? ""}`}
    >
      <div className="shimmer absolute inset-0" />
    </div>
  );
}
