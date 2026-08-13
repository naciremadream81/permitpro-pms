# Permit Processing & Document Management System

A comprehensive web application for permit coordination and document management, designed for small permit coordination companies that serve as intermediaries between contractors and billing departments. Built with Next.js, TypeScript, Prisma, and TailwindCSS.

## Features

### Core Functionality

- **Permit Package Management**: Complete lifecycle management from creation to closure
- **Customer & Contractor Management**: Centralized database of customers and contractors
- **Document Management**: Upload, version, verify, and organize documents per permit
- **Task & Workflow Management**: Track tasks and workflow steps with due dates and assignments
- **Activity Logging**: Comprehensive audit trail of all permit activities
- **Status Tracking**: Visual status badges and workflow stages
- **Billing Integration**: Track billing status and handoff to billing department
- **Search & Filtering**: Advanced search and filtering across all entities
- **Dashboard**: Real-time KPIs and overview of permit status

### Technical Features

- **Full-Stack Next.js**: App Router with React Server Components
- **TypeScript**: Type-safe codebase throughout
- **Prisma ORM**: Type-safe database access with SQLite (dev) / Postgres (production ready)
- **NextAuth**: Secure authentication with credentials provider
- **File Storage**: Local file storage with abstraction for easy S3 migration
- **Responsive UI**: Modern, clean interface built with TailwindCSS
- **API Routes**: RESTful API endpoints for all CRUD operations

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **UI**: TailwindCSS + Custom Components
- **Database**: Prisma + SQLite (dev) / Postgres (production)
- **Authentication**: NextAuth.js (Credentials Provider)
- **File Storage**: Local filesystem (abstraction for S3)
- **Validation**: Zod

## Getting Started

### Prerequisites

- Node.js 20.9+
- npm or yarn
- SQLite (included with Node.js)

### Quick Setup (Automated)

The easiest way to set up the database is using the automated setup script:

```bash
# Make the script executable (if needed)


# Run the setup script
./setup-db.sh

# Or use npm script
npm run db:setup
```

This script will:
1. ✅ Check prerequisites (Node.js, npm)
2. ✅ Install all dependencies
3. ✅ Create `.env` file with auto-generated secrets
4. ✅ Run database migrations
5. ✅ Generate Prisma Client
6. ✅ Seed the database with sample data
7. ✅ Create storage directory

After running the script, start the development server:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

**Demo Login Credentials:**
The seed command prints generated development passwords when it finishes. To use known local-only credentials, set `SEED_ADMIN_PASSWORD` and `SEED_COORDINATOR_PASSWORD` before running the seed.

### Manual Setup (Alternative)

If you prefer to set up manually or the script doesn't work for you:

1. **Clone the repository** (or navigate to the project directory)

```bash
cd /path/to/project
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

Copy the example environment file and update it with your values:

```bash
cp .env.example .env
```

Then edit `.env` and update the values:

```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here" # Generate with: openssl rand -base64 32

# File Storage (optional - defaults to ./storage)
STORAGE_ROOT="./storage"

# Cloudflare Tunnel Configuration (optional - only needed if using Cloudflare Tunnel)
CLOUDFLARE_TUNNEL_ID="your-tunnel-id-here"
CLOUDFLARE_TUNNEL_TOKEN="your-tunnel-token-here"
```

**Note:** The `.env` file is git-ignored for security. See `.env.example` for the template.

4. **Set up the database**

```bash
# Run migrations
npx prisma migrate dev

