# Tide Theme — Chunk 3: Summary, Chat, Import, Settings + Polish

**Date:** 2026-05-25  
**Branch:** feature/tide-pages  
**Roadmap item:** Phase 5 — Polish (design handoff: Tide / Editorial theme, Chunk 3 of 3)

## Goal

Apply Tide typography and colour tokens to the four remaining pages (Summary, Chat, Import, Settings) and do a light polish pass. Land a shippable PR.

## Approach

Pragmatic pass — get every page onto the same Tide baseline (font-display H1s, mono numbers, semantic colours, label-caps headers). Not chasing pixel-perfect against the prototype; iterate after merge.

## Steps

### Summary

- [ ] `page.tsx`: H1 → `font-display text-display-summary-h1 font-medium`, subtitle `text-body-sm`
- [ ] `SummaryDisplay.tsx`: headline card → editorial hero (large Fraunces text, subtle bg); section CardTitles → `font-display text-display-card-title font-semibold font-sans`; metrics → `font-display text-display-metric tabular-nums`; `text-red-600` → `text-destructive`

### Chat

- [ ] `ChatPanel.tsx`: H1 → `font-display text-display-h1 font-medium`
- [ ] `Thread.tsx`: empty state heading → `font-display text-display-hero-sm font-medium`; message text → `text-body-sm`; composer ring → `focus-within:ring-2 focus-within:ring-primary/16 focus-within:border-primary`

### Import

- [ ] `page.tsx`: H1 → `font-display text-display-h1 font-medium`
- [ ] `ImportForm.tsx`: success panel → `bg-success/10 border-success/20 text-foreground`; fix stale `/accounts` link → `/settings?tab=accounts`

### Settings

- [ ] `page.tsx`: H1 → `font-display text-display-h1 font-medium`, subtitle `text-body-sm`

### Polish

- [ ] `OverBudgetCards.tsx`: category name → `text-display-card-title font-medium`; amounts → `font-mono text-body-sm tabular-nums`; "over" amount → `text-destructive`

## Manual test steps

- [ ] Summary H1 in Fraunces; headline card reads with editorial weight; metrics use Fraunces metric size
- [ ] Chat H1 in Fraunces; empty state centered with serif subheading; bubble text legible
- [ ] Import H1 in Fraunces; success toast is sage green (not hardcoded green-50)
- [ ] Settings H1 in Fraunces; tabs still work with URL state
- [ ] Over-budget alert cards use mono amounts

## Out of scope

- Prompt chips in chat (no design spec for exact treatment)
- Sidebar collapse
- Additional skeleton updates beyond what's already in place

---

## What actually happened

(fill in post-session)

## Files created / modified

## Deferred to next session

## Status

- [ ] In progress
- [ ] Complete
- [ ] Partial — see deferred
