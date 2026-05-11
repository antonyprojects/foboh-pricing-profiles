# backend

Express + ESM API for the FOBOH pricing profile builder. In-memory store,
hand-authored OpenAPI spec served at `/docs`, Zod for runtime validation.

## Quick start

```bash
cp .env.example .env
npm install
npm run dev          # http://localhost:4000
```

Then open:

- Health      → http://localhost:4000/api/health
- Swagger UI  → http://localhost:4000/docs
- OpenAPI doc → http://localhost:4000/openapi.json

## Layout

```
src/
├── app.js                # express app factory (testable)
├── server.js             # binds port, signal handling
├── config/
│   ├── env.js            # parsed env vars
│   ├── logger.js         # winston + morgan stream
│   └── swagger.js        # hand-authored OpenAPI 3.0 spec
├── middleware/
│   ├── errorHandler.js   # HttpError, ZodError, 404
│   └── validate.js       # zod schema → req.{body,query,params}
└── routes/
    └── health.js
```

More routers (`products`, `customers`, `profiles`, `pricing`) land in
subsequent feature branches.
