# FOBOH Pricing Profiles

Supplier-facing pricing profile builder for FOBOH (food & beverage wholesale).
React frontend talking to a Node.js (Express) backend with an in-memory store
and an OpenAPI / Swagger surface.

> This README will be fleshed out in the `feature/docs-ci` branch. Until then,
> see `backend/README.md` and `frontend/README.md` for setup snippets as they
> land.

## Repo layout (target)

```
.
├── backend/        # Express + ESM + in-memory store + Swagger
├── frontend/       # Vite + React + TS + Redux Toolkit
├── .github/        # CI workflows (lint, typecheck, test)
└── docs/           # Architecture notes, decision records
```

## Branch model

| Branch       | Role                                                            |
|--------------|-----------------------------------------------------------------|
| `production` | Source of truth. Tagged releases come from here.                |
| `uat`        | Mirror of production. Final sign-off before promotion.          |
| `dev`        | Integration branch. Feature work merges here first.             |
| `feature/*`  | Child branches off `dev`. Squash- or `--no-ff`-merged into dev. |

Promotion flow: `feature/* → dev → uat → production`.
