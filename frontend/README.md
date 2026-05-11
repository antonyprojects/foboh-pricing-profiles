# frontend

Vite + React + TypeScript + Redux Toolkit. Talks to the backend over
`/api/*`; Vite's dev server proxies those calls to `VITE_API_URL` so
the browser always sees a single origin.

## Quick start

```bash
cp .env.example .env       # optional, default works for local
npm install
npm run dev                # http://localhost:5173
```

Make sure the backend is running first (`cd ../backend && npm run dev`).

## Layout

```
src/
├── main.tsx              # mounts the app
├── App.tsx               # sidebar + routes
├── api/                  # typed API client (next branch)
├── redux/                # store + slices
├── routes/               # one page per route
├── components/           # shared UI primitives
├── types/                # shared TS types (mirrors backend OpenAPI)
└── styles/global.css
```
