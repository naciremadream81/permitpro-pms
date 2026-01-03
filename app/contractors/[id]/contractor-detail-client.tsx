/**
 * Contractor Detail Client Component
 * 
 * Interactive client component for the contractor detail page.
 * Handles inline editing of contractor information.
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
  customer: {
    id: string
    name: string
  }
}

interface ContractorData {
  id: string
  companyName: string
  licenseNumber: string | null
  phone: string | null
  email: string | null
  address: string | null
  preferredContactMethod: string | null
  specialties: string | null
  workersCompExpirationDate: string | null
  liabilityExpirationDate: string | null
  notes: string | null
  permitPackages: PermitPackage[]
}

interface ContractorDetailClientProps {
  contractor: ContractorData
}

export function ContractorDetailClient({ contractor: initialContractor }: ContractorDetailClientProps) {
  const router = useRouter()
  const [contractor, setContractor] = useState(initialContractor)
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

  // Refresh contractor data
  const refreshContractor = async () => {
    try {
      const response = await fetch(`/api/contractors/${contractor.id}`, {
        credentials: 'include', // Include cookies for authentication
      })
      if (response.ok) {
        const data = await response.json()
        const updatedContractor = {
          ...data.data,
          specialties: data.data.specialties || null,
          workersCompExpirationDate: data.data.workersCompExpirationDate
            ? new Date(data.data.workersCompExpirationDate).toISOString()
            : null,
          liabilityExpirationDate: data.data.liabilityExpirationDate
            ? new Date(data.data.liabilityExpirationDate).toISOString()
            : null,
          permitPackages: data.data.permitPackages.map((pkg: any) => ({
            ...pkg,
            openedDate: new Date(pkg.openedDate).toISOString(),
          })),
        }
        setContractor(updatedContractor)
        router.refresh()
      }
    } catch (err) {
      console.error('Error refreshing contractor:', err)
    }
  }

  // Start editing a field
  const startEdit = (field: string, currentValue: string | null) => {
    setEditingField(field)
    
    // Convert ISO date strings to YYYY-MM-DD format for HTML date inputs
    if ((field === 'workersCompExpirationDate' || field === 'liabilityExpirationDate') && currentValue) {
      // Parse ISO string and format as YYYY-MM-DD for date input
      const date = new Date(currentValue)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      setEditValue(`${year}-${month}-${day}`)
    } else {
      setEditValue(currentValue || '')
    }
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
      
      // Handle different field types
      if (field === 'workersCompExpirationDate' || field === 'liabilityExpirationDate') {
        updateData[field] = editValue ? new Date(editValue).toISOString() : null
      } else if (field === 'phone' && editValue) {
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

      const response = await fetch(`/api/contractors/${contractor.id}`, {
        method: 'PATCH',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update contractor')
      }

      await refreshContractor()
      setEditingField(null)
      setEditValue('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update contractor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          {editingField === 'companyName' ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="text-3xl font-bold text-gray-900 border-b-2 border-blue-500 px-2 py-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveField('companyName')
                  if (e.key === 'Escape') cancelEdit()
                }}
              />
              <Button size="sm" onClick={() => saveField('companyName')} disabled={loading}>
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={cancelEdit}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-gray-900">{contractor.companyName}</h1>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => startEdit('companyName', contractor.companyName)}
              >
                Edit
              </Button>
            </div>
          )}
          {contractor.licenseNumber && (
            <p className="text-gray-600">License: {contractor.licenseNumber}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href="/contractors">
            <Button variant="outline">Back to Contractors</Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Contractor Information - Editable */}
      <Card>
        <CardHeader>
          <CardTitle>Contractor Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {/* License Number */}
            <div>
              <p className="text-sm font-medium text-gray-500">License Number</p>
              {editingField === 'licenseNumber' ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm"
                    autoFocus
                  />
                  <Button size="sm" onClick={() => saveField('licenseNumber')} disabled={loading}>
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelEdit}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-sm">{contractor.licenseNumber || '-'}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => startEdit('licenseNumber', contractor.licenseNumber)}
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
                  <p className="text-sm">{contractor.phone || '-'}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => startEdit('phone', contractor.phone)}
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
                  {contractor.email ? (
                    <a
                      href={`mailto:${contractor.email}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {contractor.email}
                    </a>
                  ) : (
                    <p className="text-sm">-</p>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => startEdit('email', contractor.email)}
                  >
                    Edit
                  </Button>
                </div>
              )}
            </div>

            {/* Address */}
            <div>
              <p className="text-sm font-medium text-gray-500">Address</p>
              {editingField === 'address' ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm"
                    autoFocus
                  />
                  <Button size="sm" onClick={() => saveField('address')} disabled={loading}>
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelEdit}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-sm">{contractor.address || '-'}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => startEdit('address', contractor.address)}
                  >
                    Edit
                  </Button>
                </div>
              )}
            </div>

            {/* Preferred Contact Method */}
            <div>
              <p className="text-sm font-medium text-gray-500">Preferred Contact Method</p>
              {editingField === 'preferredContactMethod' ? (
                <div className="flex items-center gap-2 mt-1">
                  <select
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm"
                    autoFocus
                  >
                    <option value="">Select...</option>
                    <option value="phone">Phone</option>
                    <option value="email">Email</option>
                    <option value="text">Text</option>
                  </select>
                  <Button size="sm" onClick={() => saveField('preferredContactMethod')} disabled={loading}>
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelEdit}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-sm">
                    {contractor.preferredContactMethod
                      ? contractor.preferredContactMethod.charAt(0).toUpperCase() +
                        contractor.preferredContactMethod.slice(1)
                      : '-'}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => startEdit('preferredContactMethod', contractor.preferredContactMethod)}
                  >
                    Edit
                  </Button>
                </div>
              )}
            </div>

            {/* Specialties */}
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-gray-500">Specialties</p>
              {editingField === 'specialties' ? (
                <div className="mt-1">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                    placeholder="e.g., Electrical, Plumbing, HVAC"
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter specialties separated by commas
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" onClick={() => saveField('specialties')} disabled={loading}>
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEdit}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-sm">{contractor.specialties || '-'}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => startEdit('specialties', contractor.specialties)}
                  >
                    Edit
                  </Button>
                </div>
              )}
            </div>

            {/* Workers Comp Expiration Date */}
            <div>
              <p className="text-sm font-medium text-gray-500">Workers Comp Expiration Date</p>
              {editingField === 'workersCompExpirationDate' ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="date"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm"
                    autoFocus
                  />
                  <Button size="sm" onClick={() => saveField('workersCompExpirationDate')} disabled={loading}>
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelEdit}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-sm">
                    {contractor.workersCompExpirationDate
                      ? formatDate(new Date(contractor.workersCompExpirationDate))
                      : '-'}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => startEdit('workersCompExpirationDate', contractor.workersCompExpirationDate)}
                  >
                    Edit
                  </Button>
                </div>
              )}
            </div>

            {/* Liability Expiration Date */}
            <div>
              <p className="text-sm font-medium text-gray-500">Liability Expiration Date</p>
              {editingField === 'liabilityExpirationDate' ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="date"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm"
                    autoFocus
                  />
                  <Button size="sm" onClick={() => saveField('liabilityExpirationDate')} disabled={loading}>
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelEdit}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-sm">
                    {contractor.liabilityExpirationDate
                      ? formatDate(new Date(contractor.liabilityExpirationDate))
                      : '-'}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => startEdit('liabilityExpirationDate', contractor.liabilityExpirationDate)}
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
                <div className="flex items-start gap-2 mt-1">
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm"
                    rows={3}
                    autoFocus
                  />
                  <div className="flex flex-col gap-2">
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
                    {contractor.notes || '-'}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => startEdit('notes', contractor.notes)}
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
          <CardTitle>Permit Packages ({contractor.permitPackages.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {contractor.permitPackages.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Project Name</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Customer</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Type</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Status</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Opened Date</th>
                  </tr>
                </thead>
                <tbody>
                  {contractor.permitPackages.map((permit) => (
                    <tr key={permit.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <Link
                          href={`/permits/${permit.id}`}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {permit.projectName}
                        </Link>
                      </td>
                      <td className="px-4 py-2">
                        <Link
                          href={`/customers/${permit.customer.id}`}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {permit.customer.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-sm">{formatPermitType(permit.permitType)}</td>
                      <td className="px-4 py-2">
                        <StatusBadge status={permit.status} />
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
            <p className="text-gray-500">No permit packages for this contractor</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

