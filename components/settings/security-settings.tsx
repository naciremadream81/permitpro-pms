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

type SecurityPrefs = {
  requireMfa: boolean;
  sessionTimeoutMinutes: number;
  ipAllowlist: string;
  notes: string;
};

const defaults: SecurityPrefs = {
  requireMfa: false,
  sessionTimeoutMinutes: 480,
  ipAllowlist: "",
  notes: "",
};

function parse(raw: string): SecurityPrefs {
  try {
    return { ...defaults, ...(JSON.parse(raw || "{}") as Partial<SecurityPrefs>) };
  } catch {
    return { ...defaults };
  }
}

export function SecuritySettings() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [prefs, setPrefs] = React.useState<SecurityPrefs>(defaults);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/settings", { credentials: "include" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Load failed");
        setPrefs(parse(json.data.organization.securityConfig));
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
      const res = await patchAdminSettingsSection("security", prefs);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      setMsg({ ok: true, text: "Security policy saved." });
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
        title="Security"
        description="Policy knobs for sessions and future MFA. Enforcement hooks can read this record as the single source of truth."
      />
      {msg ? <Alert variant={msg.ok ? "default" : "destructive"}>{msg.text}</Alert> : null}
      <Card>
        <CardHeader>
          <CardTitle>Access policy</CardTitle>
          <CardDescription>Document intent here even before automated enforcement ships.</CardDescription>
        </CardHeader>
        <CardContent className="grid max-w-xl gap-4">
          <label className="flex items-center gap-3 rounded-md border border-border p-3">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={prefs.requireMfa}
              onChange={(e) => setPrefs((p) => ({ ...p, requireMfa: e.target.checked }))}
            />
            <span className="text-sm font-medium">Require MFA (when provider is configured)</span>
          </label>
          <div className="space-y-2">
            <Label htmlFor="session">Session timeout (minutes)</Label>
            <Input
              id="session"
              type="number"
              min={5}
              max={10080}
              value={prefs.sessionTimeoutMinutes}
              onChange={(e) =>
                setPrefs((p) => ({ ...p, sessionTimeoutMinutes: Number(e.target.value) || 0 }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ip">IP allowlist (CIDR or IPs, one per line)</Label>
            <Textarea
              id="ip"
              value={prefs.ipAllowlist}
              onChange={(e) => setPrefs((p) => ({ ...p, ipAllowlist: e.target.value }))}
              rows={4}
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Admin notes</Label>
            <Textarea
              id="notes"
              value={prefs.notes}
              onChange={(e) => setPrefs((p) => ({ ...p, notes: e.target.value }))}
              rows={3}
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
