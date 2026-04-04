/**
 * Top bar — mobile menu, product title, theme toggle, user menu.
 */

"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { data: session } = useSession();

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border",
        "bg-background/80 px-4 backdrop-blur-md md:px-6"
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onMenuClick}
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground md:text-base">
          Permit Processing &amp; Document Management
        </p>
        <p className="hidden text-xs text-muted-foreground sm:block">PermitPro PMS</p>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <ThemeToggle />
        {session?.user ? (
          <Link
            href={session.user.role === "admin" ? "/settings/organization" : "/dashboard"}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5 shadow-sm transition-colors hover:bg-muted/60"
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
              aria-hidden
            >
              {session.user.name?.charAt(0).toUpperCase() ?? "?"}
            </span>
            <span className="hidden text-left text-sm lg:block">
              <span className="block max-w-[140px] truncate font-medium text-foreground">
                {session.user.name}
              </span>
              <span className="block max-w-[140px] truncate text-xs text-muted-foreground">
                {session.user.email}
              </span>
            </span>
          </Link>
        ) : null}
      </div>
    </header>
  );
}
