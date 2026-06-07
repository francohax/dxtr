import { type ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-violet-600 text-white shadow-sm shadow-violet-900/40 hover:bg-violet-500 hover:-translate-y-px active:translate-y-0 active:bg-violet-700 disabled:bg-violet-800 disabled:text-violet-400",
  secondary:
    "border border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800 hover:-translate-y-px active:translate-y-0 disabled:text-zinc-600 disabled:border-zinc-800",
  danger:
    "border border-transparent text-red-400 hover:border-red-800 hover:bg-red-950/40 hover:text-red-300 active:bg-red-950/60 disabled:text-zinc-600",
  ghost:
    "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 disabled:text-zinc-700",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-2 text-sm",
  lg: "px-6 py-2.5 text-sm",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "secondary", size = "md", className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        {...props}
        className={[
          "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none",
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          className,
        ].join(" ")}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
