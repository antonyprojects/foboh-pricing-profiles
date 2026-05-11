# FOBOH Pricing Profiles

Customer-specific pricing for food & beverage suppliers — a React frontend
talking to a Node/Express backend with an in-memory store, an OpenAPI
surface at `/docs`, and a resolver that picks the winning profile for
any (customer, product) pair.

Submission for the FOBOH Fullstack [Pricing] challenge.

---

## TL;DR — what got built

- **Backend** (`backend/`) — Express + ESM, in-memory store with indexed
  profile lookup, Zod validation, Winston logging, hand-authored OpenAPI 3.0
  spec served at `/docs`. Endpoints for product search, customers,
  pricing-profile CRUD, live preview, and the precedence resolver.
- **Frontend** (`frontend/`) — Vite + React + TS + Redux Toolkit. Product
  search with facets, profile builder with live preview, profile list,
  resolver demo page that explains *why* the winning profile won.
- **The interesting bit** — a precedence rule that's deliberate about
  commercial intent, not just "lowest price wins". See [§ Precedence rule](#precedence-rule)
  below.
- **Branch model** — `production` ← `uat` ← `dev` ← `feature/*`. Each
  feature branch is `--no-ff`-merged into `dev` so the history reads
  one logical change per merge bubble.

---

## Quick start

```bash
# in one shell
cd backend && cp .env.example .env && npm install && npm run dev
# → http://localhost:4000/docs

# in another shell
cd frontend && cp .env.example .env && npm install && npm run dev
# → http://localhost:5173
```

The frontend's Vite dev server proxies `/api`, `/openapi.json`, and `/docs`
through to the backend, so the browser sees a single origin.

The store boots with seed data, including the three scenario profiles
from the brief. Open the **Resolver** page in the frontend — it defaults
to Bondi Cellars on `KOYBRUNV6` and you'll see Profile C win at $95
with the rationale and full candidate list.

---

## Repo layout

```
.
├── backend/                 # Express ESM + Zod + Swagger
│   ├── src/
│   │   ├── app.js           # express app factory
│   │   ├── server.js        # binds the port
│   │   ├── config/          # env, logger, swagger spec
│   │   ├── middleware/      # error handler, validator
│   │   ├── routes/          # one router per resource
│   │   ├── services/        # productSearch, pricing, resolver
│   │   ├── schemas/         # Zod request schemas
│   │   ├── store/           # in-memory store + seed data
│   │   └── utils/           # money, ids
│   └── README.md
├── frontend/                # Vite + React + TS + Redux Toolkit
│   ├── src/
│   │   ├── api/             # typed fetch client + endpoints
│   │   ├── components/      # ProductTable, scope pickers, etc.
│   │   ├── redux/           # store + slices
│   │   ├── routes/          # one page per route
│   │   ├── types/           # wire types mirroring OpenAPI
│   │   ├── utils/           # formatters
│   │   └── styles/global.css
│   └── README.md
├── .github/workflows/       # CI: typecheck + tests on PRs to dev/uat/production
└── README.md
```

---

## Precedence rule

> **Most specific commercial intent wins.** Each candidate profile is
> scored as a tuple and compared lexicographically; the smallest tuple
> wins.

The tuple is:

```
(customerScore, productScore, priority, -updatedAt, profileId)
```

- **customerScore** — how specifically the profile targets the customer:
  - `customer` → **1**
  - `customer_group` → **2**
  - `all_customers` → **3**
- **productScore** — how specifically it targets the product:
  - `sku` → **1**
  - `brand` or `sub_category` → **2**
  - `segment` → **3**
  - `all_products` → **4**
- **priority** — manual override on the profile (defaults to `100`). Lower wins.
  This is the lever ops uses when business rules don't fit cleanly into the
  scope hierarchy.
- **updatedAt** — negated so the **most recently edited** profile wins ties.
  The most recent commercial decision is the most relevant one.
- **profileId** — deterministic final tiebreaker so two profiles updated in
  the same millisecond still resolve identically across calls.

### Why this shape, written for the next engineer

1. **A named-customer rule is a deliberate, individually negotiated price.**
   When a supplier writes "Bondi Cellars pays $95 for KOYBRUNV6", that's a
   handshake — not a side effect of group rules. Specificity guarantees it
   never gets out-voted by a broad group-level discount.
2. **Customer specificity dominates product specificity.** "A specific
   customer on a brand" beats "any customer in a group on this exact SKU".
   In B2B wholesale, a named relationship is a stronger commercial signal
   than a narrower product axis. If a supplier wants the SKU rule to win,
   they can either (a) tighten the customer scope or (b) set a lower
   `priority`.
3. **No "best price for customer" tiebreaker** — that would let cheap broad
   rules quietly out-vote deliberate ones. The supplier's *deliberateness*
   is what the rule honours.
4. **Newest wins on ties.** If you have to choose between two equally
   specific profiles, the one the supplier edited most recently is the most
   current statement of intent.
5. **Inactive profiles are ignored.** Deactivating a profile is a soft-delete:
   it preserves history but excludes the profile from resolution.

### Worked example (from the brief)

> Profile A: 10% off all Wine → Independent Retailers
> Profile B: $15 off all Sparkling → VIP
> Profile C: $95 flat on KOYBRUNV6 → Bondi Cellars
> Bondi Cellars is in both groups. They order KOYBRUNV6.

| Profile | customerScore | productScore | Tuple        |
|---------|---------------|--------------|--------------|
| C       | 1 (customer)  | 1 (sku)      | (1, 1, 100…) |
| A       | 2 (group)     | 2 (sub_cat)  | (2, 2, 100…) |
| B       | 2 (group)     | 3 (segment)  | (2, 3, 100…) |

**Profile C wins. Bondi pays $95.** The resolver returns the price, the
source profile id, a plain-English reason, and the full ordered list of
considered profiles. See it live at `/resolver` in the UI or:

```bash
curl 'http://localhost:4000/api/pricing/resolve?customerId=cust_bondi_cellars&sku=KOYBRUNV6'
```

---

## Adjustment kinds

The brief specifies `fixed ($)` and `dynamic (%)`. The worked scenario
adds "custom price of $95", which doesn't reduce cleanly to either
without making the supplier compute the delta from base price. To keep
the data model honest, profiles support three adjustment kinds:

| Kind       | Formula                          | Direction? |
|------------|----------------------------------|------------|
| `fixed`    | `New = Base ± value`             | required   |
| `dynamic`  | `New = Base ± (value% × Base)`   | required   |
| `absolute` | `New = value`                    | n/a        |

**Floor.** `New` is always clamped at 0, regardless of kind. This is enforced
in one place (`backend/src/utils/money.js`) so no caller has to remember.

**Rounding.** All money is rounded to cents at the calculator boundary. Money
is stored as `number` in major units for demo simplicity — production would
move to integer cents end-to-end (or a decimal library).

---

## "All Products" over time, deleted products

Two interpretations of an "All Products" rule, and which one this build picks:

- **Live (default).** Scope re-evaluates against the catalogue at resolve time,
  so new SKUs added later automatically inherit the pricing. Predictable enough
  for category-level rules.
- **Pinned.** When the supplier explicitly selects SKUs in the builder, those
  ride on the profile as `productScope.skus` and act as a hard intersect filter
  on top of `kind`. New products are *not* picked up; the supplier wanted that
  exact set.

The builder UI calls out which mode it's in so the choice is deliberate.

**Deleted products** — products carry an `active: boolean` flag. Inactive products
are excluded from search and from resolution. Historical profile references still
resolve to "no winning profile" rather than 500.

---

## Code structure & conventions

### Backend

- **Express app factory** in `src/app.js` lets tests mount the app without
  binding a port.
- **One router per resource** under `src/routes/` (mirrors the brief's reference
  pattern). Each router is thin: validate the request, call a service, return JSON.
- **Services hold the logic** — `productSearch.js`, `pricing.js`, `resolver.js` —
  so route handlers stay testable and the same calculator powers preview *and*
  resolve, no duplication.
- **Zod schemas in `src/schemas/`**. Discriminated unions for scopes mean the
  validation error pinpoints "missing `customerId` for kind=customer" rather
  than a generic union failure.
- **HttpError + ZodError-aware middleware.** Domain errors throw `HttpError`;
  validation errors return field-level details; everything else returns 500
  with the stack logged but never leaked.
- **In-memory store** with **secondary indices** keyed by customer scope, so
  the resolver pulls candidates in O(matching) instead of scanning every profile.
  See `backend/src/store/store.js`.

### Frontend

- **Typed fetch client** (`src/api/client.ts`) normalizes errors to `ApiError`,
  drops undefined query params, and is the only place that touches `fetch`.
- **Endpoints object** (`src/api/endpoints.ts`) — one object per resource,
  every method fully typed. Components import this, never raw fetch.
- **Redux slices with thunks**. Status fields are tracked per intent
  (list/save/etc.) so a failed save doesn't blank the list. The builder's WIP
  lives in Redux so route navigation doesn't lose work.
- **Discriminated unions in TS types** mirror the backend, so the scope pickers
  narrow correctly and TS catches "you forgot to set `customerId`" at compile
  time.

---

## Branch model

| Branch       | Role                                                          |
|--------------|---------------------------------------------------------------|
| `production` | Source of truth. Tagged releases come from here.              |
| `uat`        | Mirror of production. Final sign-off before promotion.        |
| `dev`        | Integration branch. Feature work merges here first.           |
| `feature/*`  | Child branches off `dev`. `--no-ff` merged into `dev`.        |

Promotion flow: `feature/* → dev → uat → production`. The history on every
parent branch reads one merge bubble per logical feature, so `git log
--graph` is the project changelog. CI runs typecheck + unit tests on PRs
into `dev`, `uat` and `production`.

---

## Trade-offs and what I'd do next

**What's in.** Working profile builder with live preview; CRUD persisted (in-memory);
a resolver whose precedence is documented, tested, and explainable end-to-end;
a Swagger surface; structured logging; Zod validation; unit tests on the pricing
calc, the store indices, and the resolver including the brief's worked
scenario; a UI that doesn't make the supplier guess what the rule will do.

**What's deliberately out.** Persistence (in-memory means a restart loses
non-seed data — that's the brief). Pagination UI controls (the API supports
limit/offset; the catalogue is tiny so no UI for it yet). Profile editing
(create + delete are wired; update reuses the same schema and the endpoint
exists, just no edit page yet). Auth (not in scope). Tests on the React
components (would add Playwright for the builder→preview→save loop next).

**Next 30 minutes I'd spend on this.** Three things:
1. **Profile detail page** with edit, plus a "show me which customers/products
   this profile currently applies to" panel — the precedence story is more
   useful when the supplier can see the blast radius before saving.
2. **Bulk resolver** — the current endpoint is `(customer, product) → price`,
   but in practice an order is `customer × cart`, so a `POST
   /api/pricing/resolve` taking an array would shave a lot of round trips.
3. **Property-based tests** on the resolver — random profile sets and
   `(customer, product)` queries to assert invariants like "specificity
   is monotonic", "the result is deterministic given identical inputs",
   "result.price ≥ 0".

---

## AI use

Drafted with Claude (in Cursor agent mode) directing the shape of the
codebase, the precedence rule, and the commit cadence. Pushbacks I owned:
keeping the resolver's tiebreakers commercially defensible rather than
"cheapest wins"; making `absolute` a first-class adjustment kind instead
of shoehorning it through `fixed`; building the store with secondary
indices upfront because the naive scan was going to be the first
production paper cut; and writing the OpenAPI spec by hand instead of
auto-generating it from code annotations.

Transcript: see `docs/ai-transcript.md` (or the chat export if attached
separately at submission).
