# Product

## Register

product

## Users

Permit coordination staff at small-to-mid permit expeditor firms — coordinators who shepherd packages from intake through jurisdiction submission, reviewers who evaluate submissions and resolve comments, and admins who configure jurisdictions, export profiles, and compliance settings. All three roles share the same app shell and visual language; no role is secondary in the design target. They work at desks during business hours, often juggling multiple active packages, county deadlines, and contractor document gaps. Context is high-stakes but routine: missing a stall signal or an expiring compliance doc has real downstream cost.

## Product Purpose

PermitPro PMS is the operational hub for permit package lifecycle management — customers, contractors, documents, review queues, billing handoff, and status tracking from creation through closure. Success means coordinators see what needs attention without digging, reviewers move packages forward with clear context, admins configure jurisdictions without fighting the UI, and leadership trusts the pipeline numbers on the dashboard.

## Brand Personality

Calm, precise, trustworthy — like Stripe Dashboard: high signal density without visual noise, confident hierarchy, and a sense that the tool is built for serious operational work. Warm enough to feel human (not cold enterprise), but never decorative. Professional clarity over personality theatrics.

## Anti-references

- **Generic SaaS dashboard tropes:** Inter-by-default feel, purple gradients, identical KPI card grids, decorative icon + heading + blurb card repeats, and "startup template" visual sameness.
- **Dense legacy enterprise ERP:** Tiny text, overwhelming chrome, nested panels within panels, and screens that require training to parse.
- **AI slop tells:** Side-stripe accent borders (`border-l-4`), gradient text, glassmorphism-as-default, eyebrow kickers on every section, numbered section scaffolding (01 / 02 / 03), and gray text on tinted status backgrounds.

## Design Principles

1. **Respect the workflow** — Every screen answers "what needs my attention next?" before "what can I configure?"
2. **Calm precision over visual noise** — Information density is allowed; hierarchy, spacing, and copy should feel scannable and trustworthy, like a well-run operations console.
3. **Signal over decoration** — Status, urgency, and compliance risk use color and placement deliberately; nothing ornamental without a job.
4. **One system, three roles** — Coordinators, reviewers, and admins share one shell, one token set, and one interaction model; role differences are in content and permissions, not visual dialect.
5. **Trust through consistency** — Migrated pages use design tokens (`canvas`, `surface`, `accent`, `ink`, `muted`); legacy Tailwind defaults (`gray-*`, `blue-*`, side stripes) are technical debt to eliminate, not patterns to extend.

## Accessibility & Inclusion

Target WCAG 2.1 AA across the application. Body text and interactive labels must meet contrast requirements; focus states must be visible on keyboard navigation; form errors must be programmatically associated and readable. Honor `prefers-reduced-motion` for any motion beyond essential feedback. Design for users who may be color-blind — never rely on color alone for status or urgency.