# Generate Prisma Client
npx prisma generate
```

5. **Seed the database** (optional but recommended for development)

```bash
npm run db:seed
```

This will create:
- 2 users with generated development passwords
- 5 customers
- 5 contractors
- 10 permit packages with various statuses
- Sample documents, tasks, and activity logs

6. **Start the development server**

```bash
npm run dev
```

7. **Open your browser**

Navigate to [http://localhost:3000](http://localhost:3000)

You'll be redirected to the login page. Use the generated demo credentials printed by the seed command.

## Project Structure

```
├── app/                      # Next.js App Router pages
│   ├── api/                  # API route handlers
│   │   ├── auth/             # NextAuth authentication
│   │   ├── customers/       # Customer CRUD endpoints
│   │   ├── contractors/      # Contractor CRUD endpoints
│   │   ├── permits/          # Permit CRUD endpoints
│   │   ├── tasks/            # Task management endpoints
│   │   └── documents/        # Document upload/download endpoints
│   ├── dashboard/            # Dashboard page
│   ├── permits/              # Permit list and detail pages
│   ├── customers/            # Customer management pages
│   ├── contractors/          # Contractor management pages
│   ├── reports/              # Reports page
│   └── login/                # Login page
├── components/               # React components
│   ├── ui/                   # Reusable UI components
│   ├── layout/               # Layout components (Sidebar, Header)
│   └── providers/            # Context providers
├── lib/                      # Utility libraries
│   ├── prisma.ts             # Prisma client singleton
│   ├── auth.ts               # Authentication utilities
│   ├── auth-helpers.ts       # Auth helper functions
│   ├── storage.ts            # File storage abstraction
│   ├── utils.ts              # General utilities
│   └── validations.ts        # Zod validation schemas
├── prisma/                   # Prisma schema and migrations
│   ├── schema.prisma         # Database schema
│   ├── seed.ts               # Database seed script
│   └── migrations/           # Database migrations
├── storage/                  # Local file storage (created automatically)
└── types/                   # TypeScript type definitions
```

## Database Schema

The application uses the following main entities:

- **User**: Application users (admin/user roles)
- **Customer**: Permit customers
- **Contractor**: Contractors working on permits
- **PermitPackage**: Main permit entity with status, billing, and workflow tracking
- **PermitDocument**: Documents attached to permits with versioning
- **Task**: Workflow tasks and to-dos
- **ActivityLog**: Audit trail of all activities
- **RequiredDocumentTemplate**: Templates for required documents by permit type

See `prisma/schema.prisma` for the complete schema definition.

## API Endpoints

### Authentication
- `POST /api/auth/signin` - Sign in
- `POST /api/auth/signout` - Sign out
- `GET /api/auth/session` - Get current session

### Customers
- `GET /api/customers` - List customers (with search/pagination)
- `POST /api/customers` - Create customer
- `GET /api/customers/[id]` - Get customer
- `PATCH /api/customers/[id]` - Update customer
- `DELETE /api/customers/[id]` - Delete customer

### Contractors
- `GET /api/contractors` - List contractors (with search/pagination)
- `POST /api/contractors` - Create contractor
- `GET /api/contractors/[id]` - Get contractor
- `PATCH /api/contractors/[id]` - Update contractor
- `DELETE /api/contractors/[id]` - Delete contractor

### Permits
- `GET /api/permits` - List permits (with filters/search/pagination)
- `POST /api/permits` - Create permit
- `GET /api/permits/[id]` - Get permit with all relations
- `PATCH /api/permits/[id]` - Update permit
- `DELETE /api/permits/[id]` - Delete permit
- `POST /api/permits/[id]/status` - Update permit status (with activity logging)

### Tasks
- `GET /api/permits/[id]/tasks` - List tasks for a permit
- `POST /api/permits/[id]/tasks` - Create task
- `PATCH /api/tasks/[id]` - Update task
- `DELETE /api/tasks/[id]` - Delete task

### Documents
- `GET /api/permits/[id]/documents` - List documents for a permit
- `POST /api/permits/[id]/documents` - Upload document (multipart/form-data)
- `GET /api/documents/[id]` - Get document metadata
- `PATCH /api/documents/[id]` - Update document metadata
- `DELETE /api/documents/[id]` - Delete document
- `GET /api/documents/[id]/download` - Download document file
- `GET /api/documents/[id]/preview` - Preview document (PDFs/images)
- `POST /api/documents/[id]/verify` - Verify/unverify document

All API endpoints require authentication (except auth endpoints).

## Workflow & Status Management

### Permit Statuses
- **New**: Newly created permit
- **Submitted**: Submitted to jurisdiction
- **InReview**: Under review by jurisdiction
- **RevisionsNeeded**: Revisions requested
- **Approved**: Approved by jurisdiction
- **Issued**: Permit issued
- **Inspections**: In inspection phase
- **FinaledClosed**: Completed and closed
- **Canceled**: Canceled

### Internal Stages
- **WaitingOnContractorDocs**: Waiting for contractor documents
- **WaitingOnCounty**: Waiting on county/jurisdiction
- **WaitingOnBilling**: Ready for billing handoff
- **ReadyToSubmit**: Ready to submit to jurisdiction
- **ReadyToClose**: Ready to close
- **InProgress**: Active work in progress

### Billing Statuses
- **NotSent**: Not sent to billing
- **SentToBilling**: Sent to billing department
- **Billed**: Billed to customer
- **Paid**: Payment received

## File Storage

The application uses local file storage by default, with files stored in the `./storage` directory (configurable via `STORAGE_ROOT` environment variable).

Files are organized as: `storage/permits/{permitId}/{fileName}`

The storage system is abstracted through `lib/storage.ts`, making it easy to migrate to S3 or other cloud storage providers in the future.

## Deployment

### Cloudflare Tunnel Deployment (Recommended for Remote Access)

Cloudflare Tunnel allows you to securely expose your local application to the internet without opening firewall ports. This is ideal for accessing your PermitPro PMS from outside your local network.

**Quick Setup:**

1. **Install cloudflared** (see detailed guide below)
2. **Create a tunnel** in Cloudflare Dashboard (Zero Trust → Networks → Tunnels)
3. **Configure the tunnel** to point to `http://localhost:3000`
4. **Update your `.env`** file:
   ```env
   NEXTAUTH_URL="https://permitpro.yourdomain.com"
   ```
