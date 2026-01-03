/**
 * Customer Detail Client Component
 * 
 * Interactive client component for the customer detail page.
 * Handles inline editing of customer information.
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate, formatPermitType } from '@/lib/utils'
import Link from 'next/link'

interface PermitPackage {
  id: string
  projectName: string
  permitType: string
  status: string
  openedDate: Date | string
  contractor: {
    id: string
    companyName: string
  }
}

interface CustomerData {
  id: string
  name: string
  contactName: string | null
  phone: string | null
  email: string | null
  mainAddress: string | null
  notes: string | null
  permitPackages: PermitPackage[]
}

interface CustomerDetailClientProps {
  customer: CustomerData
}

export function CustomerDetailClient({ customer: initialCustomer }: CustomerDetailClientProps) {
  const router = useRouter()
  const [customer, setCustomer] = useState(initialCustomer)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  /**
   * Format phone number as user types
   * Formats to: (XXX) XXX-XXXX
   * 
   * Only formats when we have at least 4 digits (area code) to prevent
   * incomplete formats like "(5" or "(555" from being saved to the database.
   * For 1-3 digits, returns the digits without formatting.
   */
  const formatPhoneNumber = (value: string): string => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '')
    
    // Limit to 10 digits (US phone number)
    const limitedDigits = digits.slice(0, 10)
    
    // Format based on length
    if (limitedDigits.length === 0) return ''
    
    // For 1-3 digits, return digits without formatting to prevent incomplete formats
    // This ensures we don't save "(5" or "(555" to the database
    if (limitedDigits.length <= 3) return limitedDigits
    
    // Start formatting when we have at least 4 digits (area code)
    if (limitedDigits.length <= 6) {
      return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3)}`
    }
    
    // Full format for 7-10 digits
    return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`
  }

  // Refresh customer data
  const refreshCustomer = async () => {
    try {
      const response = await fetch(`/api/customers/${customer.id}`, {
        credentials: 'include', // Include cookies for authentication
      })
      if (response.ok) {
        const data = await response.json()
        setCustomer(data.data)
        router.refresh()
      }
    } catch (err) {
      console.error('Error refreshing customer:', err)
    }
  }

  // Start editing a field
  const startEdit = (field: string, currentValue: string | null) => {
    setEditingField(field)
    setEditValue(currentValue || '')
  }

  // Cancel editing
  const cancelEdit = () => {
    setEditingField(null)
    setEditValue('')
  }

  // Save field edit
  const saveField = async (field: string) => {
    setLoading(true)
    setError('')

    try {
      const updateData: any = {}
      
      // Handle phone number - store the raw digits if it's a formatted phone
      if (field === 'phone' && editValue) {
        // Extract digits from formatted phone number
        const digits = editValue.replace(/\D/g, '')
        // Only save if we have at least 4 digits (valid area code)
        if (digits.length >= 4 && digits.length <= 10) {
          // If it's already formatted, keep the format; otherwise format it
          updateData[field] = editValue.includes('(') ? editValue : formatPhoneNumber(editValue)
        } else if (digits.length > 0 && digits.length < 4) {
          // Don't save incomplete phone numbers
          throw new Error('Phone number must have at least 4 digits')
        } else {
          updateData[field] = null
        }
      } else {
        updateData[field] = editValue || null
      }

      const response = await fetch(`/api/customers/${customer.id}`, {
        method: 'PATCH',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update customer')
      }

      await refreshCustomer()
      setEditingField(null)
      setEditValue('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update customer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          {editingField === 'name' ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="text-3xl font-bold text-gray-900 border-b-2 border-blue-500 px-2 py-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveField('name')
                  if (e.key === 'Escape') cancelEdit()
                }}
              />
              <Button size="sm" onClick={() => saveField('name')} disabled={loading}>
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={cancelEdit}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-gray-900">{customer.name}</h1>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => startEdit('name', customer.name)}
              >
                Edit
              </Button>
            </div>
          )}
          {customer.contactName && (
            <p className="text-gray-600">Contact: {customer.contactName}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href="/customers">
            <Button variant="outline">Back to Customers</Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Customer Information - Editable */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Contact Name */}
            <div>
              <p className="text-sm font-medium text-gray-500">Contact Name</p>
              {editingField === 'contactName' ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm"
                    autoFocus
                  />
                  <Button size="sm" onClick={() => saveField('contactName')} disabled={loading}>
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelEdit}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-sm">{customer.contactName || '-'}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => startEdit('contactName', customer.contactName)}
                  >
                    Edit
                  </Button>
                </div>
              )}
            </div>

            {/* Phone */}
            <div>
              <p className="text-sm font-medium text-gray-500">Phone</p>
              {editingField === 'phone' ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="tel"
                    value={editValue}
                    onChange={(e) => {
                      const formatted = formatPhoneNumber(e.target.value)
                      setEditValue(formatted)
                    }}
                    className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm"
                    placeholder="(555) 123-4567"
                    maxLength={14}
                    autoFocus
                  />
                  <Button size="sm" onClick={() => saveField('phone')} disabled={loading}>
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelEdit}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-sm">{customer.phone || '-'}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => startEdit('phone', customer.phone)}
                  >
                    Edit
                  </Button>
                </div>
              )}
            </div>

            {/* Email */}
            <div>
              <p className="text-sm font-medium text-gray-500">Email</p>
              {editingField === 'email' ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="email"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm"
                    autoFocus
                  />
                  <Button size="sm" onClick={() => saveField('email')} disabled={loading}>
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelEdit}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {customer.email ? (
                    <a
                      href={`mailto:${customer.email}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {customer.email}
                    </a>
                  ) : (
                    <p className="text-sm">-</p>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => startEdit('email', customer.email)}
                  >
                    Edit
                  </Button>
                </div>
              )}
            </div>

            {/* Main Address */}
            <div>
              <p className="text-sm font-medium text-gray-500">Main Address</p>
              {editingField === 'mainAddress' ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm"
                    autoFocus
                  />
                  <Button size="sm" onClick={() => saveField('mainAddress')} disabled={loading}>
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelEdit}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-sm">{customer.mainAddress || '-'}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => startEdit('mainAddress', customer.mainAddress)}
                  >
                    Edit
                  </Button>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-gray-500">Notes</p>
              {editingField === 'notes' ? (
                <div className="mt-1">
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                    rows={4}
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" onClick={() => saveField('notes')} disabled={loading}>
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEdit}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <p className="text-sm whitespace-pre-wrap flex-1">
                    {customer.notes || '-'}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => startEdit('notes', customer.notes)}
                  >
                    Edit
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permit Packages */}
      <Card>
        <CardHeader>
          <CardTitle>Permit Packages ({customer.permitPackages.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {customer.permitPackages.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                      Project Name
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                      Type
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                      Status
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                      Contractor
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                      Opened Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {customer.permitPackages.map((permit) => (
                    <tr key={permit.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <Link
                          href={`/permits/${permit.id}`}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {permit.projectName}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-sm">{formatPermitType(permit.permitType)}</td>
                      <td className="px-4 py-2">
                        <StatusBadge status={permit.status} />
                      </td>
                      <td className="px-4 py-2">
                        <Link
                          href={`/contractors/${permit.contractor.id}`}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {permit.contractor.companyName}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {formatDate(permit.openedDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No permit packages for this customer</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

