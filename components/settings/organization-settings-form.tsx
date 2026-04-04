"use client";

/**
 * Branding and display identity for the organization (persisted in OrganizationSettings).
 */

import * as React from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { patchAdminSettingsSection } from "@/lib/settings-api";

type OrgRow = {
  displayName: string;
  tagline: string | null;
  logoUrl: string | null;
  primaryHex: string;
  accentHex: string;
};

export function OrganizationSettingsForm() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [form, setForm] = React.useState<OrgRow>({
    displayName: "PermitPro",
    tagline: "",
    logoUrl: "",
    primaryHex: "#2563eb",
    accentHex: "#7c3aed",
  });

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/settings", { credentials: "include" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load");
        const o = json.data.organization as OrgRow;
        if (!cancelled) {
          setForm({
            displayName: o.displayName,
            tagline: o.tagline ?? "",
            logoUrl: o.logoUrl ?? "",
            primaryHex: o.primaryHex,
            accentHex: o.accentHex,
          });
        }
      } catch (e) {
        if (!cancelled) {
          setMessage({ type: "err", text: e instanceof Error ? e.message : "Load failed" });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await patchAdminSettingsSection("organization", {
        displayName: form.displayName,
        tagline: form.tagline || null,
        logoUrl: form.logoUrl || null,
        primaryHex: form.primaryHex,
        accentHex: form.accentHex,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      setMessage({ type: "ok", text: "Organization settings saved." });
    } catch (e) {
      setMessage({ type: "err", text: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization & branding"
        description="Name, tagline, logo URL, and accent colors used across the admin experience and future white-label surfaces."
      />

      {message ? (
        <Alert variant={message.type === "ok" ? "default" : "destructive"}>{message.text}</Alert>
      ) : null}

      <form onSubmit={onSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Identity</CardTitle>
            <CardDescription>
              These values are stored in the database and can power exports, emails, and UI chrome.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                value={form.displayName}
                onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={form.tagline ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
                placeholder="Optional short subtitle"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input
                id="logoUrl"
                type="url"
                value={form.logoUrl ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
                placeholder="https://…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="primaryHex">Primary color</Label>
              <Input
                id="primaryHex"
                value={form.primaryHex}
                onChange={(e) => setForm((f) => ({ ...f, primaryHex: e.target.value }))}
                pattern="^#[0-9A-Fa-f]{6}$"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accentHex">Accent color</Label>
              <Input
                id="accentHex"
                value={form.accentHex}
                onChange={(e) => setForm((f) => ({ ...f, accentHex: e.target.value }))}
                pattern="^#[0-9A-Fa-f]{6}$"
                required
              />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
