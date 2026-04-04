/**
 * Primary navigation — desktop rail + mobile overlay drawer.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Users,
  Wrench,
  BarChart3,
  Settings,
  LogOut,
  ClipboardCheck,
  MapPin,
  Package,
  ChevronDown,
  ChevronRight,
  X,
} from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

const mainNav: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Permits", href: "/permits", icon: FileText },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Contractors", href: "/contractors", icon: Wrench },
  { name: "Review Queue", href: "/review-queue", icon: ClipboardCheck },
  { name: "Reports", href: "/reports", icon: BarChart3 },
];

const adminNav: NavItem[] = [
  { name: "Jurisdictions", href: "/admin/jurisdictions", icon: MapPin },
  { name: "Export Profiles", href: "/admin/export-profiles", icon: Package },
  { name: "Admin Settings", href: "/settings/organization", icon: Settings },
];

function NavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
      {item.name}
    </Link>
  );
}

function SidebarInner({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const [adminOpen, setAdminOpen] = React.useState(
    adminNav.some((i) => pathname === i.href || pathname?.startsWith(i.href + "/"))
  );

  return (
    <>
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="text-lg font-bold tracking-tight text-sidebar-foreground"
        >
          Permit<span className="text-primary">Pro</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4" aria-label="Main">
        {mainNav.map((item) => (
          <NavLink key={item.name} item={item} pathname={pathname} onNavigate={onNavigate} />
        ))}

        {isAdmin ? (
          <div className="pt-4">
            <button
              type="button"
              onClick={() => setAdminOpen((o) => !o)}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              Admin
              {adminOpen ? (
                <ChevronDown className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              )}
            </button>
            {adminOpen ? (
              <div className="mt-1 space-y-0.5 border-l-2 border-border pl-2 ml-2">
                {adminNav.map((item) => (
                  <NavLink key={item.name} item={item} pathname={pathname} onNavigate={onNavigate} />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </nav>

      <div className="space-y-1 border-t border-sidebar-border p-2">
        {session?.user ? (
          <div className="rounded-md px-3 py-2">
            <p className="truncate text-xs font-medium text-sidebar-foreground">{session.user.name}</p>
            <p className="truncate text-xs capitalize text-muted-foreground">
              {session.user.role ?? "coordinator"}
            </p>
          </div>
        ) : null}
        <Link
          href="/api/auth/signout"
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors",
            "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          )}
        >
          <LogOut className="h-4 w-4" aria-hidden />
          Sign out
        </Link>
      </div>
    </>
  );
}

export function Sidebar({
  mobileOpen,
  onMobileClose,
}: {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  const pathname = usePathname() ?? "";

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-background/80 backdrop-blur-sm transition-opacity md:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        aria-hidden={!mobileOpen}
        onClick={onMobileClose}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(280px,88vw)] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-lg transition-transform md:static md:z-0 md:w-60 md:translate-x-0 md:shadow-none",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
        aria-label="Application sidebar"
      >
        <div className="flex items-center justify-end border-b border-sidebar-border p-2 md:hidden">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onMobileClose}
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <SidebarInner pathname={pathname} onNavigate={onMobileClose} />
      </aside>
    </>
  );
}
