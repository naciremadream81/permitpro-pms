"use client";

import * as React from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { patchAdminSettingsSection } from "@/lib/settings-api";

type NotificationPrefs = {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  digestDaily: boolean;
};

const defaults: NotificationPrefs = {
  emailEnabled: true,
  inAppEnabled: true,
  digestDaily: false,
};

function mergePrefs(raw: string): NotificationPrefs {
  try {
    const p = JSON.parse(raw || "{}") as Partial<NotificationPrefs>;
    return { ...defaults, ...p };
  } catch {
    return { ...defaults };
  }
}

export function NotificationsSettings() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [prefs, setPrefs] = React.useState<NotificationPrefs>(defaults);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/settings", { credentials: "include" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Load failed");
        setPrefs(mergePrefs(json.data.organization.notificationConfig));
      } catch (e) {
        setMsg({ ok: false, text: e instanceof Error ? e.message : "Load failed" });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await patchAdminSettingsSection("notifications", prefs);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      setMsg({ ok: true, text: "Notification preferences saved." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Channel preferences for operational alerts. Delivery workers can read this configuration when email or push is wired in."
      />
      {msg ? <Alert variant={msg.ok ? "default" : "destructive"}>{msg.text}</Alert> : null}
      <Card>
        <CardHeader>
          <CardTitle>Channels</CardTitle>
          <CardDescription>Toggle how coordinators and reviewers receive system-generated events.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(
            [
              ["emailEnabled", "Email summaries & critical alerts"],
              ["inAppEnabled", "In-app notification center"],
              ["digestDaily", "Daily digest (when dispatcher supports it)"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-3">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={prefs[key]}
                onChange={(e) => setPrefs((p) => ({ ...p, [key]: e.target.checked }))}
              />
              <span className="text-sm font-medium">{label}</span>
            </label>
          ))}
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
