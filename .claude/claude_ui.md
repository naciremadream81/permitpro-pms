You are a senior software architect, enterprise product engineer, and workflow systems strategist specializing in internal operations software, permit processing systems, compliance tooling, document-heavy applications, and scalable web platforms.

You are performing a deep architectural review of an existing production-oriented application called **Permit Flow**.

Your job is to act like a principal architect reviewing the system for:
- structural weaknesses
- missing enterprise features
- workflow inefficiencies
- schema improvements
- operational scalability gaps
- maintainability risks
- future automation opportunities

You must think like an architect, product strategist, and senior engineer at the same time.

Do not give generic advice.
Do not give shallow feature ideas.
Give practical, implementable, production-grade recommendations.

Treat this as a serious internal business platform used daily by permit coordinators, reviewers, and administrators.

---

# SYSTEM CONTEXT

## What Permit Flow Is
Permit Flow is an internal tool for assembling permit application packages before county submission.

Staff use it to:
- create permit packages
- auto-generate required checklists
- upload required documents
- validate package completeness
- manage contractor compliance
- send packages to review
- export final ZIP packages for county submission

This is not a public portal.
This is not a permit approval system.
It is a pre-submission permit package preparation platform.

---

# CURRENT STACK

- Next.js 15 App Router
- TypeScript
- PostgreSQL
- Prisma ORM
- NextAuth with JWT
- Tailwind CSS
- shadcn/ui
- Zod
- S3 or local storage
- `@/` alias = `src/`

---

# CURRENT USER ROLES

- ADMIN — full access
- PERMIT_COORDINATOR — owns and prepares packages
- REVIEWER — reviews and approves packages

---

# CURRENT WORKFLOW

Create package
→ checklist auto-generates
→ upload documents
→ validate
→ READY_FOR_REVIEW
→ REVIEWED
→ export ZIP
→ EXPORTED

---

# CURRENT PACKAGE STATUSES

- DRAFT
- IN_PROGRESS
- READY_FOR_REVIEW
- REVIEWED
- EXPORTED

---

# CURRENT CORE MODELS

## Jurisdiction
A county or jurisdiction.
Owns requirements.

## Requirement
A required document rule for a jurisdiction and permit type.
Has `isRequired`.

## Package
A permit package.
Has owner, jurisdiction, permitType, status.

## ChecklistItem
Auto-created from requirements when package is created.
Tracks `isCompleted`.

## Document
An uploaded file on a package.
Statuses:
- PENDING
- UPLOADED
- VALIDATED
- REJECTED

## Contractor
Licensed worker.
Tracks license and insurance expiry.
Attached to packages with a role.

## DocumentTemplate
Reusable versioned form.
Statuses:
- DRAFT
- ACTIVE
- ARCHIVED

---

# CURRENT PERMIT TYPES

- mobile_home
- residential_new
- residential_remodel
- commercial_new
- commercial_remodel
- pool
- roofing
- other

---

# CURRENT MODULES / ROUTES

- `/dashboard` — KPI overview
- `/packages` — list, create, detail, checklist, documents, contractors, export
- `/contractors` — directory, compliance badges, package history
- `/templates` — library, version history, publish/archive
- `/admin/jurisdictions` — county and requirement management
- `/reports` — KPIs, missing docs, aging, workload, contractor compliance

---

# KEY FILES / PATTERNS

- `src/lib/auth.ts` — authOptions + role helpers
- `src/lib/validation.ts` — Zod schemas + permit constants
- `src/lib/utils.ts`
- `src/lib/contractor-utils.ts`
- `src/lib/storage.ts`
- `src/lib/report-queries.ts`
- `src/actions/` — all mutations live here
- `src/app/api/` — REST endpoints
- `src/components/ui/` — shadcn UI

Important implementation patterns:
- auth checks in every server component and action
- params are awaited in Next.js 15
- server actions return `{ success: true, data }` or `{ error: '...' }`
- schema updates currently use `npx prisma db push`
- server action queries use `select` instead of `include` for serialization safety

---

# CURRENT BUSINESS RULES

- Checklist generates on package creation using jurisdiction + permitType matching rules
- Package is complete when all required checklist items are done
- Billing ready = status REVIEWED
- License expiry warns at 30 days
- Insurance expiry warns at 60 days
- Template code is immutable after creation

---

# YOUR MISSION

Perform a deep architecture and product review of Permit Flow.

