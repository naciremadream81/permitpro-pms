---
target: dashboard
total_score: 24
p0_count: 0
p1_count: 3
p2_count: 2
timestamp: 2026-06-11T02-23-37Z
slug: app-dashboard-page-tsx
---
# Design Critique: Dashboard

**Target:** `app/dashboard/page.tsx`  
**Date:** 2026-06-11

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Alert strip surfaces urgency; no empty-state guidance when counts are zero |
| 2 | Match System / Real World | 2 | PageHeader shows raw role slug (`coordinator view`); status labels still feel enum-derived |
| 3 | User Control and Freedom | 3 | Clear drill-down links; dashboard itself is read-only with no filters |
| 4 | Consistency and Standards | 2 | Shell is tokenized; dashboard body still uses `gray-*` / `blue-600` — drift from DESIGN.md and polished admin pages |
| 5 | Error Prevention | 3 | Read-only surface; n/a for most prevention heuristics |
| 6 | Recognition Rather Than Recall | 3 | Metrics and quick links visible; sidebar partially duplicates quick links |
| 7 | Flexibility and Efficiency | 2 | No keyboard shortcuts, filters, or role-specific layout tuning |
| 8 | Aesthetic and Minimalist Design | 2 | Four identical KPI cards + alert strip + sidebar column = template density and redundancy |
| 9 | Error Recovery | 3 | n/a on dashboard |
| 10 | Help and Documentation | 1 | No explanation of what “stalled” or compliance thresholds mean for new users |
| **Total** | | **24/40** | **Acceptable — significant improvements needed before users are happy** |

## Anti-Patterns Verdict

**LLM assessment:** Not full AI slop, but the dashboard reads as a **generic SaaS KPI template** — exactly what PRODUCT.md anti-references call out. Four equal-weight cards (icon + label + big number + subtitle) sit below an alert strip that repeats the same signals. The shell redesign is credible; the dashboard body still feels like the pre-redesign admin template dropped into a new frame.

**Deterministic scan:** `detect.mjs` on `app/dashboard/page.tsx` returned **0 findings** (no side stripes, gradient text, or gray-on-color detector hits in markup).

**Browser visualization:** Not run — no reliable browser automation in this session; dev server returned 404 on `/dashboard` (likely auth redirect or server not serving). No overlay available.

## Overall Impression

The dashboard has the right *data* for coordinators (stalled, compliance, review backlog, my packages) and uses `PageHeader` + `AppLayout` correctly. The biggest gap is **workflow hierarchy**: urgency signals compete with decorative KPI cards instead of leading with a single “attention queue.” Visual token drift undermines the Stripe Dashboard calm-precision goal on the most visited page.

## What's Working

1. **Alert strip concept** — Surfacing stalled packages, expiring compliance docs, and open review comments matches “what needs my attention next?” when alerts exist.
2. **Role-aware data fetching** — Review backlog scopes to reviewer; admin gets recent permits; coordinators get `My Packages` sorted by oldest activity.
3. **My Packages table** — Project link, status badge, jurisdiction, and idle-day highlighting (`≥3d` in red) give actionable context without opening each permit.

## Priority Issues

### [P1] Token drift on the primary surface
- **What:** KPI cards, table headers, links, and quick links use `text-gray-600`, `text-blue-600`, `hover:bg-gray-50` instead of `ink`, `muted`, `accent`, `surface-inset`.
- **Why it matters:** Dashboard is the first screen after login. Drift breaks “one system, three roles” and makes PermitPro feel half-migrated.
- **Fix:** Migrate dashboard typography, links, and table chrome to design tokens; use `text-accent` for links and `Button`/`Card` patterns from counties admin.
- **Suggested command:** `/impeccable polish app/dashboard`

### [P1] Generic four-card KPI grid (anti-reference hit)
- **What:** `grid md:grid-cols-2 lg:grid-cols-4` with icon + label + `text-2xl font-bold` + subtitle repeats the SaaS template PRODUCT.md rejects.
- **Why it matters:** Coordinators scan for exceptions, not four equal metrics. Equal cards dilute urgency and duplicate the alert strip.
- **Fix:** Collapse to 1–2 summary metrics or replace the grid with an **attention-first list** (stalled → compliance → review) and demote totals to a compact sidebar stat.
- **Suggested command:** `/impeccable distill app/dashboard` or `/impeccable shape dashboard attention hierarchy`

### [P1] Weak role-specific empty states
- **What:** Reviewer view is a single card with a sentence and link. Coordinator with zero assigned packages shows **nothing** in the main column (no empty state).
- **Why it matters:** First-time or lightly loaded users hit a blank workspace — violates “respect the workflow” and Nielsen #1 (status visibility).
- **Fix:** Add welcoming empty states with one primary CTA (`New Permit`, `Go to review queue`) per role.
- **Suggested command:** `/impeccable onboard app/dashboard`

### [P2] Redundant metrics (alert strip + KPI cards)
- **What:** Stalled count and compliance alerts appear in both `AlertStrip` and dedicated KPI cards.
- **Why it matters:** Extraneous cognitive load — users parse the same signal twice (failed checklist: visual noise).
- **Fix:** Keep alerts OR KPI cards for urgency, not both. Prefer alert strip + table, drop duplicate cards.
- **Suggested command:** `/impeccable distill app/dashboard`

### [P2] Developer-facing PageHeader copy
- **What:** `description={`${role} view`}` renders `coordinator view` / `admin view` — internal role slugs.
- **Why it matters:** Breaks match-with-real-world; feels like debug UI on the home screen.
- **Fix:** Human labels: “Your active packages and alerts” / “Team pipeline overview” / “Assignments awaiting review.”
- **Suggested command:** `/impeccable clarify app/dashboard`

## Persona Red Flags

**Alex (Power User):** KPI cards are not clickable — must hunt for `My Packages` or `/reports`. Quick Links duplicate sidebar destinations without adding speed. No keyboard path to stalled packages.

**Sam (Accessibility):** Alert strip sublabels use `opacity-70` on tinted backgrounds — contrast risk. Stalled/compliance urgency in KPI cards relies on red/yellow text and borders without non-color cues beyond icons. Table headers lack `scope` attributes.

**Taylor (Coordinator — project persona):** Alert strip links stalled packages to `/reports` instead of a filtered permit list — extra navigation to act. When `myPackages` is empty, the main workspace is blank with no guidance on next step.

## Minor Observations

- Status breakdown shows transformed enum strings (`In Review`) — consider shared status label map for consistency with `StatusBadge`.
- `Quick Links` partially mirrors sidebar admin nav — low value column on desktop.
- Review backlog link uses legacy `text-blue-600` instead of accent token.

## Questions to Consider

- What if the dashboard showed **only exceptions** above the fold and moved totals to a collapsible summary?
- What would a reviewer see if the queue preview listed the next 5 assignments inline (like `My Packages` for coordinators)?
- Does “Pipeline Report” deserve top billing over a direct “Stalled packages” filtered view?
