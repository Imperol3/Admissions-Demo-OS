# Admissions OS Demo UI

Client-facing/operator demo UI for Admissions OS.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS v4
- shadcn configuration using the Rhea style and Base UI ecosystem
- Supabase server-side data access
- Lucide icons

## Run locally

```bash
cd apps/web
cp .env.example .env.local
npm install
npm run dev
```

Set `SUPABASE_SECRET_KEY` in `.env.local`. It is server-only and must never use a `NEXT_PUBLIC_` prefix.

The app falls back to the current Strathmore sync totals if the secret is not configured, so visual work can continue without exposing privileged credentials.

## Current routes

- `/` — institution overview and sync/readiness state
- `/knowledge` — tenant-scoped published Sheet records
- `/ask` — admissions AI playground shell
- `/enquiries` — conversation workspace placeholder
- `/testing` — retrieval test workspace placeholder
- `/analytics` — analytics placeholder
- `/settings` — institution workspace metadata

The active institution is carried using the `institution` query parameter. Client accounts can later replace this selector with membership-driven tenant context.
