# PermitPro PMS — Agent Context

## Design Context

Impeccable design context lives at the project root:

- **[PRODUCT.md](./PRODUCT.md)** — Strategic: register (`product`), users (coordinators, reviewers, admins — balanced), brand personality (calm/precise, Stripe Dashboard-inspired), anti-references (SaaS template, legacy ERP, AI slop), design principles, WCAG 2.1 AA target.
- **[DESIGN.md](./DESIGN.md)** — Visual system (tokens, shell, components). Shell redesign with OKLCH/hex values; legacy admin county pages flagged for migration.

Before UI work, run:

```bash
node .claude/skills/impeccable/scripts/context.mjs
```

Impeccable commands: `/impeccable critique`, `/impeccable craft`, `/impeccable polish`, `/impeccable live`, etc.

Live mode is pre-configured at `.impeccable/live/config.json` (Next.js App Router → `app/layout.tsx`).
