"use client";

import * as React from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface FlagRow {
  id: string;
  key: string;
  enabled: boolean;
  description: string | null;
}

export function FeatureFlagsSettings() {
  const [rows, setRows] = React.useState<FlagRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [newKey, setNewKey] = React.useState("");
  const [newDesc, setNewDesc] = React.useState("");

  const load = React.useCallback(async () => {
    const res = await fetch("/api/admin/feature-flags", { credentials: "include" });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Load failed");
    setRows(json.data);
  }, []);

  React.useEffect(() => {
    (async () => {
      try {
        await load();
      } catch (e) {
        setMsg({ ok: false, text: e instanceof Error ? e.message : "Load failed" });
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  async function toggle(row: FlagRow) {
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/feature-flags/${row.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !row.enabled }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Update failed");
      await load();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Update failed" });
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this feature flag?")) return;
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/feature-flags/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Delete failed");
      await load();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Delete failed" });
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      const res = await fetch("/api/admin/feature-flags", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: newKey, description: newDesc || undefined, enabled: false }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Create failed");
      setNewKey("");
      setNewDesc("");
      await load();
      setMsg({ ok: true, text: "Feature flag created." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Create failed" });
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feature flags"
        description="Gradual rollout and kill switches. Read flags in API routes or server components with a small helper when you wire enforcement."
      />
      {msg ? <Alert variant={msg.ok ? "default" : "destructive"}>{msg.text}</Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle>Create flag</CardTitle>
          <CardDescription>Use lowercase_snake or dot.case keys. Example: exports.zip_v2</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="fkey">Key</Label>
              <Input
                id="fkey"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="my_feature"
                required
              />
            </div>
            <div className="flex-[2] space-y-2">
              <Label htmlFor="fdesc">Description</Label>
              <Input
                id="fdesc"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="What behavior does this gate?"
              />
            </div>
            <Button type="submit">Add</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active flags</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.key}</TableCell>
                  <TableCell className="text-muted-foreground">{r.description ?? "—"}</TableCell>
                  <TableCell>
                    <Button type="button" size="sm" variant={r.enabled ? "default" : "outline"} onClick={() => toggle(r)}>
                      {r.enabled ? "On" : "Off"}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button type="button" size="sm" variant="destructive" onClick={() => remove(r.id)}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {rows.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">No flags yet</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
