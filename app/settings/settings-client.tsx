/**
 * Settings Client Component
 *
 * Interactive client component for the settings page.
 * Handles user management including adding, editing, and deleting users.
 */

'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'

interface User {
  id: string
  email: string
  name: string
  role: 'user' | 'admin'
  createdAt: string
  updatedAt: string
  _count: {
    activityLogs: number
    uploadedDocs: number
  }
}

const thClass =
  'px-4 py-2 text-left text-xs font-medium uppercase tracking-[0.08em] text-muted'

export function SettingsClient() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showUserForm, setShowUserForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    role: 'user' as 'user' | 'admin',
  })

  // Fetch users
  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users', {
        credentials: 'include',
      })

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setError('You do not have permission to access this page')
          return
        }
        throw new Error('Failed to fetch users')
      }

      const data = await response.json()
      setUsers(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users'
      const method = editingUser ? 'PATCH' : 'POST'

      // Prepare submit data - only include password if provided or creating new user
      const submitData: Record<string, unknown> = {
        email: formData.email,
        name: formData.name,
        role: formData.role,
      }

      if (editingUser) {
        // For updates, only include password if provided
        if (formData.password) {
          submitData.password = formData.password
        }
      } else {
        // For new users, password is required
        if (!formData.password) {
          setError('Password is required for new users')
          return
        }
        submitData.password = formData.password
      }

      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))

        if (response.status === 401 || response.status === 403) {
          setError('You do not have permission to perform this action')
          return
        }

        throw new Error(errorData.error || 'Failed to save user')
      }

      // Reset form and refresh users
      setFormData({ email: '', name: '', password: '', role: 'user' })
      setShowUserForm(false)
      setEditingUser(null)
      await fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save user')
    }
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setFormData({
      email: user.email,
      name: user.name,
      password: '', // Don't pre-fill password
      role: user.role,
    })
    setShowUserForm(true)
  }

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to delete user')
      }

      await fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user')
    }
  }

  const handleCancel = () => {
    setShowUserForm(false)
    setEditingUser(null)
    setFormData({ email: '', name: '', password: '', role: 'user' })
  }

  if (loading) {
    return <div className="py-8 text-center text-sm text-muted">Loading...</div>
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Settings"
        description="Manage users and roles"
        actions={
          !showUserForm ? (
            <Button onClick={() => setShowUserForm(true)}>Add User</Button>
          ) : undefined
        }
      />

      {error && (
        <div className="border-b border-urgent py-3">
          <p className="text-sm text-urgent">{error}</p>
        </div>
      )}

      {/* User Management */}
      <section aria-label="User management" className="pt-6">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
          User management — {users.length} user{users.length !== 1 ? 's' : ''}
        </p>

        {/* Add/Edit User Form */}
        {showUserForm && (
          <form onSubmit={handleSubmit} className="mt-3 border-b border-border pb-6">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.1em] text-ink">
              {editingUser ? 'Edit user' : 'Add new user'}
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-ink">
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="pp-input"
                />
              </div>
              <div>
                <label htmlFor="name" className="mb-1 block text-sm font-medium text-ink">
                  Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="pp-input"
                />
              </div>
              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-medium text-ink">
                  Password {editingUser ? '(leave blank to keep current)' : '*'}
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  required={!editingUser}
                  value={formData.password}
                  onChange={handleChange}
                  className="pp-input"
                  minLength={6}
                />
              </div>
              <div>
                <label htmlFor="role" className="mb-1 block text-sm font-medium text-ink">
                  Role *
                </label>
                <select
                  id="role"
                  name="role"
                  required
                  value={formData.role}
                  onChange={handleChange}
                  className="pp-input"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button type="submit">{editingUser ? 'Update User' : 'Create User'}</Button>
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {/* Users Table */}
        <div className="mt-1 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className={thClass}>Name</th>
                <th className={thClass}>Email</th>
                <th className={thClass}>Role</th>
                <th className={thClass}>Activity</th>
                <th className={thClass}>Created</th>
                <th className={thClass}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => (
                <tr key={user.id} className="transition-colors hover:bg-surface-inset">
                  <td className="px-4 py-2.5 font-bold text-ink">{user.name}</td>
                  <td className="px-4 py-2.5 text-muted">{user.email}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={user.role} />
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted">
                    {user._count.activityLogs} logs, {user._count.uploadedDocs} docs
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(user)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(user.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <p className="py-8 text-center text-sm text-muted">No users found</p>
          )}
        </div>
      </section>
    </div>
  )
}
