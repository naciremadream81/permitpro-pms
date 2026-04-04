"use client";

/**
 * Secondary navigation for the admin settings hub — mirrors IA from the product plan.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Building2,
  Users,
  Bell,
  Plug,
  Shield,
  CreditCard,
  Globe,
  Database,
  Flag,
  ScrollText,
  FileStack,
} from "lucide-react";

const links = [
  { href: "/settings/organization", label: "Organization & branding", icon: Building2 },
  { href: "/settings/users", label: "Users & roles", icon: Users },
  { href: "/settings/notifications", label: "Notifications", icon: Bell },
  { href: "/settings/integrations", label: "Integrations", icon: Plug },
  { href: "/settings/security", label: "Security", icon: Shield },
  { href: "/settings/billing", label: "Billing", icon: CreditCard },
  { href: "/settings/localization", label: "Localization", icon: Globe },
  { href: "/settings/backup", label: "Backup & retention", icon: Database },
  { href: "/settings/feature-flags", label: "Feature flags", icon: Flag },
  { href: "/settings/audit-log", label: "Audit log", icon: ScrollText },
  { href: "/settings/permit-types", label: "Permit types & checklists", icon: FileStack },
] as const;

export function SettingsNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav
      className="w-full shrink-0 lg:w-56 xl:w-64"
      aria-label="Settings sections"
    >
      <div className="rounded-lg border border-border bg-card p-2 shadow-sm">
        <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Admin settings
        </p>
        <ul className="space-y-0.5">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                  <span className="leading-snug">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
