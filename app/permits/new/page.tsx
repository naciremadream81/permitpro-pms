/**
 * New Permit Page
 * 
 * Form page for creating a new permit package.
 * Allows users to select a customer and contractor, and enter permit details.
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface Customer {
  id: string
  name: string
}

interface Contractor {
  id: string
  companyName: string
}

export default function NewPermitPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [loadingData, setLoadingData] = useState(true)

  // Form state
  const [formData, setFormData] = useState({
    customerName: '', // Changed from customerId to customerName (text input)
    contractorId: '',
    projectName: '',
    projectAddress: '',
    county: '',
    jurisdictionNotes: '',
    permitType: 'Building' as const,
    status: 'New' as const,
    internalStage: 'InProgress' as const,
    targetIssueDate: '',
    billingStatus: 'NotSent' as const,
    billingNotes: '',
  })

  // Fetch contractors only (customers are now entered as text)
  useEffect(() => {
    async function fetchData() {
      try {
        const contractorsRes = await fetch('/api/contractors')

        if (contractorsRes.ok) {
          const contractorsData = await contractorsRes.json()
          setContractors(contractorsData.data || [])
        } else {
          setError('Failed to load contractors')
        }
      } catch (err) {
        setError('Error loading form data')
        console.error(err)
      } finally {
        setLoadingData(false)
      }
    }

    fetchData()
  }, [])

  // Helper function to create a customer
  const createCustomer = async (name: string): Promise<string> => {
    const createResponse = await fetch('/api/customers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: name,
      }),
    })

    if (!createResponse.ok) {
      const errorData = await createResponse.json().catch(() => ({}))
      throw new Error(errorData.error || `Failed to create customer: ${createResponse.statusText}`)
    }

    const customerData = await createResponse.json()
    return customerData.data.id
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Step 1: Find or create customer
      let customerId: string
      
      if (!formData.customerName.trim()) {
        throw new Error('Customer name is required')
      }

      const customerName = formData.customerName.trim()

      // Try to search for existing customer by name
      // If search fails for any reason, we'll create the customer directly
      try {
        const searchResponse = await fetch(`/api/customers?search=${encodeURIComponent(customerName)}`)
        
        if (searchResponse.ok) {
          const searchData = await searchResponse.json()
          const existingCustomer = searchData.data?.find(
            (c: Customer) => c.name.toLowerCase() === customerName.toLowerCase()
          )
          
          if (existingCustomer) {
            // Use existing customer
            customerId = existingCustomer.id
          } else {
            // Customer not found, create new one
            customerId = await createCustomer(customerName)
          }
        } else {
          // Search failed (might be auth issue), try to create customer directly
          const errorText = await searchResponse.text().catch(() => 'Unknown error')
          console.warn(`Customer search failed (${searchResponse.status}): ${errorText}. Creating customer directly.`)
          customerId = await createCustomer(customerName)
        }
      } catch (searchError) {
        // If search throws an error (network, etc.), try to create customer directly
        console.warn('Customer search error, creating customer directly:', searchError)
        customerId = await createCustomer(customerName)
      }

      // Step 2: Create permit with the customer ID
      const submitData: Record<string, unknown> = {
        customerId,
        contractorId: formData.contractorId,
        projectName: formData.projectName,
        projectAddress: formData.projectAddress,
        permitType: formData.permitType,
        status: formData.status,
        internalStage: formData.internalStage,
        billingStatus: formData.billingStatus,
      }

      // Add optional fields only if they have values
      if (formData.county) submitData.county = formData.county
      if (formData.jurisdictionNotes) submitData.jurisdictionNotes = formData.jurisdictionNotes
      if (formData.billingNotes) submitData.billingNotes = formData.billingNotes
      if (formData.targetIssueDate) {
        // Convert date input (YYYY-MM-DD) to ISO datetime string
        const date = new Date(formData.targetIssueDate)
        submitData.targetIssueDate = date.toISOString()
      }

      const response = await fetch('/api/permits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create permit')
      }

      const result = await response.json()
      
      // Reset loading state before redirect
      // This ensures the button state is correct if user navigates back
      setLoading(false)
      
      // Redirect to the new permit detail page
      router.push(`/permits/${result.data.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create permit')
      setLoading(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  if (loadingData) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-600">Loading form data...</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">New Permit</h1>
          <Link href="/permits">
            <Button variant="outline">Cancel</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Permit Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Customer Name (Text Input) */}
              <div>
                <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="customerName"
                  name="customerName"
                  required
                  value={formData.customerName}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  placeholder="Enter customer name (e.g., ABC Development LLC)"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Enter the customer name. A new customer will be created if one doesn&apos;t exist.
                </p>
              </div>

              {/* Contractor Selection */}
              <div>
                <label htmlFor="contractorId" className="block text-sm font-medium text-gray-700 mb-1">
                  Contractor <span className="text-red-500">*</span>
                </label>
                <select
                  id="contractorId"
                  name="contractorId"
                  required
                  value={formData.contractorId}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                >
                  <option value="">Select a contractor...</option>
                  {contractors.map((contractor) => (
                    <option key={contractor.id} value={contractor.id}>
                      {contractor.companyName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Project Name */}
              <div>
                <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="projectName"
                  name="projectName"
                  required
                  value={formData.projectName}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  placeholder="e.g., Office Building Renovation"
                />
              </div>

              {/* Project Address */}
              <div>
                <label htmlFor="projectAddress" className="block text-sm font-medium text-gray-700 mb-1">
                  Project Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="projectAddress"
                  name="projectAddress"
                  required
                  value={formData.projectAddress}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  placeholder="e.g., 123 Main Street, City, State ZIP"
                />
              </div>

              {/* Permit Type */}
              <div>
                <label htmlFor="permitType" className="block text-sm font-medium text-gray-700 mb-1">
                  Permit Type <span className="text-red-500">*</span>
                </label>
                <select
                  id="permitType"
                  name="permitType"
                  required
                  value={formData.permitType}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                >
                  <option value="Building">Building</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Plumbing">Plumbing</option>
                  <option value="Mechanical">Mechanical</option>
                  <option value="Roofing">Roofing</option>
                  <option value="HVAC">HVAC</option>
                  <option value="Structural">Structural</option>
                  <option value="MobileHome">Mobile home</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* County */}
              <div>
                <label htmlFor="county" className="block text-sm font-medium text-gray-700 mb-1">
                  County
                </label>
                <input
                  type="text"
                  id="county"
                  name="county"
                  value={formData.county}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  placeholder="e.g., Anytown County"
                />
              </div>

              {/* Jurisdiction Notes */}
              <div>
                <label htmlFor="jurisdictionNotes" className="block text-sm font-medium text-gray-700 mb-1">
                  Jurisdiction Notes
                </label>
                <textarea
                  id="jurisdictionNotes"
                  name="jurisdictionNotes"
                  rows={3}
                  value={formData.jurisdictionNotes}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  placeholder="Any special requirements or notes about the jurisdiction..."
                />
              </div>

              {/* Target Issue Date */}
              <div>
                <label htmlFor="targetIssueDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Target Issue Date
                </label>
                <input
                  type="date"
                  id="targetIssueDate"
                  name="targetIssueDate"
                  value={formData.targetIssueDate}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                />
              </div>

              {/* Billing Notes */}
              <div>
                <label htmlFor="billingNotes" className="block text-sm font-medium text-gray-700 mb-1">
                  Billing Notes
                </label>
                <textarea
                  id="billingNotes"
                  name="billingNotes"
                  rows={2}
                  value={formData.billingNotes}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  placeholder="Any notes for the billing department..."
                />
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-4 pt-4 border-t">
                <Link href="/permits">
                  <Button type="button" variant="outline" disabled={loading}>
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Permit'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

