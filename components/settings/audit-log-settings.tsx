"use client";

import * as React from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";

interface Row {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  details: string | null;
  createdAt: string;
  user: { name: string; email: string } | null;
}

export function AuditLogSettings() {
  const [rows, setRows] = React.useState<Row[]>([]);
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [msg, setMsg] = React.useState("");

  const fetchPage = React.useCallback(async (c: string | null, append: boolean) => {
    const url = new URL("/api/admin/audit-log", window.location.origin);
    url.searchParams.set("limit", "40");
    if (c) url.searchParams.set("cursor", c);
    const res = await fetch(url.toString(), { credentials: "include" });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Load failed");
    setRows((prev) => (append ? [...prev, ...json.data] : json.data));
    setCursor(json.nextCursor ?? null);
  }, []);

  React.useEffect(() => {
    (async () => {
      try {
        await fetchPage(null, false);
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Load failed");
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchPage]);

  if (loading) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        description="Administrative changes to settings, feature flags, and configuration. Package-level activity remains on each permit timeline."
      />
      {msg ? <Alert variant="destructive">{msg}</Alert> : null}
      <Card>
        <CardHeader>
          <CardTitle>Recent events</CardTitle>
          <CardDescription>Newest first. Pagination uses cursor IDs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDateTime(r.createdAt)}
                  </TableCell>
                  <TableCell>
                    {r.user ? (
                      <span className="text-sm">
                        {r.user.name}
                        <span className="block text-xs text-muted-foreground">{r.user.email}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.action}</TableCell>
                  <TableCell className="text-sm">
                    {r.resourceType}
                    {r.resourceId ? (
                      <span className="block truncate text-xs text-muted-foreground">{r.resourceId}</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate font-mono text-xs text-muted-foreground">
                    {r.details ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {rows.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">No admin audit entries yet</p>
          ) : null}
          {cursor ? (
            <Button type="button" variant="outline" onClick={() => fetchPage(cursor, true)}>
              Load more
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
