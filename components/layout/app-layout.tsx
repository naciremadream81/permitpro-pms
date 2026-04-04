/**
 * App shell — responsive layout with sidebar rail and scrollable main region.
 */

"use client";

import * as React from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { cn } from "@/lib/utils";

export function AppLayout({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenuClick={() => setMobileOpen(true)} />
        <main className={cn("flex-1 overflow-y-auto p-4 md:p-6 lg:p-8", className)}>
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
