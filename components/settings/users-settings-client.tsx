"use client";

/**
 * User directory administration — roles align with lib/permissions (admin, coordinator, reviewer).
 */

import * as React from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

type UserRole = "admin" | "coordinator" | "reviewer";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    activityLogs: number;
    uploadedDocs: number;
  };
}

export function UsersSettingsClient() {
  const [users, setUsers] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [showUserForm, setShowUserForm] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<User | null>(null);
  const [formData, setFormData] = React.useState({
    email: "",
    name: "",
    password: "",
    role: "coordinator" as UserRole,
  });

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users", { credentials: "include" });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setError("You do not have permission to access this page");
          return;
        }
        throw new Error("Failed to fetch users");
      }
      const data = await response.json();
      setUsers(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchUsers();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users";
      const method = editingUser ? "PATCH" : "POST";

      const submitData: Record<string, unknown> = {
        email: formData.email,
        name: formData.name,
        role: formData.role,
      };

      if (editingUser) {
        if (formData.password) submitData.password = formData.password;
      } else {
        if (!formData.password) {
          setError("Password is required for new users");
          return;
        }
        submitData.password = formData.password;
      }

      const response = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        if (response.status === 401 || response.status === 403) {
          setError("You do not have permission to perform this action");
          return;
        }
        throw new Error(errorData.error || "Failed to save user");
      }

      setFormData({ email: "", name: "", password: "", role: "coordinator" });
      setShowUserForm(false);
      setEditingUser(null);
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save user");
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      name: user.name,
      password: "",
      role: (["admin", "coordinator", "reviewer"].includes(user.role)
        ? user.role
        : "coordinator") as UserRole,
    });
    setShowUserForm(true);
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Delete this user? This cannot be undone.")) return;
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || "Failed to delete user");
      }
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    }
  };

  const handleCancel = () => {
    setShowUserForm(false);
    setEditingUser(null);
    setFormData({ email: "", name: "", password: "", role: "coordinator" });
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading users…</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users & roles"
        description="Invite coordinators and reviewers, assign the admin role sparingly, and rotate credentials on departure."
        actions={
          !showUserForm ? (
            <Button type="button" onClick={() => setShowUserForm(true)}>
              Add user
            </Button>
          ) : null
        }
      />

      {error ? <Alert variant="destructive">{error}</Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle>Directory</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {showUserForm ? (
            <form
              onSubmit={handleSubmit}
              className="rounded-lg border border-border bg-muted/30 p-4"
            >
              <h3 className="mb-4 text-lg font-semibold">
                {editingUser ? "Edit user" : "New user"}
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">
                    Password {editingUser ? "(optional)" : ""}
                  </Label>
                  <Input
                    type="password"
                    id="password"
                    name="password"
                    required={!editingUser}
                    value={formData.password}
                    onChange={handleChange}
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select id="role" name="role" required value={formData.role} onChange={handleChange}>
                    <option value="coordinator">Coordinator</option>
                    <option value="reviewer">Reviewer</option>
                    <option value="admin">Admin</option>
                  </Select>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="submit">{editingUser ? "Update user" : "Create user"}</Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : null}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <StatusBadge status={user.role} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user._count.activityLogs} logs · {user._count.uploadedDocs} docs
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => handleEdit(user)}>
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(user.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {users.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No users found</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Role capabilities</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong className="text-foreground">Admin</strong> — full access, user management, jurisdictions,
              export profiles, and this settings hub.
            </li>
            <li>
              <strong className="text-foreground">Coordinator</strong> — packages, documents, customers,
              contractors, and operational workflows.
            </li>
            <li>
              <strong className="text-foreground">Reviewer</strong> — review queue, assignments, and
              approval flows.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
