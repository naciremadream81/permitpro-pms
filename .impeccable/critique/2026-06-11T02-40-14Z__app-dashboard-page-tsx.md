---
target: dashboard
total_score: 35
p0_count: 0
p1_count: 0
p2_count: 0
p3_count: 3
timestamp: 2026-06-11T02-40-14Z
slug: app-dashboard-page-tsx
---
# Design Critique: Dashboard

**Target:** `app/dashboard/page.tsx`  
**Date:** 2026-06-11 (post polish pass)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Alerts, all-clear, stall labels, and role tables communicate state clearly |
| 2 | Match System / Real World | 4 | Role descriptions, formatted statuses, actionable alert copy |
| 3 | User Control and Freedom | 4 | Alerts and status breakdown drill into filtered list views |
| 4 | Consistency and Standards | 4 | Tokenized alerts, StatusBadge in all tables, shared components |
| 5 | Error Prevention | 3 | Read-only surface |
| 6 | Recognition Rather Than Recall | 4 | Work lists, counts, CTAs, and table captions reduce memory load |
| 7 | Flexibility and Efficiency | 2 | No keyboard shortcuts or personalization |
| 8 | Aesthetic and Minimalist Design | 4 | Attention-first layout; admin context is a single line, not an extra card |
| 9 | Error Recovery | 3 | n/a |
| 10 | Help and Documentation | 3 | Stall/compliance thresholds in sublabels; no settings glossary |
| **Total** | | **35/40** | **Good — near excellent; minor polish only** |

## Anti-Patterns Verdict

**LLM assessment:** Reads as a purpose-built operations console, not a SaaS template. No KPI card grid, no side stripes, no gray/blue legacy on the dashboard itself. Stripe Dashboard discipline with Permit Teal accent.

**Deterministic scan:** 0 findings (`detect.mjs --json`).

## Overall Impression

The dashboard iteration landed. Signal → action loops are closed (alerts and breakdown link to filtered views), role paths are coherent, and accessibility basics (captions, stall text) are in place. Remaining gaps are mostly downstream consistency and expert-efficiency features — not structural UX debt.

## What's Working

1. **Closed-loop alerts** — Tokenized `AttentionAlertsPanel` with destinations for stalled permits, expiring compliance, and open comments.
2. **Unified status language** — `StatusBadge` + `formatStatus` across coordinator, reviewer, and admin tables.
3. **Distilled admin path** — Inline team context replaces the redundant card; empty-state logic respects team data.

## Priority Issues

- **[P3] Review enum label formatting** — `StatusBadge` on `IN_REVIEW` / `ASSIGNED` may render awkwardly via `formatStatus` (designed for camelCase permit statuses).
  - **Fix:** Add enum-specific labels in `formatStatus` or a review-status formatter.
  - **Command:** `/impeccable clarify components/ui/badge`

- **[P3] Drill-down journey styling** — Alert links land on `/permits` and `/contractors` pages that still use legacy `gray-*` / `blue-*` chrome, breaking visual continuity.
  - **Fix:** Token-migrate list pages (permits first — highest traffic from dashboard).
  - **Command:** `/impeccable polish app/permits`

- **[P3] Open comments alert depth** — Links to unfiltered `/review-queue`; unresolved-only filter would match alert semantics if the route supports it.
  - **Command:** `/impeccable shape review-queue unresolved filter`

## Persona Red Flags

**Alex (Power User):** Still no keyboard accelerators; must Tab through alert chips and table links.

**Sam (Accessibility):** Table captions added (good). Alert chips could use explicit `aria-label` with full context beyond visible text.

**Casey (Mobile):** Tables scroll horizontally (ok); primary "New permit" stays in header on mobile — acceptable thumb reach via PageHeader actions.

## Minor Observations

- Empty coordinator state duplicates header "New permit" CTA when no packages exist.
- Sidebar still stacks two cards (Pipeline + Status breakdown) — acceptable for ops density.
- `STALL_DAYS` / `COMPLIANCE_WARN_DAYS` duplicated across dashboard, permits, contractors — candidate for shared constant.

## Questions to Consider

- Is one keyboard shortcut (e.g. `n` for new permit) worth adding to the shell?
- Should the permits list migration happen before or after other admin pages?
