# Data Model

## Goal

The demo database should stay small enough to understand and change quickly while still supporting:

- multiple institutions
- source/version traceability
- structured programme data
- deterministic/exact retrieval
- semantic vector retrieval
- demo messages
- complete AI run traces
- reset/replay
- later regression evaluation

Supabase/PostgreSQL with pgvector is the expected store.

---

# Current decision

For the first demo build we will use **8 core tables** and add a ninth evaluation table when regression testing begins:

1. `demo_tenants`
2. `source_pages`
3. `source_page_versions`
4. `programmes`
5. `programme_facts`
6. `knowledge_chunks`
7. `demo_messages`
8. `demo_runs`
9. `demo_evaluations` — optional initially

## Important architecture note: `programmes` and `programme_facts`

There is intentional overlap between the structured programme tables and `knowledge_chunks`.

For now, we are **keeping `programmes` and `programme_facts`** while we validate the retrieval architecture in real demos.

Their roles are different:

- `programmes` is the canonical structured programme/entity directory.
- `programme_facts` stores deterministic structured facts linked to a programme, such as fees, intakes, requirements and deadlines.
- `knowledge_chunks` is the main RAG/retrieval evidence layer used to generate grounded answers and can also support filtered exact lookup.

The current runtime may obtain most response evidence from `knowledge_chunks`. The structured programme tables are retained because they can make exact entity resolution, structured lookup, debugging, validation and future UI/reporting much easier.

We will revisit whether all three representations are needed after the first demo workflows are proven. **Do not remove `programmes` or `programme_facts` yet.**

The design principle is:

> Keep the structured representation and the retrieval representation separate until real demo behaviour proves that one is redundant.

---

# Relationship overview

```text
demo_tenants
│
├── source_pages
│     └── source_page_versions
│              │
│              ├── programmes
│              │      └── programme_facts
│              │
│              └── knowledge_chunks
│
├── demo_messages
│
└── demo_runs
       └── demo_evaluations
```

Every institution-owned row must be scoped by `tenant_id`.

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

Example `config`:

```json
{
  "institution_type": "university",
  "default_currency": "KES",
  "country": "Kenya",
  "reply_mode": "draft_only"
}
```

---

# 2. `source_pages`

One row represents one canonical source URL discovered for an institution.

```sql
create table source_pages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references demo_tenants(id) on delete cascade,
  url text not null,
  title text,
  page_type text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, url)
);
```

Suggested `page_type` values:

```text
programme
fees
admissions
requirements
intakes
application
faq
contact
general
other
```

This table answers: **which source page did this knowledge come from?**

---

# 3. `source_page_versions`

Every successful collection/extraction creates a version rather than overwriting the previous source state.

```sql
create table source_page_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references demo_tenants(id) on delete cascade,
  page_id uuid not null references source_pages(id) on delete cascade,
  content_hash text,
  raw_content text,
  structured_data jsonb,
  parser_status text,
  parser_errors jsonb,
  collected_at timestamptz not null default now(),
  is_current boolean not null default true
);
```

`structured_data` stores the complete extraction result before it is normalized into retrieval/structured records.

This preserves the provenance chain:

```text
website page
   ↓
source_pages
   ↓
source_page_versions
   ↓
structured extraction
   ↓
programmes / programme_facts / knowledge_chunks
```

---

# 4. `programmes`

One row represents a canonical programme/course entity for the institution.

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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Recommended index:

```sql
create index programmes_tenant_name_idx
on programmes (tenant_id, lower(name));
```

### Why keep it if chunks already contain programme data?

For now this table gives us a clean canonical identity for programme names and common fields. It can support:

- exact programme/entity resolution
- aliases and programme matching later
- fast programme lists
- validation against extraction output
- debugging
- future operator UI tables
- future reporting

It is **not required to be the primary answer-generation source**. The Admissions Brain may still use `knowledge_chunks` as its evidence source.

---

# 5. `programme_facts`

This replaces separate MVP tables for programme fees, programme intakes and programme requirements.

It gives us one flexible structured-fact table without creating a new table for every admissions concept.

```sql
create table programme_facts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references demo_tenants(id) on delete cascade,
  programme_id uuid references programmes(id) on delete cascade,
  source_version_id uuid references source_page_versions(id),

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

Recommended indexes:

```sql
create index programme_facts_lookup_idx
on programme_facts (tenant_id, programme_id, fact_type, fact_key);

create index programme_facts_type_idx
on programme_facts (tenant_id, fact_type, fact_key);
```

Examples:

### Tuition fee

```text
fact_type: fee
fact_key: tuition
value_number: 120000
currency: KES
metadata: {"frequency":"per semester"}
```

### Intake

```text
fact_type: intake
fact_key: start_date
value_date: 2026-09-21
metadata: {
  "intake_name":"September 2026",
  "application_deadline":"2026-09-10",
  "status":"open"
}
```

### Academic requirement

```text
fact_type: requirement
fact_key: academic
value_text: KCSE mean grade C or equivalent
```

### Document requirement

```text
fact_type: requirement
fact_key: document
value_text: Copy of national ID or passport
```

Suggested `fact_type` values:

```text
fee
intake
requirement
application
scholarship
discount
location
contact
other
```

The goal is flexibility. We should **not** create individual tables for every admissions field during the demo phase.

### Why keep it if chunks already contain these facts?

For now it gives us deterministic structured data for:

- exact fee/date/deadline lookup
- validation of RAG answers
- comparing extracted facts across sources
- UI tables later
- debugging bad retrieval
- building regression tests with known facts

However, if real demo usage proves that well-structured `knowledge_chunks` can handle these jobs reliably with less complexity, this table can be reconsidered.

---

# 6. `knowledge_chunks`

This is the primary semantic knowledge and evidence layer.

Use the embedding dimension required by the selected embedding model. The current expected configuration uses 1536-dimensional embeddings.

```sql
create extension if not exists vector;

