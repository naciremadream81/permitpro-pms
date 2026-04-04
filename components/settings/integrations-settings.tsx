"use client";

import * as React from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { patchAdminSettingsSection } from "@/lib/settings-api";

export function IntegrationsSettings() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [text, setText] = React.useState("[]");
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/settings", { credentials: "include" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Load failed");
        const raw = json.data.organization.integrationConfig;
        try {
          const parsed = JSON.parse(raw || "[]");
          setText(JSON.stringify(parsed, null, 2));
        } catch {
          setText("[]");
        }
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
      const payload = JSON.parse(text);
      if (!Array.isArray(payload)) throw new Error("Root JSON must be an array");
      const res = await patchAdminSettingsSection("integrations", payload);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      setText(JSON.stringify(payload, null, 2));
      setMsg({ ok: true, text: "Integration catalog saved." });
    } catch (e) {
      setMsg({
        ok: false,
        text: e instanceof Error ? e.message : "Invalid JSON or save failed",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        description="Store integration metadata as structured JSON (webhooks, email providers, accounting). Secrets should live in environment variables — reference keys here only."
      />
      {msg ? <Alert variant={msg.ok ? "default" : "destructive"}>{msg.text}</Alert> : null}
      <Card>
        <CardHeader>
          <CardTitle>Integration catalog</CardTitle>
          <CardDescription>Array of objects. Validate JSON before rolling to production.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="integrations-json">JSON</Label>
            <Textarea
              id="integrations-json"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[240px] font-mono text-xs"
              spellCheck={false}
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
