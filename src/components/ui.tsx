import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

/* ------------------------------------------------------------------ */
/* Button                                                              */
/* ------------------------------------------------------------------ */

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-canopy-400/60 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-canopy-500 text-slate-bark-950 hover:bg-canopy-400 shadow-[0_0_0_1px_rgba(143,217,171,0.25),0_8px_24px_-12px_rgba(54,165,108,0.9)]",
        secondary:
          "bg-slate-bark-800 text-slate-bark-100 hover:bg-slate-bark-700 border border-slate-bark-700",
        ghost: "text-slate-bark-300 hover:bg-slate-bark-800 hover:text-slate-bark-100",
        outline:
          "border border-canopy-700/60 text-canopy-200 hover:bg-canopy-900/50 hover:border-canopy-500",
        brass:
          "bg-brass-400 text-slate-bark-950 hover:bg-brass-300 shadow-[0_0_0_1px_rgba(224,176,92,0.25),0_8px_24px_-12px_rgba(224,176,92,0.8)]",
        danger: "bg-red-500/15 text-red-300 hover:bg-red-500/25 border border-red-500/30",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-12 px-7 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

/* ------------------------------------------------------------------ */
/* Card                                                                */
/* ------------------------------------------------------------------ */

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-slate-bark-800 bg-slate-bark-900/60 backdrop-blur-sm",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 border-b border-slate-bark-800 px-4 py-3",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-bark-300",
        className,
      )}
      {...props}
    />
  );
}

export function CardBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)} {...props} />;
}

/* ------------------------------------------------------------------ */
/* Input                                                               */
/* ------------------------------------------------------------------ */

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      "flex h-9 w-full rounded-md border border-slate-bark-700 bg-slate-bark-950 px-3 py-1 text-sm text-slate-bark-100 outline-none transition-colors placeholder:text-slate-bark-500 focus:border-canopy-500 focus:ring-1 focus:ring-canopy-500/40 disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

/* ------------------------------------------------------------------ */
/* Label                                                               */
/* ------------------------------------------------------------------ */

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "text-xs font-medium text-slate-bark-300 select-none",
        className,
      )}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Badge                                                               */
/* ------------------------------------------------------------------ */

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "green" | "brass" | "red" | "glass";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-wide",
        tone === "neutral" &&
          "border-slate-bark-700 bg-slate-bark-800 text-slate-bark-300",
        tone === "green" &&
          "border-canopy-700 bg-canopy-900/60 text-canopy-200",
        tone === "brass" &&
          "border-brass-400/40 bg-brass-400/10 text-brass-300",
        tone === "red" && "border-red-500/40 bg-red-500/10 text-red-300",
        tone === "glass" && "border-glass-400/40 bg-glass-400/10 text-glass-200",
        className,
      )}
      {...props}
    />
  );
}
