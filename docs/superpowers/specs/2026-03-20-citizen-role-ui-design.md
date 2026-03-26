# Citizen Role UI Design

**Date:** 2026-03-20
**Project:** PermitPro PMS
**Status:** Approved

---

## Overview

Add a citizen-facing UI mode to the existing authenticated admin application. A `RoleContext` layer sits alongside NextAuth, controlling a `uiRole` toggle (`'admin' | 'citizen'`). The existing admin functionality remains fully intact; the citizen experience is an additive overlay.

---

## Architecture

### Integration Approach

Option A: single layout with a `uiRole` context layer. No existing routes change. No existing pages are modified beyond the dashboard and layout wrappers.

```
context/
  RoleContext.tsx

components/layout/
  sidebar.tsx         (updated — role-aware nav)
  header.tsx          (updated — pill toggle)
  app-layout.tsx      (updated — wrapped with RoleProvider)

app/
  dashboard/
    page.tsx          (updated — branches on uiRole)
    citizen-dashboard.tsx  (new)
  new-application/
    page.tsx          (new — 3-step wizard)

lib/
  mock-data.ts        (new — citizen mock data)
```

---

## RoleContext

**File:** `context/RoleContext.tsx`

```ts
type UiRole = 'admin' | 'citizen'

interface RoleContextValue {
  uiRole: UiRole
  toggleUiRole: () => void
  mounted: boolean   // true after first client render
}
```

- Internal state initialises to `'admin'` (SSR-safe default).
- A `useEffect` runs after mount, reads `localStorage` key `'permitpro-ui-role'`, and updates state if a saved value exists. This avoids SSR/client hydration mismatch.
- `mounted` is `false` during SSR and flips to `true` after the effect fires. Consumers that render role-dependent UI should gate on `mounted` to suppress the flash and prevent React hydration warnings.
- `toggleUiRole()` flips the value and writes it to `localStorage`.
- `useRole()` custom hook exported for consumers.

**Provider placement:** `RoleProvider` is rendered **inside `AppLayout`**, wrapping the *entire* layout content — `<Sidebar>`, `<Header>`, and `{children}` are all rendered inside `<RoleProvider>`. This ensures all three can consume `useRole()`. Concretely, `app-layout.tsx` becomes:

```tsx
return (
  <RoleProvider>
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  </RoleProvider>
)
```

The `Providers` component in `session-provider.tsx` is not changed.

---

## Header Updates

**File:** `components/layout/header.tsx`

Add an Admin / Citizen pill toggle to the right side of the header, left of the user avatar:

- Two segments: "Admin View" and "Citizen View"
- Active segment: filled blue background, white text
- Inactive segment: transparent, gray text
- Calls `toggleUiRole()` on click
- Hidden on the `/new-application` route: `header.tsx` must add `import { usePathname } from 'next/navigation'` and conditionally render the toggle only when `pathname !== '/new-application'`
- Gate rendering on `mounted` from `useRole()` to avoid hydration flash

---

## Sidebar Updates

**File:** `components/layout/sidebar.tsx`

Reads `uiRole` from `RoleContext`.

**Admin nav (unchanged):**
- Dashboard → `/dashboard`
- Permits → `/permits`
- Customers → `/customers`
- Contractors → `/contractors`
- Reports → `/reports`
- Settings → `/settings` (admin only, existing behaviour)

**Citizen nav** (with `lucide-react` icons):
- Dashboard → `/dashboard` — `LayoutDashboard` icon
- New Application → `/new-application` — `PlusCircle` icon
- Help (static, `href="#"`) — `HelpCircle` icon

**Note:** "My Permits" is intentionally omitted from citizen nav in this phase. The existing `/permits` page shows all permits with no citizen filtering — linking citizens there would expose unfiltered admin data. This can be added in a future phase when a filtered citizen permits view is built.

**Settings guard:** The existing `isAdmin` guard (`session?.user?.role === 'admin'`) that shows the Settings link must be updated to also require `uiRole === 'admin'`. This ensures Settings disappears when an admin-session user switches to citizen view.

---

## Citizen Dashboard

**File:** `app/dashboard/citizen-dashboard.tsx`

Client component. All data sourced from `lib/mock-data.ts`.

### Sections

1. **Welcome card** — "Welcome, [user name]" + tagline "Apply for residential permits for fences, renovations, and more."

2. **Status cards (3):**
   - In Review (count)
   - Approved (count)
   - Rejected (count)

3. **Permit Application Progress** — timeline for the most recent application showing steps: Submitted → In Review → Approved → Permit Issued. Current step highlighted.

4. **Submit New Permit CTA** — prominent button linking to `/new-application`

5. **My Applications table** — columns: Permit Type, Address, Submitted, Status badge. Sourced from mock applications array. Shows last 5 entries.

### Status badge colours
- Pending: amber
- In Review: blue
- Approved: green
- Rejected: red
- Overdue: red

---

## Dashboard Page Update

**File:** `app/dashboard/page.tsx`

The page is currently `force-dynamic` and fetches real data server-side. The refactor must not break the existing admin data fetching.

### New component: `app/dashboard/admin-dashboard-view.tsx`

Extract the existing inline JSX (KPI cards, status breakdown, recent permits table) from `page.tsx` into a new `'use client'` component `AdminDashboardView`. Props shape mirrors the exact Prisma query output, serialised to plain values (Prisma `Date` objects must be converted to ISO strings before passing to client components):

