import * as React from "react";
import { cn } from "@/lib/utils";

interface RefinedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "accent";
  padding?: "none" | "sm" | "md" | "lg";
}

export function RefinedCard({
  children,
  variant = "default",
  padding = "md",
  className,
  ...props
}: RefinedCardProps) {
  const paddings = {
    none: "p-0",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  const variants = {
    default: "bg-card border border-border shadow-sm",
    elevated: "bg-card border border-border shadow-md",
    accent: "bg-card border-2 border-primary shadow-sm",
  };

  return (
    <div
      className={cn("rounded-xl text-card-foreground transition-all duration-200", variants[variant], paddings[padding], className)}
      {...props}
    >
      {children}
    </div>
  );
}
