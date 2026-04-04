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

type BillingPrefs = {
  stripeEnabled: boolean;
  accountingSystem: string;
  purchaseOrderPrefix: string;
  invoiceFooterNotes: string;
};

const defaults: BillingPrefs = {
  stripeEnabled: false,
  accountingSystem: "",
  purchaseOrderPrefix: "",
  invoiceFooterNotes: "",
};

function parse(raw: string): BillingPrefs {
  try {
    return { ...defaults, ...(JSON.parse(raw || "{}") as Partial<BillingPrefs>) };
  } catch {
    return { ...defaults };
  }
}

export function BillingSettings() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [prefs, setPrefs] = React.useState<BillingPrefs>(defaults);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/settings", { credentials: "include" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Load failed");
        setPrefs(parse(json.data.organization.billingConfig));
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
      const res = await patchAdminSettingsSection("billing", prefs);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      setMsg({ ok: true, text: "Billing configuration saved." });
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
        title="Billing"
        description="Org-level billing posture complements per-package billing status in PermitPro. Connect payment providers via env vars; store display metadata here."
      />
      {msg ? <Alert variant={msg.ok ? "default" : "destructive"}>{msg.text}</Alert> : null}
      <Card>
        <CardHeader>
          <CardTitle>Accounts receivable</CardTitle>
          <CardDescription>Optional fields for finance handoff and future automation.</CardDescription>
        </CardHeader>
        <CardContent className="grid max-w-xl gap-4">
          <label className="flex items-center gap-3 rounded-md border border-border p-3">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={prefs.stripeEnabled}
              onChange={(e) => setPrefs((p) => ({ ...p, stripeEnabled: e.target.checked }))}
            />
            <span className="text-sm font-medium">Stripe / payments enabled (configure keys in deployment)</span>
          </label>
          <div className="space-y-2">
            <Label htmlFor="acct">Accounting system</Label>
            <Input
              id="acct"
              value={prefs.accountingSystem}
              onChange={(e) => setPrefs((p) => ({ ...p, accountingSystem: e.target.value }))}
              placeholder="QuickBooks, NetSuite, …"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="po">Purchase order prefix</Label>
            <Input
              id="po"
              value={prefs.purchaseOrderPrefix}
              onChange={(e) => setPrefs((p) => ({ ...p, purchaseOrderPrefix: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inv">Invoice footer notes</Label>
            <Textarea
              id="inv"
              value={prefs.invoiceFooterNotes}
              onChange={(e) => setPrefs((p) => ({ ...p, invoiceFooterNotes: e.target.value }))}
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
