---
target: dashboard
total_score: 33
p0_count: 0
p1_count: 0
p2_count: 1
p3_count: 3
timestamp: 2026-06-11T02-37-21Z
slug: app-dashboard-page-tsx
---
# Design Critique: Dashboard

**Target:** `app/dashboard/page.tsx`  
**Date:** 2026-06-11 (post P2 + P3 fixes)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Alerts, all-clear, role tables, and empty states communicate state clearly |
| 2 | Match System / Real World | 4 | Role descriptions, `formatStatus` labels, actionable alert copy |
| 3 | User Control and Freedom | 4 | Status breakdown and alerts drill into filtered list views |
| 4 | Consistency and Standards | 3 | Reviewer assignment status uses ad-hoc pill, not `StatusBadge` |
| 5 | Error Prevention | 3 | Read-only surface; no destructive actions on dashboard |
| 6 | Recognition Rather Than Recall | 4 | Work lists, counts, and CTAs visible without memorizing routes |
| 7 | Flexibility and Efficiency | 2 | No keyboard shortcuts, bulk actions, or personalization |
| 8 | Aesthetic and Minimalist Design | 3 | Attention-first layout holds; admin team note card adds thin vertical noise |
| 9 | Error Recovery | 3 | n/a on dashboard |
| 10 | Help and Documentation | 3 | Thresholds in alert sublabels; no persistent glossary for stall/compliance rules |
| **Total** | | **33/40** | **Good — solid ops console; polish band within reach** |

## Anti-Patterns Verdict

**LLM assessment:** Does not read as generic AI SaaS. The KPI-card grid is gone, tokens are consistent, alerts use shared components, and drill-down links close the loop from signal to action. Stripe Dashboard discipline with Permit Teal accent — aligned with PRODUCT.md.

**Deterministic scan:** 0 findings on `app/dashboard/page.tsx` (CLI `detect.mjs --json`).

## Overall Impression

The dashboard now behaves like an operations console: alerts first, role-specific work second, compact pipeline context in the sidebar. The biggest remaining gap is consistency micro-details (reviewer status pill) and expert-efficiency features — not structural UX.

## What's Working

1. **Attention hierarchy** — `AttentionAlertsPanel` with tokenized tones and filtered destinations (`stalled`, `compliance=expiring`, review queue).
2. **Actionable sidebar** — Status breakdown rows link to `/permits?status=…`; pipeline counts link to permits and review queue.
3. **Role-aware empty states** — Coordinator, reviewer, and admin paths avoid misleading copy when team data exists.

## Priority Issues

- **[P2] Reviewer status inconsistency** — Review queue table uses `bg-accent-muted` pill with raw `ASSIGNED` / `IN_REVIEW` strings instead of `StatusBadge` + `formatStatus`.
  - **Fix:** Swap to `StatusBadge` (already mapped in `getStatusColor`).
  - **Command:** `/impeccable polish app/dashboard`

- **[P3] Admin team note card** — "Team pipeline" one-liner card sits above Recent permits when admin has no personal packages; adds a card without much density.
  - **Fix:** Fold copy into Recent permits card header/description, or use a single muted banner.
  - **Command:** `/impeccable distill app/dashboard`

- **[P3] Table accessibility** — Work-list tables lack `<caption>` or `aria-label`; screen reader users hear columns without table purpose.
  - **Fix:** Add visually hidden captions per table.
  - **Command:** `/impeccable audit app/dashboard`

- **[P3] Stall signal relies partly on color** — Last-activity column uses `text-destructive` at 3+ days; text carries meaning but no icon/tooltip explains the threshold.
  - **Fix:** Optional `title` attribute or inline "Stalled" label when threshold met.
  - **Command:** `/impeccable clarify app/dashboard`

## Persona Red Flags

**Alex (Power User):** No keyboard path to jump from alert chip to filtered list beyond Tab-through links. Review backlog count links to queue but cannot bulk-assign from dashboard.

**Sam (Accessibility):** Tables missing captions. Alert chips are links (good) but no `aria-label` summarizing "3 stalled packages, view filtered list" beyond visible text.

**Morgan (Coordinator — project persona):** Empty state CTA duplicates header "New permit" — not blocking, but two identical primary actions on one screen when empty.

## Minor Observations

- `PipelineSummary` and Status breakdown are both cards in a narrow sidebar — acceptable but slightly card-heavy per DESIGN.md "cards are lazy."
- Review comment alert links to `/review-queue` unfiltered; could deep-link to unresolved filter if one exists later.

## Questions to Consider

- Could the admin "Team pipeline" note become a single line under `PageHeader` instead of its own card?
- What one keyboard shortcut would coordinators use daily if we added only one?
