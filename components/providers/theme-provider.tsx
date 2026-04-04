"use client";

/**
 * Theme provider — persisted light / dark / system preference via next-themes.
 * Uses `class` on <html> so Tailwind `dark:` variants apply consistently.
 */

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="permitpro-theme"
    >
      {children}
    </NextThemesProvider>
  );
}
