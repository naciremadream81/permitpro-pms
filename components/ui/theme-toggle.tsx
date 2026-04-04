"use client";

/**
 * Accessible theme cycle control: system → light → dark.
 * Uses next-themes; labels exposed for screen readers.
 */

import * as React from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Cycle = "system" | "light" | "dark";

const order: Cycle[] = ["system", "light", "dark"];

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const current = (theme ?? "system") as Cycle;
  const next = order[(order.indexOf(current) + 1) % order.length];

  const Icon =
    !mounted ? Monitor : current === "system" ? Monitor : current === "dark" ? Moon : Sun;

  const label =
    !mounted
      ? "Theme: system"
      : current === "system"
        ? `Theme: system (${resolvedTheme ?? "system"})`
        : `Theme: ${current}`;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn("h-9 w-9 shrink-0 p-0", className)}
      onClick={() => setTheme(next)}
      aria-label={`${label}. Click to switch to ${next}.`}
      title={`${label} — next: ${next}`}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </Button>
  );
}
