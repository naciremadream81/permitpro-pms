---
name: PermitPro
description: Unigrid / Heritage Teal — flat federal-modern permit operations, organized by who holds the ball
colors:
  canvas: "#fbfaf6"
  surface: "#ffffff"
  surface-inset: "#f0efe7"
  ink: "#1c2b29"
  muted: "#5d6b68"
  border: "#dde1da"
  accent: "#123f3b"
  accent-muted: "#e3eae5"
  band: "#123f3b"
  band-foreground: "#f4f1e7"
  court-us: "#9e3b2e"
  court-county: "#0f6066"
  court-field: "#2f6b40"
  urgent: "#b3382c"
typography:
  headline:
    fontFamily: "var(--font-archivo), system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.2
    textTransform: uppercase
  body:
    fontFamily: "var(--font-archivo), system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "var(--font-archivo), system-ui, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 700
    letterSpacing: "0.14em"
    textTransform: uppercase
rounded:
  sm: "0px"
  md: "0px"
  lg: "0px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.band-foreground}"
    rounded: "0px"
    padding: "10px 20px"
    textTransform: uppercase
  button-primary-hover:
    backgroundColor: "#0d302d"
    textColor: "{colors.band-foreground}"
  nav-active:
    textColor: "{colors.band-foreground}"
    borderBottom: "3px solid {colors.band-foreground}"
---

# Design System: PermitPro — Unigrid / Heritage Teal

## Overview

**Creative North Star: "The Operations Board"** (Direction D — see `design-directions/README.md`
for the full decision log; mockup: `design-directions/d-unigrid.html`, palette:
`d-unigrid-colors.html` → Heritage Teal).

Flat mid-century federal modernism — NPS Unigrid / NASA Graphics Standards Manual — applied to
permit operations. Structure comes from thick ink rules and solid color blocks, never from
shadows, gradients, or rounding. The organizing idea is **ball-in-court**: work is grouped by who
holds the ball (our court / with jurisdiction / fieldwork / closing) via `lib/court.ts`, a pure
presentation-layer mapping from `PermitStatus`.

**Key Characteristics:**
- Heritage Teal token set in `app/globals.css` + `tailwind.config.ts` (light + dark via `.dark`)
- **Band shell:** deep teal masthead band (`components/layout/band-header.tsx`) with the wordmark,
  session meta, and top navigation as underlined uppercase links — no sidebar on desktop;
  mobile uses the existing drawer
- Archivo (variable, width axis) for all type; tabular numerals globally
- Radii are 0 everywhere; elevation = tonal steps + 1px/2px/4px ink rules
- Status = solid color chips with near-white text (WCAG AA), uppercase, square
- WCAG 2.1 AA targets throughout; never color alone for status

**Shell status (2026-06):** All screens migrated — board (dashboard), permits list/detail,
review queue, contractors (+vault), customers, reports, admin (counties/jurisdictions/export
profiles), settings, login. No `gray-*`/`blue-*` legacy classes remain.

## Colors

**The Solid-Signal Rule.** Paper-white field (`canvas` `#fbfaf6`) and warm white surfaces carry
the interface. Color appears as *solid blocks with white text* (chips, distribution bars, the
band) — never as pale tinted backgrounds with colored text.

### Primary
- **Band Teal** (`--band` / `--accent` `#123f3b`): masthead band, primary buttons, links, focus.
- **Band Foreground** (`#f4f1e7`): text on band/accent.

### Court (ball-in-court ownership — `lib/court.ts`)
- **Our court** (`--court-us` `#9e3b2e` clay): we owe action.
- **With jurisdiction** (`--court-county` `#0f6066` deep teal): county holds it.
- **Fieldwork** (`--court-field` `#2f6b40` moss): issued, inspections running.
- **Closing** (`--court-closed` `#5d6a66`): finaled/canceled.
- **Urgent** (`--urgent` `#b3382c`): stall flags, overdue counters, urgent next actions.

### Status chips (`--status-*`)
Solid dark hues with near-white foregrounds: neutral `#5d6a66`, info `#0f6066`,
warning `#7d5113`, success `#2f6b40`, danger `#9e3b2e`, review `#5b3da6`.

### Named Rules
**The No-Tinted-Pill Rule.** Status chips are solid + white text, square. Never pale `*-50`
backgrounds with colored text.
**The One-Accent-Field Rule.** On the paper field, ink and rules dominate; court/status solids are
the only color, and they always mean something.

## Typography

**All type:** Archivo (`--font-archivo`, variable wght + wdth). Wordmark uses
`[font-stretch:115%]` extrabold. Geist remains only as fallback.

### Hierarchy
- **Page title** (800, 24px, uppercase, tracking-tight): `PageHeader` — sits on a 2px ink rule.
- **Group head** (800, ~36px count + 16px uppercase label): board court groups — on a 4px ink rule.
- **Section/card title** (800, 13px, uppercase, 0.08em): `CardTitle`.
- **Column label** (700, 10px, uppercase, 0.14em, muted): table headers.
- **Body** (400, 14px): tables, forms.
- **Counter** (800, 26–30px, tabular): days-held numerals leading list rows.

### Named Rules
**The Big-Number Rule.** Operational urgency is carried by large tabular numerals (days held,
group counts), not icons or badges.

## Elevation

None. Flat at rest, flat on hover (hover = `surface-inset` tonal shift). Hierarchy comes from
rule weight: 4px (group heads), 2px (page/table frame), 1px (row hairlines). The only shadow in
the app is the mobile drawer overlay.

## Components

- **Band header** (`band-header.tsx`): `bg-band text-band-foreground`; nav links use
  `.pp-band-link` (uppercase, 3px underline when active).
- **Buttons** (`button.tsx`): square, bold uppercase tracking; primary = accent solid.
- **Status chips** (`badge.tsx` StatusBadge + `getStatusColor`): solid square chips.
- **Cards** (`card.tsx`): square, 1px border, header underlined with ink rule; prefer full-width
  ruled sections (`border-b-2 border-ink` headers) over cards for new screens.
- **Registers** (permits/contractors/customers lists): "REGISTER — N ITEMS" label, 2px ink rule
  under column heads, hairline rows, 2px rule footer with flat pagination.
- **Notices** (board): ruled rows with outlined uppercase marks (STALLED/EXPIRING/COMMENTS) —
  not alert cards.
- **Distribution bar** (board): flat stacked bar by court — never KPI cards.
- **Inputs** (`.pp-input`): square, surface bg, accent focus outline.

## Do's and Don'ts

### Do:
- **Do** use token classes (`text-ink`, `bg-canvas`, `border-border`, `bg-court-*`, `text-urgent`).
- **Do** group operational lists by court (`statusToCourt`) when the question is "what needs me."
- **Do** lead list rows with the days counter; flag stalls with `text-urgent`.
- **Do** run `node .claude/skills/impeccable/scripts/context.mjs` before UI work.

### Don't:
- **Don't** reintroduce rounding, shadows, gradients, or tinted status pills.
- **Don't** use raw palette classes (`gray-*`, `blue-*`, `emerald-*` …) — they were fully removed.
- **Don't** add a sidebar; navigation lives in the band.
- **Don't** use KPI card grids; the distribution bar + counts are the summary pattern.