5. **Start your Next.js app** and the tunnel service

For detailed step-by-step instructions, see **[cloudflare-tunnel-setup.md](./cloudflare-tunnel-setup.md)**

### Local Network Deployment

1. **Build the application**

```bash
npm run build
```

2. **Set production environment variables**

Create a `.env.production` file:

```env
DATABASE_URL="file:./prod.db"
NEXTAUTH_URL="http://your-server-ip:3000"
NEXTAUTH_SECRET="your-production-secret"
STORAGE_ROOT="./storage"
```

3. **Run database migrations**

```bash
npx prisma migrate deploy
```

4. **Start the production server**

```bash
npm start
```

### Migrating to Postgres

1. Update `prisma/schema.prisma` datasource:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

2. Update `.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/permitdb"
```

3. Run migrations:

```bash
npx prisma migrate dev
```

### Migrating to S3 Storage

1. Implement `S3StorageAdapter` in `lib/storage.ts`
2. Update storage adapter initialization:

```typescript
const storageAdapter: StorageAdapter = new S3StorageAdapter({
  bucket: process.env.S3_BUCKET,
  region: process.env.S3_REGION,
  // ... other S3 config
})
```

## Scripts

### Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

### Database
- `npm run db:setup` - Run automated database setup script (recommended for first-time setup)
- `npm run db:seed` - Seed database with sample data
- `npm run db:reset` - Reset database and reseed
- `npm run db:migrate` - Run database migrations
- `npm run db:generate` - Generate Prisma Client
- `npm run db:studio` - Open Prisma Studio (database GUI)

### Cloudflare Tunnel
- `./scripts/cloudflare-tunnel.sh start` - Start the tunnel service
- `./scripts/cloudflare-tunnel.sh stop` - Stop the tunnel service
- `./scripts/cloudflare-tunnel.sh restart` - Restart the tunnel service
- `./scripts/cloudflare-tunnel.sh status` - Show tunnel status
- `./scripts/cloudflare-tunnel.sh logs` - View tunnel logs
- `./scripts/cloudflare-tunnel.sh install` - Install cloudflared

## Development

### Adding New Features

1. **Database Changes**: Update `prisma/schema.prisma`, then run `npx prisma migrate dev`
2. **API Routes**: Add new routes in `app/api/`
3. **UI Components**: Add components in `components/`
4. **Pages**: Add pages in `app/`

### Code Style

- TypeScript strict mode enabled
- ESLint configured for Next.js
- Prefer Server Components where possible
- Use Zod for validation
- Follow existing component patterns

## Troubleshooting

### Database Issues

```bash
# Reset database
npx prisma migrate reset

# Regenerate Prisma Client
npx prisma generate
```

### Authentication Issues

- Ensure `NEXTAUTH_SECRET` is set
- Check that `NEXTAUTH_URL` matches your deployment URL
- Verify user exists in database (run seed script)

### File Upload Issues

- Check `STORAGE_ROOT` directory exists and is writable
- Verify file size limits (default: 50MB)
- Check disk space

## License

This project is built for internal use by permit coordination companies.

## Support

For issues or questions, please refer to the code documentation or contact your system administrator.

---

**Built with care for permit coordination professionals** 🏗️
