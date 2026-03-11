/**
 * Database Seed Script
 * 
 * This script populates the database with realistic sample data for development and testing.
 * It creates customers, contractors, permit packages, documents, tasks, and activity logs.
 * 
 * Run with: npx prisma db seed
 * Or: npm run seed
 */

import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../lib/auth'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Clear existing data (in reverse order of dependencies)
  console.log('🧹 Clearing existing data...')
  await prisma.activityLog.deleteMany()
  await prisma.task.deleteMany()
  await prisma.permitDocument.deleteMany()
  await prisma.permitPackage.deleteMany()
  await prisma.requiredDocumentTemplate.deleteMany()
  await prisma.contractor.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.user.deleteMany()

  // Create users
  console.log('👤 Creating users...')
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@permitco.com',
      name: 'Admin User',
      passwordHash: await hashPassword('admin123'),
      role: 'admin',
    },
  })

  const regularUser = await prisma.user.create({
    data: {
      email: 'user@permitco.com',
      name: 'Regular User',
      passwordHash: await hashPassword('user123'),
      role: 'user',
    },
  })

  // Create customers
  console.log('🏢 Creating customers...')
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        name: 'ABC Development LLC',
        contactName: 'John Smith',
        phone: '(555) 123-4567',
        email: 'john.smith@abcdev.com',
        mainAddress: '123 Main Street, Anytown, ST 12345',
        notes: 'Preferred contact: Email. Quick turnaround needed.',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'XYZ Properties Inc',
        contactName: 'Sarah Johnson',
        phone: '(555) 234-5678',
        email: 'sarah.j@xyzprop.com',
        mainAddress: '456 Oak Avenue, Somewhere, ST 23456',
        notes: 'Large portfolio. Multiple projects ongoing.',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Green Build Co',
        contactName: 'Mike Chen',
        phone: '(555) 345-6789',
        email: 'mike.chen@greenbuild.com',
        mainAddress: '789 Pine Road, Elsewhere, ST 34567',
        notes: 'Focus on sustainable building practices.',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Metro Construction Group',
        contactName: 'Lisa Rodriguez',
        phone: '(555) 456-7890',
        email: 'lisa.r@metrocon.com',
        mainAddress: '321 Elm Street, Downtown, ST 45678',
        notes: 'Commercial projects only.',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Home Renovators Plus',
        contactName: 'David Wilson',
        phone: '(555) 567-8901',
        email: 'david.w@homereno.com',
        mainAddress: '654 Maple Drive, Suburbia, ST 56789',
        notes: 'Residential focus. Good payment history.',
      },
    }),
  ])

  // Create contractors
  console.log('🔨 Creating contractors...')
  const contractors = await Promise.all([
    prisma.contractor.create({
      data: {
        companyName: 'Elite Electrical Services',
        licenseNumber: 'EL-12345',
        phone: '(555) 111-2222',
        email: 'info@eliteelectrical.com',
        address: '100 Power Lane, Anytown, ST 12345',
        preferredContactMethod: 'email',
        notes: 'Licensed in 5 counties. Fast response time.',
      },
    }),
    prisma.contractor.create({
      data: {
        companyName: 'Master Plumbing Co',
        licenseNumber: 'MP-67890',
        phone: '(555) 222-3333',
        email: 'contact@masterplumb.com',
        address: '200 Water Way, Somewhere, ST 23456',
        preferredContactMethod: 'phone',
        notes: 'Specializes in commercial plumbing.',
      },
    }),
    prisma.contractor.create({
      data: {
        companyName: 'Ace Building Contractors',
        licenseNumber: 'ABC-11111',
        phone: '(555) 333-4444',
        email: 'info@acebuilders.com',
        address: '300 Construction Blvd, Elsewhere, ST 34567',
        preferredContactMethod: 'email',
        notes: 'Full-service contractor. Handles all trades.',
      },
    }),
    prisma.contractor.create({
      data: {
        companyName: 'HVAC Experts LLC',
        licenseNumber: 'HV-99999',
        phone: '(555) 444-5555',
        email: 'service@hvacexperts.com',
        address: '400 Climate Court, Downtown, ST 45678',
        preferredContactMethod: 'text',
        notes: '24/7 emergency service available.',
      },
    }),
    prisma.contractor.create({
      data: {
        companyName: 'Roof Masters Inc',
        licenseNumber: 'RM-55555',
        phone: '(555) 555-6666',
        email: 'sales@roofmasters.com',
        address: '500 Shingle Street, Suburbia, ST 56789',
        preferredContactMethod: 'phone',
        notes: 'Residential and commercial roofing.',
      },
    }),
  ])

  // Create permit packages with various statuses
  console.log('📋 Creating permit packages...')
  const now = new Date()
  const permits = await Promise.all([
    // New permits
    prisma.permitPackage.create({
      data: {
        customerId: customers[0].id,
        contractorId: contractors[0].id,
        projectName: 'Office Building Renovation',
        projectAddress: '123 Main Street, Anytown, ST 12345',
        county: 'Anytown County',
        jurisdictionNotes: 'Standard review process. No special requirements.',
        permitType: 'Building',
        status: 'New',
        internalStage: 'WaitingOnContractorDocs',
        openedDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        billingStatus: 'NotSent',
      },
    }),
    prisma.permitPackage.create({
      data: {
        customerId: customers[1].id,
        contractorId: contractors[1].id,
        projectName: 'Warehouse Electrical Upgrade',
        projectAddress: '456 Oak Avenue, Somewhere, ST 23456',
        county: 'Somewhere County',
        permitType: 'Electrical',
        status: 'New',
        internalStage: 'WaitingOnContractorDocs',
        openedDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        billingStatus: 'NotSent',
      },
    }),
    // Submitted permits
    prisma.permitPackage.create({
      data: {
        customerId: customers[2].id,
        contractorId: contractors[2].id,
        projectName: 'Residential Addition',
        projectAddress: '789 Pine Road, Elsewhere, ST 34567',
        county: 'Elsewhere County',
        permitType: 'Building',
        status: 'Submitted',
        internalStage: 'WaitingOnCounty',
        permitNumber: 'BLD-2024-001',
        openedDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        targetIssueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        billingStatus: 'NotSent',
      },
    }),
    // In Review
    prisma.permitPackage.create({
      data: {
        customerId: customers[0].id,
        contractorId: contractors[3].id,
        projectName: 'HVAC System Replacement',
        projectAddress: '123 Main Street, Anytown, ST 12345',
        county: 'Anytown County',
        permitType: 'HVAC',
        status: 'InReview',
        internalStage: 'WaitingOnCounty',
        permitNumber: 'HVAC-2024-045',
        openedDate: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
        targetIssueDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
        billingStatus: 'NotSent',
      },
    }),
    // Revisions Needed
    prisma.permitPackage.create({
      data: {
        customerId: customers[3].id,
        contractorId: contractors[4].id,
        projectName: 'Commercial Roof Replacement',
        projectAddress: '321 Elm Street, Downtown, ST 45678',
        county: 'Downtown County',
        permitType: 'Roofing',
        status: 'RevisionsNeeded',
        internalStage: 'WaitingOnContractorDocs',
        permitNumber: 'ROOF-2024-012',
        openedDate: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
        billingStatus: 'NotSent',
      },
    }),
    // Approved
    prisma.permitPackage.create({
      data: {
        customerId: customers[4].id,
        contractorId: contractors[0].id,
        projectName: 'Home Electrical Panel Upgrade',
        projectAddress: '654 Maple Drive, Suburbia, ST 56789',
        county: 'Suburbia County',
        permitType: 'Electrical',
        status: 'Approved',
        internalStage: 'WaitingOnBilling',
        permitNumber: 'ELEC-2024-089',
        openedDate: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
        targetIssueDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        billingStatus: 'NotSent',
      },
    }),
    // Issued
    prisma.permitPackage.create({
      data: {
        customerId: customers[1].id,
        contractorId: contractors[2].id,
        projectName: 'New Construction - Duplex',
        projectAddress: '456 Oak Avenue, Somewhere, ST 23456',
        county: 'Somewhere County',
        permitType: 'Building',
        status: 'Issued',
        internalStage: 'InProgress',
        permitNumber: 'BLD-2024-156',
        openedDate: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
        targetIssueDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        billingStatus: 'SentToBilling',
        sentToBillingAt: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000), // 25 days ago
      },
    }),
    // Inspections
    prisma.permitPackage.create({
      data: {
        customerId: customers[2].id,
        contractorId: contractors[1].id,
        projectName: 'Plumbing System Installation',
        projectAddress: '789 Pine Road, Elsewhere, ST 34567',
        county: 'Elsewhere County',
        permitType: 'Plumbing',
        status: 'Inspections',
        internalStage: 'InProgress',
        permitNumber: 'PLUM-2024-234',
        openedDate: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000), // 120 days ago
        targetIssueDate: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
        billingStatus: 'Billed',
      },
    }),
    // Finaled/Closed
    prisma.permitPackage.create({
      data: {
        customerId: customers[4].id,
        contractorId: contractors[3].id,
        projectName: 'Residential HVAC Installation',
        projectAddress: '654 Maple Drive, Suburbia, ST 56789',
        county: 'Suburbia County',
        permitType: 'HVAC',
        status: 'FinaledClosed',
        internalStage: 'ReadyToClose',
        permitNumber: 'HVAC-2024-567',
        openedDate: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000), // 180 days ago
        targetIssueDate: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000), // 120 days ago
        closedDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        billingStatus: 'Paid',
      },
    }),
    // More permits for variety
    prisma.permitPackage.create({
      data: {
        customerId: customers[0].id,
        contractorId: contractors[4].id,
        projectName: 'Office Roof Repair',
        projectAddress: '123 Main Street, Anytown, ST 12345',
        county: 'Anytown County',
        permitType: 'Roofing',
        status: 'InReview',
        internalStage: 'WaitingOnCounty',
        permitNumber: 'ROOF-2024-078',
        openedDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        billingStatus: 'NotSent',
      },
    }),
  ])

  // Create documents for some permits
  console.log('📄 Creating documents...')
  const documentCategories = ['Application', 'Plans', 'Specifications', 'Engineering', 'Photos']
  
  // Create documents for permit 0 (New)
  await prisma.permitDocument.create({
    data: {
      permitPackageId: permits[0].id,
      fileName: 'application_form.pdf',
      fileType: 'application/pdf',
      category: 'Application',
      uploadedBy: adminUser.id,
      isRequired: true,
      isVerified: true,
      status: 'Verified',
      fileSize: 245760, // 240 KB
      storagePath: `permits/${permits[0].id}/application_form.pdf`,
      versionTag: 'v1',
    },
  })

  // Create documents for permit 2 (Submitted) with version history
  const doc1 = await prisma.permitDocument.create({
    data: {
      permitPackageId: permits[2].id,
      fileName: 'site_plans.pdf',
      fileType: 'application/pdf',
      category: 'Plans',
      uploadedBy: regularUser.id,
      isRequired: true,
      isVerified: true,
      status: 'Verified',
      fileSize: 1048576, // 1 MB
      storagePath: `permits/${permits[2].id}/site_plans.pdf`,
      versionTag: 'v1',
      versionGroupId: 'plan-group-1',
    },
  })

  await prisma.permitDocument.create({
    data: {
      permitPackageId: permits[2].id,
      fileName: 'site_plans.pdf',
      fileType: 'application/pdf',
      category: 'Plans',
      uploadedBy: regularUser.id,
      isRequired: true,
      isVerified: false,
      status: 'Pending',
      fileSize: 1153024, // 1.1 MB
      storagePath: `permits/${permits[2].id}/site_plans_v2.pdf`,
      versionTag: 'v2',
      parentDocumentId: doc1.id,
      versionGroupId: 'plan-group-1',
    },
  })

  // Create tasks
  console.log('✅ Creating tasks...')
  await Promise.all([
    // Tasks for permit 0
    prisma.task.create({
      data: {
        permitPackageId: permits[0].id,
        name: 'Collect contractor documents',
        description: 'Request all required documents from contractor',
        status: 'InProgress',
        assignedTo: adminUser.email,
        dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        priority: 'high',
      },
    }),
    // Tasks for permit 2
    prisma.task.create({
      data: {
        permitPackageId: permits[2].id,
        name: 'Follow up with county',
        description: 'Check on review status',
        status: 'Waiting',
        assignedTo: regularUser.email,
        dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        priority: 'medium',
      },
    }),
    // Tasks for permit 5 (Approved)
    prisma.task.create({
      data: {
        permitPackageId: permits[5].id,
        name: 'Send to Billing',
        description: 'Permit approved - send to billing department',
        status: 'NotStarted',
        assignedTo: adminUser.email,
        dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        priority: 'high',
      },
    }),
    // Completed task for permit 7
    prisma.task.create({
      data: {
        permitPackageId: permits[7].id,
        name: 'Schedule final inspection',
        description: 'Coordinate with inspector',
        status: 'Completed',
        assignedTo: regularUser.email,
        dueDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        completedAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
        priority: 'high',
      },
    }),
  ])

  // Create activity logs
  console.log('📝 Creating activity logs...')
  for (const permit of permits) {
    // Initial creation log
    await prisma.activityLog.create({
      data: {
        permitPackageId: permit.id,
        userId: adminUser.id,
        activityType: 'StatusChange',
        description: 'Permit package created',
        newValue: permit.status,
      },
    })

    // Add status change logs for permits that have progressed
    if (permit.status !== 'New') {
      await prisma.activityLog.create({
        data: {
          permitPackageId: permit.id,
          userId: regularUser.id,
          activityType: 'StatusChange',
          description: `Status changed from New to ${permit.status}`,
          oldValue: 'New',
          newValue: permit.status,
        },
      })
    }

    // Add billing status logs where applicable
    if (permit.billingStatus !== 'NotSent') {
      await prisma.activityLog.create({
        data: {
          permitPackageId: permit.id,
          userId: adminUser.id,
          activityType: 'BillingStatusChange',
          description: `Billing status changed to ${permit.billingStatus}`,
          newValue: permit.billingStatus,
        },
      })
    }
  }

  // Create required document templates
  console.log('📋 Creating required document templates...')
  await Promise.all([
    // Building permit requirements
    prisma.requiredDocumentTemplate.create({
      data: {
        permitType: 'Building',
        category: 'Application',
        name: 'Building Permit Application',
        description: 'Completed building permit application form',
        isRequired: true,
        order: 1,
      },
    }),
    prisma.requiredDocumentTemplate.create({
      data: {
        permitType: 'Building',
        category: 'Plans',
        name: 'Site Plans',
        description: 'Detailed site plans showing property boundaries and structures',
        isRequired: true,
        order: 2,
      },
    }),
    prisma.requiredDocumentTemplate.create({
      data: {
        permitType: 'Building',
        category: 'Plans',
        name: 'Construction Plans',
        description: 'Architectural and structural construction plans',
        isRequired: true,
        order: 3,
      },
    }),
    // Electrical permit requirements
    prisma.requiredDocumentTemplate.create({
      data: {
        permitType: 'Electrical',
        category: 'Application',
        name: 'Electrical Permit Application',
        description: 'Completed electrical permit application form',
        isRequired: true,
        order: 1,
      },
    }),
    prisma.requiredDocumentTemplate.create({
      data: {
        permitType: 'Electrical',
        category: 'Plans',
        name: 'Electrical Plans',
        description: 'Electrical wiring diagrams and load calculations',
        isRequired: true,
        order: 2,
      },
    }),
  ])

  console.log('✅ Seed completed successfully!')
  console.log(`   - ${customers.length} customers`)
  console.log(`   - ${contractors.length} contractors`)
  console.log(`   - ${permits.length} permit packages`)
  console.log(`   - Users: admin@permitco.com (password: admin123)`)
  console.log(`   - Users: user@permitco.com (password: user123)`)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