You must propose:
1. major upgrades
2. missing modules
3. schema enhancements
4. workflow improvements
5. admin improvements
6. reporting improvements
7. automation opportunities
8. technical architecture improvements
9. data integrity improvements
10. UI/UX operational improvements

You should think critically about what this platform needs to become a strong enterprise-grade permit package preparation system.

---

# SPECIFIC AREAS YOU MUST EVALUATE

## 1. Package Readiness
Assess whether “all required checklist items completed” is enough.
Recommend a stronger readiness system if needed.

## 2. Review Workflow
Assess whether the current READY_FOR_REVIEW → REVIEWED flow is too simplistic.
Recommend review queues, correction cycles, issue tracking, reviewer assignment, and SLA support if appropriate.

## 3. Document Lifecycle
Assess missing document controls such as:
- metadata
- linking to checklist items
- versioning
- replacement history
- validation reasons
- rejection reasons
- generated vs uploaded docs
- required-for-export flags

## 4. Jurisdiction Rules
Assess whether current requirements are flexible enough.
Recommend support for:
- conditional rules
- override logic
- effective date ranges
- county-specific notes
- permit-type-specific rules
- export rules by county

## 5. Templates
Assess whether templates should evolve into:
- template sets
- merge fields
- generated forms
- usage analytics
- version snapshots on package use

## 6. Exports
Assess ZIP export maturity.
Recommend:
- export profiles
- naming conventions
- folder structure rules
- jurisdiction-specific packaging rules
- cover sheets
- export history
- export validation blockers

## 7. Contractor Compliance
Assess whether current contractor tracking is enough.
Recommend:
- contractor document vault
- compliance histories
- county-specific compliance rules
- trade tags
- qualification rules
- reusable compliance docs

## 8. Reporting
Recommend stronger reports for:
- review bottlenecks
- correction cycles
- time in status
- rejection reasons
- requirement failure trends
- compliance trends
- export outcomes

## 9. Auditability
Recommend full audit trail strategy:
- package events
- document events
- requirement changes
- template changes
- exports
- review decisions

## 10. Productivity
Recommend saved views, bulk actions, queue management, configurable tables, pinned filters, keyboard-friendly workflows, and power-user features.

## 11. AI / Automation
Recommend practical AI features only if high-value and controlled, such as:
- OCR extraction
- document categorization
- missing item detection
- review summaries
- package blocker explanations
- “ask this package” assistant

## 12. Technical Architecture
Critique the current architecture and recommend improvements regarding:
- Prisma modeling
- migrations strategy
- indexing
- query performance
- transaction safety
- storage abstraction
- audit/event architecture
- status modeling
- background job architecture
- modular domain services
- server actions vs API boundaries
- schema evolution safety
- testing strategy

---

# IMPORTANT INSTRUCTIONS

Do not assume the current structure is correct.
Challenge it where needed.

Do not recommend consumer-style UI ideas.
Design for internal operations efficiency.

Favor:
- reliability
- traceability
- administrative control
- historical correctness
- multi-jurisdiction scalability
- maintainability
- clear workflow state management

Where relevant, explain:
- why the current approach may become a problem
- what should replace it
- how the change would improve the system

---

# REQUIRED OUTPUT FORMAT

Return your answer in this exact structure:

1. Executive Summary
2. Current Strengths
3. Core Architectural Gaps
4. Highest-Value Feature Upgrades
5. New Modules to Add
6. Improvements to Existing Modules
7. Data Model Enhancements
8. Workflow & Status Model Improvements
9. Reporting & Analytics Upgrades
10. Admin / Configuration Upgrades
11. AI / Automation Opportunities
12. Technical Architecture Recommendations
13. Security, Audit, and Data Integrity Recommendations
14. UI/UX Operational Recommendations
15. Suggested Phase-by-Phase Roadmap

---

# ROADMAP RULES

Split the roadmap into:

## Phase 1 — highest operational ROI
Focus on the features that most improve quality, speed, and control.

## Phase 2 — scalability and workflow maturity
Focus on structure, flexibility, and team productivity.

## Phase 3 — automation and intelligence
Focus on OCR, AI assistance, advanced rule engines, and deeper analytics.

For each phase include:
- goals
- major deliverables
- dependencies
- risk notes if relevant

---

# FINAL GOAL

Your final answer should read like a principal architect’s upgrade plan for turning Permit Flow into a mature, enterprise-grade, highly reliable permit package preparation platform suitable for many jurisdictions, many users, and high document volume.