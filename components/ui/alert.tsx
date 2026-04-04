/**
 * Inline alert for errors, warnings, and success messages.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export function Alert({
  variant = "default",
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "destructive" | "success";
}) {
  const styles: Record<NonNullable<typeof variant>, string> = {
    default: "border-border bg-muted/50 text-foreground",
    destructive: "border-destructive/40 bg-destructive/10 text-destructive dark:text-destructive-foreground",
    success: "border-success/40 bg-success/10 text-success dark:text-success-foreground",
  };

  return (
    <div
      role="alert"
      className={cn("rounded-lg border px-4 py-3 text-sm", styles[variant], className)}
      {...props}
    >
      {children}
    </div>
  );
}
