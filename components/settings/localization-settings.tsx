"use client";

import * as React from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { patchAdminSettingsSection } from "@/lib/settings-api";

type Loc = {
  locale: string;
  timeZone: string;
  dateFormat: string;
  weekStartsOn: "sunday" | "monday";
};

const defaults: Loc = {
  locale: "en-US",
  timeZone: "America/New_York",
  dateFormat: "MM/dd/yyyy",
  weekStartsOn: "sunday",
};

function parse(raw: string): Loc {
  try {
    return { ...defaults, ...(JSON.parse(raw || "{}") as Partial<Loc>) };
  } catch {
    return { ...defaults };
  }
}

export function LocalizationSettings() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [loc, setLoc] = React.useState<Loc>(defaults);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/settings", { credentials: "include" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Load failed");
        setLoc(parse(json.data.organization.localizationConfig));
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
      const res = await patchAdminSettingsSection("localization", loc);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      setMsg({ ok: true, text: "Localization saved." });
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
        title="Localization"
        description="Locale, time zone, and display formats. Runtime i18n can consume this bundle when translations are added."
      />
      {msg ? <Alert variant={msg.ok ? "default" : "destructive"}>{msg.text}</Alert> : null}
      <Card>
        <CardHeader>
          <CardTitle>Regional preferences</CardTitle>
          <CardDescription>Applies to new sessions and reporting exports that honor org defaults.</CardDescription>
        </CardHeader>
        <CardContent className="grid max-w-xl gap-4">
          <div className="space-y-2">
            <Label htmlFor="locale">Locale (BCP 47)</Label>
            <Input
              id="locale"
              value={loc.locale}
              onChange={(e) => setLoc((l) => ({ ...l, locale: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tz">Time zone</Label>
            <Input
              id="tz"
              value={loc.timeZone}
              onChange={(e) => setLoc((l) => ({ ...l, timeZone: e.target.value }))}
              placeholder="IANA e.g. America/Chicago"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="df">Date format</Label>
            <Input
              id="df"
              value={loc.dateFormat}
              onChange={(e) => setLoc((l) => ({ ...l, dateFormat: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="week">Week starts on</Label>
            <Select
              id="week"
              value={loc.weekStartsOn}
              onChange={(e) =>
                setLoc((l) => ({ ...l, weekStartsOn: e.target.value as Loc["weekStartsOn"] }))
              }
            >
              <option value="sunday">Sunday</option>
              <option value="monday">Monday</option>
            </Select>
          </div>
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
