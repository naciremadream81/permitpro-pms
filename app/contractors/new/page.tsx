/**
 * New Contractor Page
 * 
 * Form page for creating a new contractor.
 * Allows users to enter contractor details including company name, license, contact information, insurance dates, and notes.
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function NewContractorPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Available specialties (matching permit types)
  const availableSpecialties = [
    'Building',
    'Electrical',
    'Plumbing',
    'Mechanical',
    'Roofing',
    'HVAC',
    'Structural',
    'Mobile home',
  ]

  // Form state
  const [formData, setFormData] = useState({
    companyName: '',
    licenseNumber: '',
    phone: '',
    email: '',
    address: '',
    preferredContactMethod: '' as 'phone' | 'email' | 'text' | '',
    specialties: [] as string[],
    otherSpecialty: '',
    workersCompExpirationDate: '',
    liabilityExpirationDate: '',
    notes: '',
  })

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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    
    // Special handling for phone number formatting
    if (name === 'phone') {
      const formatted = formatPhoneNumber(value)
      setFormData((prev) => ({
        ...prev,
        [name]: formatted,
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }))
    }
  }

  const handleSpecialtyChange = (specialty: string, checked: boolean) => {
    setFormData((prev) => {
      if (checked) {
        return {
          ...prev,
          specialties: [...prev.specialties, specialty],
        }
      } else {
        return {
          ...prev,
          specialties: prev.specialties.filter((s) => s !== specialty),
        }
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Validate that at least one specialty is selected
      const specialtiesList = [
        ...formData.specialties,
        ...(formData.otherSpecialty.trim() ? [formData.otherSpecialty.trim()] : []),
      ]
      if (specialtiesList.length === 0) {
        setError('Please select at least one specialty')
        setLoading(false)
        return
      }

      // Prepare submit data - only include fields that have values
      const submitData: any = {
        companyName: formData.companyName,
      }

      // Add optional fields only if they have values
      if (formData.licenseNumber) submitData.licenseNumber = formData.licenseNumber
      if (formData.phone) submitData.phone = formData.phone
      if (formData.email) submitData.email = formData.email
      if (formData.address) submitData.address = formData.address
      if (formData.preferredContactMethod) submitData.preferredContactMethod = formData.preferredContactMethod
      
      // Combine specialties and other specialty into comma-separated string
      submitData.specialties = specialtiesList.join(', ')
      
      if (formData.workersCompExpirationDate) {
        submitData.workersCompExpirationDate = new Date(formData.workersCompExpirationDate).toISOString()
      }
      if (formData.liabilityExpirationDate) {
        submitData.liabilityExpirationDate = new Date(formData.liabilityExpirationDate).toISOString()
      }
      if (formData.notes) submitData.notes = formData.notes

      const response = await fetch('/api/contractors', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        
        // Provide helpful error message for 401
        if (response.status === 401) {
          throw new Error('Your session has expired. Please refresh the page and try again.')
        }
        
        // Provide helpful error message for validation errors
        if (response.status === 400 && errorData.details) {
          const zodError = errorData.details
          if (zodError.issues && Array.isArray(zodError.issues)) {
            const firstError = zodError.issues[0]
            throw new Error(firstError.message || 'Validation error')
          }
        }
        
        throw new Error(errorData.error || 'Failed to create contractor')
      }

      const result = await response.json()
      
      // Redirect to the new contractor's detail page
      router.push(`/contractors/${result.data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create contractor')
      setLoading(false)
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">New Contractor</h1>
          <Link href="/contractors">
            <Button variant="outline">Cancel</Button>
          </Link>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Contractor Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  id="companyName"
                  name="companyName"
                  required
                  value={formData.companyName}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter company name"
                />
              </div>

              <div>
                <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  License Number
                </label>
                <input
                  type="text"
                  id="licenseNumber"
                  name="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter license number"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="(555) 555-5555"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="contractor@example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter address"
                />
              </div>

              <div>
                <label htmlFor="preferredContactMethod" className="block text-sm font-medium text-gray-700 mb-1">
                  Preferred Contact Method
                </label>
                <select
                  id="preferredContactMethod"
                  name="preferredContactMethod"
                  value={formData.preferredContactMethod}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select...</option>
                  <option value="phone">Phone</option>
                  <option value="email">Email</option>
                  <option value="text">Text</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specialties *
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Select all specialties that apply to this contractor
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {availableSpecialties.map((specialty) => (
                    <label
                      key={specialty}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.specialties.includes(specialty)}
                        onChange={(e) =>
                          handleSpecialtyChange(specialty, e.target.checked)
                        }
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{specialty}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-3">
                  <label htmlFor="otherSpecialty" className="block text-sm font-medium text-gray-700 mb-1">
                    Other Specialty
                  </label>
                  <input
                    type="text"
                    id="otherSpecialty"
                    name="otherSpecialty"
                    value={formData.otherSpecialty}
                    onChange={handleChange}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter other specialty (optional)"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="workersCompExpirationDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Workers Comp Expiration Date
                  </label>
                  <input
                    type="date"
                    id="workersCompExpirationDate"
                    name="workersCompExpirationDate"
                    value={formData.workersCompExpirationDate}
                    onChange={handleChange}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="liabilityExpirationDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Liability Expiration Date
                  </label>
                  <input
                    type="date"
                    id="liabilityExpirationDate"
                    name="liabilityExpirationDate"
                    value={formData.liabilityExpirationDate}
                    onChange={handleChange}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={4}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Add any additional notes about this contractor..."
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Contractor'}
                </Button>
                <Link href="/contractors">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

