# Data Model

## Goal

The demo database should be small enough to understand quickly but strong enough to support:

- multiple institutions
- source/version traceability
- structured admissions facts
- vector retrieval
- demo messages
- complete AI run traces
- reset/replay

Supabase/PostgreSQL with pgvector is the expected store.

---

## 1. Tenant model

### `demo_tenants`

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

Suggested statuses:

```text
created
crawling
extracting
embedding
validating
ready
failed
```

`config` can hold demo-specific behaviour without schema churn, for example:

```json
{
  "institution_type": "university",
  "default_currency": "KES",
  "country": "Kenya",
  "reply_mode": "draft_only"
}
```

---

## 2. Source pages and versions

### `source_pages`

Represents a canonical institution page.

```sql
create table source_pages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references demo_tenants(id) on delete cascade,
  url text not null,
  title text,
  page_type text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, url)
);
```

### `source_page_versions`

Stores each collected version independently.

```sql
create table source_page_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references demo_tenants(id) on delete cascade,
  page_id uuid not null references source_pages(id) on delete cascade,
  content_hash text,
  raw_content text,
  structured_data jsonb,
  collected_at timestamptz not null default now(),
  is_current boolean not null default true
);
```

This preserves the provenance chain and allows data changes to be compared later.

---

## 3. Programmes

### `programmes`

```sql
create table programmes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references demo_tenants(id) on delete cascade,
  source_version_id uuid references source_page_versions(id),
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
  created_at timestamptz not null default now()
);
```

Recommended index:

```sql
create index programmes_tenant_name_idx
on programmes (tenant_id, lower(name));
```

---

## 4. Fees

### `programme_fees`

```sql
create table programme_fees (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references demo_tenants(id) on delete cascade,
  programme_id uuid references programmes(id) on delete cascade,
  source_version_id uuid references source_page_versions(id),
  fee_type text not null,
  amount numeric,
  currency text,
  frequency text,
  notes text,
  effective_from date,
  effective_to date,
  created_at timestamptz not null default now()
);
```

Example `fee_type` values:

```text
tuition
application
registration
exam
other
```

---

## 5. Intakes

### `programme_intakes`

```sql
create table programme_intakes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references demo_tenants(id) on delete cascade,
  programme_id uuid references programmes(id) on delete cascade,
  source_version_id uuid references source_page_versions(id),
  intake_name text,
  start_date date,
  application_deadline date,
  status text,
  notes text,
  created_at timestamptz not null default now()
);
```

---

## 6. Requirements

### `programme_requirements`

```sql
create table programme_requirements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references demo_tenants(id) on delete cascade,
  programme_id uuid references programmes(id) on delete cascade,
  source_version_id uuid references source_page_versions(id),
  requirement_type text not null,
  requirement_text text not null,
  created_at timestamptz not null default now()
);
```

Suggested types:

```text
academic
document
language
international_student
work_experience
age
other
```

---

## 7. Knowledge chunks

### `knowledge_chunks`

Use the embedding dimension required by the selected embedding model.

```sql
create table knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references demo_tenants(id) on delete cascade,
  page_id uuid references source_pages(id) on delete cascade,
  source_version_id uuid references source_page_versions(id) on delete cascade,
  category text,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(1536),
  created_at timestamptz not null default now()
);
```

The exact embedding dimension should remain aligned with the configured model. If the existing Admissions OS embedding model is reused, retain its current dimension rather than changing it casually.

Example metadata:

```json
{
  "programme_name": "Software Engineering",
  "field": "entry_requirements",
  "source_url": "https://example.edu/software-engineering"
}
```

---

## 8. Demo messages

### `demo_messages`

```sql
create table demo_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references demo_tenants(id) on delete cascade,
  external_message_id text,
  thread_id text,
  sender text,
  subject text,
  body text not null,
  message_type text not null default 'email',
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
```

---

## 9. Demo runs

### `demo_runs`

This is one of the most important tables because every test should be inspectable and reproducible.

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

Suggested `run_type` values:

```text
ask_admissions
process_email
inspect_retrieval
onboarding
validation
```

Suggested `decision` values:

```text
reply
review
escalate
ignore
```

---

## 10. Optional evaluation table

### `demo_evaluations`

Useful once we start systematic regression testing.

```sql
create table demo_evaluations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references demo_tenants(id) on delete cascade,
  run_id uuid not null references demo_runs(id) on delete cascade,
  expected_answer jsonb,
  grounded boolean,
  classification_correct boolean,
  routing_correct boolean,
  retrieval_correct boolean,
  reviewer_notes text,
  created_at timestamptz not null default now()
);
```

---

## 11. Tenant isolation

Every query must be tenant-scoped.

Bad:

```sql
select * from programmes
where lower(name) = lower($1);
```

Correct:

```sql
select * from programmes
where tenant_id = $1
  and lower(name) = lower($2);
```

The same restriction applies to vector search.

---

## 12. Reset strategy

`Reset Demo` should delete transient test state but preserve institution knowledge.

Reset:

- `demo_messages`
- `demo_runs`
- `demo_evaluations`

Preserve:

- `demo_tenants`
- `source_pages`
- `source_page_versions`
- `programmes`
- `programme_fees`
- `programme_intakes`
- `programme_requirements`
- `knowledge_chunks`

A separate destructive re-onboarding action may replace institution knowledge when required.

---

## 13. Clone strategy

Cloning a demo tenant should duplicate:

- tenant config
- structured admissions data
- current source metadata
- knowledge chunks/embeddings when appropriate

It should not duplicate:

- messages
- demo runs
- evaluations

This enables fast rehearsal and scenario testing.