```ts
interface AdminDashboardViewProps {
  totalPermits: number
  permitsWaitingOnBilling: number
  permitsByStatus: { status: string; _count: number }[]
  recentPermits: {
    id: string
    projectName: string
    status: string
    customer: { id: string; name: string }
    contractor: { id: string; companyName: string }
    tasks: { name: string; dueDate: string | null }[]  // Date serialised to ISO string
  }[]
}
```

**Serialisation note:** In `page.tsx`, before passing `recentPermits` to `DashboardContent`, map `task.dueDate` from `Date | null` to `string | null` via `.toISOString()`. This prevents Next.js "cannot serialise Date" errors at the server→client boundary.
```

### New component: `app/dashboard/dashboard-content.tsx`

A `'use client'` component that:
- Accepts `AdminDashboardViewProps` as props
- Reads `uiRole` and `mounted` from `useRole()`
- If `!mounted`, renders a neutral loading skeleton (prevents flash)
- If `uiRole === 'admin'`, renders `<AdminDashboardView {...props} />`
- If `uiRole === 'citizen'`, renders `<CitizenDashboard />`

### Updated `app/dashboard/page.tsx`

Server component keeps all existing data-fetching logic. At render time it passes the fetched data to `<DashboardContent>` instead of rendering JSX directly.

---

## New Application Wizard

**File:** `app/new-application/page.tsx`
**Directive:** `'use client'`
**Layout:** This page does **not** use `AppLayout`. It has its own minimal full-page layout (no sidebar). The page file renders its own wrapper div directly. This is consistent with the `/login/page.tsx` pattern already in the project.
**Auth guard:** The page is a client component, so it uses `useSession()` from `next-auth/react` (not the server-side `getSession()`). If `status === 'unauthenticated'`, call `router.replace('/login')`. If `status === 'loading'`, render a neutral loading state. This is required because `AppLayout` is not present.
**Role access:** If `mounted && uiRole !== 'citizen'`, render an Access Denied panel. Gate on `mounted` to avoid flashing the denial state during SSR.

### Step Progress Indicator

Sticky bar at top showing 3 steps with labels and a filled/empty circle indicator:
1. Permit Details
2. Contractor Selection
3. Review & Submit

### State & Persistence

All form state stored in React `useState`. On every field change, the relevant key is written to `localStorage` under `'permitpro-new-application'`. On mount, state is hydrated from `localStorage`.

On successful submit: clear `localStorage` key, show success panel.

### Step 1 — Permit Details

Fields:
- Customer Name (text, required)
- Property ID (text, required)
- Property Address (text, required)
- Permit Type (dropdown: Building, Electrical, Plumbing, Mechanical, Roofing, HVAC, Structural, Mobile Home, Other)
- Project Description (textarea, optional)

Validation: inline error messages below each field on blur. "Next" button disabled until all required fields are valid.

### Step 2 — Contractor Selection

- Dropdown of contractors sourced from `lib/mock-data.ts` (pre-populated list)
- "Contractor not listed? Add New" link reveals inline form:
  - Contractor Name, Company Name, License Number, Phone, Email, Business Address
  - "Save Contractor" adds entry to dropdown and selects it
  - New contractor persisted to `localStorage`
- Back and Next buttons

### Step 3 — Review & Submit

Summary card showing all Step 1 and Step 2 data. Read-only.

**File Upload section:**
- Label: "Supporting Documents"
- Accepts: PDF, JPG, PNG
- Max file size: 5 MB per file (validated client-side; error shown if exceeded)
- Image files: show thumbnail preview
- PDF files: show a document icon + filename
- File names (not binaries) persisted to `localStorage`

**Submit button:** on click:
1. Clears `localStorage` key
2. Replaces wizard content with a success panel:
   - Confirmation message
   - Application reference number (mock, e.g. `APP-2026-00142`)
   - "Submit Another" button (resets wizard)
   - "Go to Dashboard" link

---

## Mock Data

**File:** `lib/mock-data.ts`

Exports:
- `citizenApplications: Application[]` — 5–6 sample applications with varied statuses
- `mockContractors: Contractor[]` — 6–8 named contractors with license numbers
- `citizenStatusCounts: { inReview: number, approved: number, rejected: number }`
- `citizenProgressTimeline: ProgressStep[]` — steps for the most recent application

Types defined inline in the file (no separate types file needed).

---

## Out of Scope

The following pages from the original spec are **not** included in this phase to keep scope tight:

- `/applications`, `/approvals`, `/users` as new routes — the existing `/permits` page serves admin needs; citizen sees it filtered
- Contractor Dashboard (separate role, not implemented in this phase)
- Real backend integration for the wizard — wizard submits to mock state only

---

## File Change Summary

| File | Action |
|---|---|
| `context/RoleContext.tsx` | Create |
| `lib/mock-data.ts` | Create |
| `components/layout/header.tsx` | Update |
| `components/layout/sidebar.tsx` | Update |
| `components/layout/app-layout.tsx` | Update |
| `app/dashboard/page.tsx` | Update |
| `app/dashboard/admin-dashboard-view.tsx` | Create |
| `app/dashboard/dashboard-content.tsx` | Create |
| `app/dashboard/citizen-dashboard.tsx` | Create |
| `app/new-application/page.tsx` | Create |
