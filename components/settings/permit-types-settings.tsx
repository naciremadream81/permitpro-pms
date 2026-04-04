"use client";

import * as React from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatPermitType } from "@/lib/utils";

export function PermitTypesSettings() {
  const [types, setTypes] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/permit-types", { credentials: "include" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load");
        setTypes(json.data);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p className="text-muted-foreground">Loading permit types…</p>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Permit types & checklists"
        description="Permit categories are defined in the database schema. Checklist rules are jurisdiction requirements — configure them per county, scoped by permit type."
        actions={
          <Link
            href="/admin/jurisdictions"
            className={cn(
              "inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm",
              "transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
          >
            Manage jurisdictions
          </Link>
        }
      />
      {err ? (
        <p className="text-sm text-destructive" role="alert">
          {err}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Canonical permit types</CardTitle>
          <CardDescription>
            Adding a new type requires a schema migration and checklist review. Each requirement row can target one or more types or{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">*</code> for all.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-wrap gap-2">
            {types.map((t) => (
              <li key={t}>
                <Badge variant="secondary" className="text-sm font-normal">
                  {formatPermitType(t)}
                </Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Checklist authoring</CardTitle>
          <CardDescription>
            Open a jurisdiction, then add or edit requirements. The checklist engine materializes items onto packages when coordinators generate
            checklists.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link
            href="/admin/jurisdictions"
            className={cn(
              "inline-flex h-10 items-center justify-center rounded-md border border-input bg-card px-4 text-sm font-medium shadow-sm",
              "transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
          >
            Jurisdictions
          </Link>
          <Link
            href="/admin/export-profiles"
            className={cn(
              "inline-flex h-10 items-center justify-center rounded-md border border-input bg-card px-4 text-sm font-medium shadow-sm",
              "transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
          >
            Export profiles
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