create table knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references demo_tenants(id) on delete cascade,
  page_id uuid references source_pages(id) on delete cascade,
  source_version_id uuid references source_page_versions(id) on delete cascade,
  programme_id uuid references programmes(id) on delete set null,

  category text not null,

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

A chunk should be more than just `content + embedding`. Where possible it should explain:

- what the chunk is about
- the entity it belongs to
- the fact/category it represents
- the structured value, when one exists
- the source proving it
- the semantic text used for retrieval

Example programme-fee chunk:

```json
{
  "category": "fees",
  "entity_type": "programme",
  "entity_name": "Software Engineering",
  "fact_type": "fee",
  "fact_key": "tuition",
  "structured_value": {
    "amount": 120000,
    "currency": "KES"
  },
  "metadata": {
    "source_url": "https://example.edu/software-engineering"
  }
}
```

## Retrieval modes from `knowledge_chunks`

The retrieval tool can use the same table in two ways.

### Deterministic/filter lookup

```sql
select *
from knowledge_chunks
where tenant_id = $1
  and lower(entity_name) = lower($2)
  and fact_type = $3;
```

### Semantic/vector lookup

The user query is embedded and compared against `embedding`, always scoped to the same `tenant_id`.

Conceptually:

```text
question
   ↓
query interpretation
   ↓
┌───────────────────────┐
│ Retrieval Tool        │
├───────────────────────┤
│ filtered/exact search │
│ vector search         │
└───────────┬───────────┘
            ↓
      selected evidence
            ↓
      Admissions Brain
```

For the demo architecture, `knowledge_chunks` should remain the **primary grounded evidence source for generated responses**.

---

# 7. `demo_messages`

Stores inbound/demo enquiries independent of the channel adapter.

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

Suggested `channel` values:

```text
email
webchat
whatsapp
form
manual_test
```

Different demo inputs should converge into the same Admissions Brain rather than creating separate downstream logic.

---

# 8. `demo_runs`

Every AI execution should be inspectable and reproducible.

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

Suggested decisions:

```text
reply
review
escalate
ignore
```

This table powers the demo trace:

```text
student question
   ↓
interpretation
   ↓
classification
   ↓
retrieval plan
   ↓
exact + semantic results
   ↓
selected evidence
   ↓
response
   ↓
decision + confidence + rationale
```

---

# 9. `demo_evaluations` — optional initially

Add this when systematic regression testing begins.

```sql
create table demo_evaluations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references demo_tenants(id) on delete cascade,
  run_id uuid not null references demo_runs(id) on delete cascade,

  test_name text,

  expected_intent text,
  expected_decision text,
  expected_facts jsonb,

  classification_correct boolean,
  retrieval_correct boolean,
  grounded boolean,
  routing_correct boolean,
  answer_correct boolean,

  score numeric,
  reviewer_notes text,

  created_at timestamptz not null default now()
);
```

The evaluation layer will eventually let us regression-test prompt, retrieval, chunking and model changes against a stable question set.

---

# Tenant isolation

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

The same restriction applies to `programme_facts` and vector retrieval from `knowledge_chunks`.

---

# Data flow

The current intended write flow is:

```text
Website
  ↓
source_pages
  ↓
source_page_versions
  ↓
AI structured extraction
  ↓
  ├── programmes
  ├── programme_facts
  └── knowledge_chunks
```

The intended answer flow is:

```text
Student enquiry
  ↓
Admissions Brain
  ↓
Retrieval Tool
  ↓
knowledge_chunks
  + optional structured lookup
  ↓
selected evidence
  ↓
grounded answer / escalation
  ↓
demo_runs
```

`programmes` and `programme_facts` may assist exact lookup, entity resolution and validation, but they are not required to replace `knowledge_chunks` as the answer evidence layer.

---

# Reset strategy

`Reset Demo` should remove transient test state while preserving institution knowledge.

Reset:

- `demo_messages`
- `demo_runs`
- `demo_evaluations`

Preserve:

- `demo_tenants`
- `source_pages`
- `source_page_versions`
- `programmes`
- `programme_facts`
- `knowledge_chunks`

A separate destructive re-onboarding action may replace institution knowledge when required.

---

# Clone strategy

Cloning a demo tenant should duplicate:

- tenant config
- current source metadata/versions as needed
- `programmes`
- `programme_facts`
- `knowledge_chunks` and embeddings when appropriate

It should not duplicate:

- demo messages
- demo runs
- evaluations

This allows fast rehearsal and scenario testing.

---

# Decision to revisit later

After the first end-to-end demos are working, explicitly review whether `programmes` and/or `programme_facts` are providing enough value to justify their duplication with `knowledge_chunks`.

Questions for that review:

1. Does the Retrieval Tool actually use structured programme tables often?
2. Are exact lookups materially more accurate/faster because of them?
3. Do they make extraction validation easier?
4. Are they useful for operator/demo UI tables?
5. Does maintaining them introduce meaningful synchronization bugs?
6. Can `knowledge_chunks` alone provide equally reliable exact + semantic retrieval?

Until that review is complete, **retain both structured tables.**
