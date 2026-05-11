# AI transcript

Drafted with Claude in Cursor (agent mode). The complete chat will be
attached to the submission separately. This file captures the parts I
chose to call out per the brief's "show how you direct AI" criterion.

## Direction I gave

- **Precedence rule first.** Before writing any code I made the AI argue
  for and against three precedence options: (a) lowest-price-wins,
  (b) most-recent-wins, (c) specificity-wins. I picked (c) on commercial
  grounds — a deliberately negotiated customer price should never be
  out-voted by a broad group rule — and wrote the rationale into the
  README in plain English before any resolver code went in.
- **Branch model.** I asked for `production / uat / dev / feature/*` with
  `--no-ff` merges into dev. Every feature was a child branch and got
  reviewed for atomicity before merging.
- **Repository shape from a real reference.** I provided the
  old fleet management project layout as a structural template and asked the AI to map
  it onto a web (not Expo) target, keeping the per-feature-router
  pattern, the slice/store split, and Winston/dotenv conventions.
- **Hand-authored OpenAPI.** I rejected auto-generating the spec from
  code annotations — the contract is the source of truth, not a
  byproduct.
- **In-memory store with secondary indices.** Rejected the naive
  `const profiles = []` and asked for `Map`s keyed by customer scope so
  the resolver does O(matching) candidate lookup rather than O(all).

## Things I pushed back on / rejected

- **"Cheapest profile wins" as a tiebreaker.** AI initially suggested
  this as a customer-friendly heuristic. Rejected — it silently inverts
  the supplier's intent. Tiebreakers are `priority` (manual) then
  `updatedAt` (most recent) then `id` (deterministic).
- **Making `absolute` a flavour of `fixed`.** AI's first cut tried to
  express the brief's "Custom price of $95" by computing the delta from
  base. That's brittle (base changes, profile silently drifts) and
  inverts the UX (supplier has to do arithmetic). Made it a first-class
  `kind: "absolute"` and noted it in the README.
- **Auto-emitted TS files.** First scaffold commit had `tsc -b` in the
  build script without an outDir, so it emitted `.js` next to every
  `.tsx`. Caught it on review, set `noEmit`, removed shadows in a fix
  commit instead of amending so the mistake is visible in history.
- **A "describe adjustment" formatter on both sides.** AI duplicated it
  in the frontend. Kept the duplicate because the *display strings* live
  in the UI (locale-aware currency), but the backend keeps its own
  short form for the `reason` text — they have different jobs.
- **A single mega-component for the builder.** AI proposed inlining
  scope pickers + adjustment + table into one file. Split into
  `CustomerScopePicker`, `ProductScopePicker`, `AdjustmentControls`,
  and the existing `ProductTable` so each piece is independently
  testable and the page stays readable.

## What I owned

- The commercial reasoning behind the precedence rule.
- The data structure choice (indexed store) and the resolver tuple
  shape.
- The branch / commit discipline.
- The decision to make `absolute` a real kind and to call it out in the
  README rather than smuggle it in.
- The trade-off note on "All Products" being live by default with
  optional SKU pinning, and the `active` flag on products as a soft
  delete signal for the resolver.
