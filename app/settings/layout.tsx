/**
 * Admin-only settings hub — wraps primary app shell and section navigation.
 */

import { AppLayout } from "@/components/layout/app-layout";
import { SettingsNav } from "@/components/settings/settings-nav";
import { getSession } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (session.user?.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <SettingsNav />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </AppLayout>
  );
}
