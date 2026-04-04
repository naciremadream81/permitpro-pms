"use client";

import * as React from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { patchAdminSettingsSection } from "@/lib/settings-api";

type BackupPrefs = {
  snapshotRetentionDays: number;
  exportRetentionDays: number;
  databaseBackupNotes: string;
};

const defaults: BackupPrefs = {
  snapshotRetentionDays: 90,
  exportRetentionDays: 365,
  databaseBackupNotes: "",
};

function parse(raw: string): BackupPrefs {
  try {
    return { ...defaults, ...(JSON.parse(raw || "{}") as Partial<BackupPrefs>) };
  } catch {
    return { ...defaults };
  }
}

export function BackupSettings() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [prefs, setPrefs] = React.useState<BackupPrefs>(defaults);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/settings", { credentials: "include" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Load failed");
        setPrefs(parse(json.data.organization.backupRetentionConfig));
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
      const res = await patchAdminSettingsSection("backup", prefs);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      setMsg({ ok: true, text: "Backup & retention policy saved." });
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
        title="Backup & retention"
        description="Operational guidance for snapshots, exports, and database backups. Automated jobs should read these targets."
      />
      {msg ? <Alert variant={msg.ok ? "default" : "destructive"}>{msg.text}</Alert> : null}
      <Card>
        <CardHeader>
          <CardTitle>Retention targets</CardTitle>
          <CardDescription>
            Package snapshots are already modeled in the database; this section documents how long to keep artifacts.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid max-w-xl gap-4">
          <div className="space-y-2">
            <Label htmlFor="snap">Snapshot retention (days)</Label>
            <Input
              id="snap"
              type="number"
              min={1}
              value={prefs.snapshotRetentionDays}
              onChange={(e) =>
                setPrefs((p) => ({ ...p, snapshotRetentionDays: Number(e.target.value) || 0 }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="exp">Export artifact retention (days)</Label>
            <Input
              id="exp"
              type="number"
              min={1}
              value={prefs.exportRetentionDays}
              onChange={(e) =>
                setPrefs((p) => ({ ...p, exportRetentionDays: Number(e.target.value) || 0 }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dbnotes">Database / off-site backup notes</Label>
            <Textarea
              id="dbnotes"
              value={prefs.databaseBackupNotes}
              onChange={(e) => setPrefs((p) => ({ ...p, databaseBackupNotes: e.target.value }))}
              rows={4}
            />
          </div>
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
