/**
 * Badge & StatusBadge — readable in light and dark.
 */

import * as React from "react";
import { cn, getStatusColor } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "outline" | "secondary";
}

export function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";

  const variants: Record<NonNullable<BadgeProps["variant"]>, string> = {
    default: "bg-muted text-foreground",
    outline: "border border-border text-foreground",
    secondary: "bg-primary/15 text-primary dark:bg-primary/25",
  };

  return (
    <span className={cn(base, variants[variant], className)} {...props}>
      {children}
    </span>
  );
}

export function StatusBadge({
  status,
  className,
  ...props
}: { status: string } & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <Badge className={cn(getStatusColor(status), className)} {...props}>
      {status.replace(/([A-Z])/g, " $1").trim()}
    </Badge>
  );
}
