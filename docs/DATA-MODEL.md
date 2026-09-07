# Data Model

## Goal

Admissions Demo OS is intentionally optimized for speed of onboarding, testing and demos rather than production-grade historical data retention.

The demo database should support:

- multiple institutions
- current scraped pages
- extracted admissions data
- structured programme data
- exact/filtered retrieval
- semantic vector retrieval
- demo enquiries and AI execution traces
- later evaluation/regression testing

Supabase/PostgreSQL with pgvector is the expected store.

---

# Current architecture decision

For the demo, **we do not keep page versions**.

When a page is scraped again:

1. update the existing `source_pages` row
2. replace its current extracted data
3. rebuild any programme/fact records that depend on that page as needed
4. delete/rebuild that page's `knowledge_chunks`
5. generate embeddings for the new chunks

The demo only needs to represent the **current known institution state**.

Version history, diffing and rollback can be introduced later in the production architecture if they become necessary.

---

# Tables

The current schema has 7 core tables plus one optional evaluation table:

1. `demo_tenants`
2. `source_pages`
3. `programmes`
4. `programme_facts`
5. `knowledge_chunks`
6. `demo_messages`
7. `demo_runs`
8. `demo_evaluations` — optional/regression layer

## Relationship overview

```text
demo_tenants
│
├── source_pages
│     ├── programmes
│     │      └── programme_facts
│     └── knowledge_chunks
│
├── demo_messages
│
└── demo_runs
       └── demo_evaluations
```

Every institution-owned record must be scoped by `tenant_id`.

---

# 1. `demo_tenants`

One row represents one institution/demo workspace.

```sql
create table demo_tenants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  website text not null,
  status text not null default 'created',
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Onboarding statuses:

```text
created
onboarding
scraping
extracting
completed
failed
```

Onboarding V1 ends at `completed`, meaning the institution has been stored, pages have been scraped, and extracted admissions data has been stored.

Embeddings/RAG are handled in the next system stage rather than determining onboarding completion.

---

# 2. `source_pages`

One row represents the **current state** of one discovered/scraped URL.

```sql
create table source_pages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references demo_tenants(id) on delete cascade,
  url text not null,
  title text,
  page_type text,
  raw_content text,
  structured_data jsonb,
  parser_status text,
  parser_errors jsonb not null default '[]'::jsonb,
  content_hash text,
  scraped_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, url)
);
```

### Role

This table answers all of these at once:

- Which page did we find?
- What type of page is it?
- What was the latest scraped content?
- What admissions information did the extractor find?
- Did parsing succeed?
- When was the page last scraped?

### Recommended `page_type` values

```text
programme
programme_list
fees
admissions
requirements
intakes
application
faq
contact
scholarship
campus
accommodation
international_students
general
other
irrelevant
```

A page has one primary `page_type`; `structured_data.information_types_found` can describe the many information types found within it.

### Re-scrape behaviour

Use `(tenant_id, url)` as the upsert key.

```text
new URL     → INSERT
existing URL → UPDATE current row
```

There is deliberately no `source_page_versions` table in the demo architecture.

---

# 3. `programmes`

Canonical programme/course entities retained for exact lookup, entity resolution, validation and future UI use.

```sql
create table programmes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references demo_tenants(id) on delete cascade,
  source_page_id uuid references source_pages(id) on delete set null,
  name text not null,
  parent_programme text,
  programme_type text,
  qualification text,
  description text,
  duration_value numeric,
  duration_unit text,
  study_mode text,
  delivery_mode text,
  application_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

We are keeping this table for now even though programme information may also exist in `knowledge_chunks`. We will revisit that duplication after real demo usage.

---

# 4. `programme_facts`

Flexible structured facts related to programmes, avoiding separate tables for fees, intakes, requirements, scholarships, etc.

```sql
create table programme_facts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references demo_tenants(id) on delete cascade,
  programme_id uuid references programmes(id) on delete cascade,
  source_page_id uuid references source_pages(id) on delete set null,
  fact_type text not null,
  fact_key text not null,
  value_text text,
  value_number numeric,
  value_date date,
  currency text,
  unit text,
  metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Examples:

```text
fee        → tuition       → 120000 KES
intake     → start_date    → 2026-09-21
requirement→ academic      → KCSE mean grade C+...
application→ deadline      → 2026-09-10
```

---

# 5. `knowledge_chunks`

Primary grounded evidence/retrieval layer for Step 2.

```sql
create table knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references demo_tenants(id) on delete cascade,
  page_id uuid references source_pages(id) on delete cascade,
  programme_id uuid references programmes(id) on delete set null,
  category text,
  entity_type text,
  entity_name text,
  fact_type text,
  fact_key text,
  content text not null,
  structured_value jsonb,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(1536),
  created_at timestamptz not null default now()
);
```

When a source page changes, the demo should replace the chunks belonging to that page rather than preserve old embeddings:

```text
UPDATE source_pages
      ↓
DELETE knowledge_chunks WHERE page_id = ...
      ↓
create current chunks
      ↓
embed current chunks
```

`knowledge_chunks` remains the primary answer evidence layer. `programmes` and `programme_facts` are supporting structured representations for exact lookup, debugging and validation.

---

# 6. `demo_messages`

Stores inbound enquiries used in demos regardless of channel.

```sql
create table demo_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references demo_tenants(id) on delete cascade,
  external_message_id text,
  thread_id text,
  sender text,
  recipient text,
  subject text,
  body text not null,
  channel text not null default 'email',
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
```

---

# 7. `demo_runs`

Stores the inspectable execution trace of an admissions/retrieval run.

```sql
create table demo_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references demo_tenants(id) on delete cascade,
  message_id uuid references demo_messages(id) on delete set null,
  run_type text not null,
  input jsonb not null,
  interpretation jsonb,
  classification jsonb,
  retrieval_plan jsonb,
  exact_results jsonb,
  semantic_results jsonb,
  selected_evidence jsonb,
  generated_response text,
  decision text,
  confidence numeric,
  rationale text,
  sources jsonb,
  prompt_version text,
  workflow_version text,
  model_info jsonb,
  status text not null default 'started',
  error jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);
```

---

# 8. `demo_evaluations`

Optional regression/testing layer used after the first end-to-end demo is working.

It records expected intent/decision/facts and whether classification, retrieval, grounding, routing and the final answer were correct.

---

# Onboarding V1 write flow

Onboarding now ends here:

```text
1. Get institution
      ↓
2. Store demo_tenant
      ↓
3. Discover + scrape relevant pages
      ↓
4. Extract information from each page
      ↓
5. UPSERT source_pages with raw_content + structured_data
      ↓
6. Populate/update programmes + programme_facts
      ↓
ONBOARDING COMPLETED
```

At the end of onboarding we have:

- institution
- scraped pages
- page classifications
- full structured extraction output
- programmes
- fees
- intakes
- requirements
- application information
- contacts/other extracted admissions information

Chunking, embeddings, RAG and response generation are Step 2.

---

# Current-state principle

For this demo repository:

> We care about the best current data, not historical page snapshots.

If a page changes, update it and rebuild the downstream retrieval data. Do not add version-management complexity until a production requirement proves it is needed.
