# Admissions OS Demo UI

Client-facing/operator UI for Admissions OS.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS v4
- shadcn/Base UI component layer
- PostgreSQL via `pg`
- Lucide icons

The application has no Supabase SDK dependency. The current database may be hosted on Supabase, but the application connects using the standard PostgreSQL protocol.

## Run locally

```bash
cd apps/web
cp .env.example .env.local
npm install
npm run dev
```

Configure a PostgreSQL connection in `.env.local`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
DATABASE_SSL_MODE=require
DATABASE_POOL_MAX=5
```

`DATABASE_URL` is server-only. Never prefix it with `NEXT_PUBLIC_`.

For production, use a dedicated read-only/read-mostly application database role rather than an owner or superuser account.

## Current routes

- `/` — institution overview and sync/readiness state
- `/knowledge` — tenant-scoped published onboarding records
- `/ask` — admissions AI playground shell
- `/enquiries` — conversation workspace
- `/testing` — retrieval testing
- `/analytics` — analytics
- `/settings` — institution workspace metadata

The active institution is currently carried using the `institution` query parameter. Client accounts can later replace the selector with membership-driven tenant context.

## Portability

Only the PostgreSQL schema is assumed by the app. Moving the database later means changing `DATABASE_URL`, provided the destination contains the same migrations/schema.
