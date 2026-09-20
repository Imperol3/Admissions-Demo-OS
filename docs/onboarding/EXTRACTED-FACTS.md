# Extracted Facts Staging Model

## Why this layer exists

Writing extractor output directly into `programmes`, fees, intakes or knowledge chunks destroys important information:

- which source supplied a value
- what the source literally said
- whether two sources disagreed
- how an entity was resolved
- why a canonical value was selected

`Staging` is therefore the observation/audit layer for an onboarding run. In the Google Sheet workflow this is the `Staging` tab; in a database implementation the equivalent persistence table may be `extracted_facts`.

## Recommended record

```text
staging_id
onboarding_run_id
source_id
source_url
temporary_entity_id
entity_type
entity_name
field_name
raw_value
normalized_value
source_evidence
extraction_confidence
resolution_status
canonical_entity_id
canonical_table
conflict_status
extracted_at
reviewed_at
notes
```

## Suggested PostgreSQL shape

```sql
create table extracted_facts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references demo_tenants(id) on delete cascade,
  institution_id text not null,
  onboarding_run_id text not null,
  source_page_id uuid not null references source_pages(id) on delete cascade,
  temporary_entity_id text,
  entity_type text not null,
  field_name text not null,
  raw_value jsonb not null,
  normalized_candidate jsonb,
  source_evidence text not null,
  evidence_locator jsonb,
  extraction_confidence numeric,
  canonical_entity_type text,
  canonical_entity_id text,
  resolution_status text not null default 'unresolved',
  created_at timestamptz not null default now()
);
```

Google Sheet `resolution_status` values:

```text
unresolved
accepted
rejected
needs_review
```

`conflict_status` values:

```text
unique
match
conflict
not_checked
```

Rules:

- no existing observation for the same logical entity + field -> `unique`
- same normalized value -> `match`
- different normalized value -> `conflict` and `needs_review`
- only `accepted` observations may update canonical tables
- after promotion, record `canonical_entity_id` and `canonical_table`
- retain rejected/conflicting observations for audit instead of deleting them

## Current-state vs history

The demo repository currently favors current source-page state rather than long-term page-version history.

That does not mean extracted observations should be discarded during a single onboarding run. The staging facts are needed until reconciliation, QA and readiness are complete.

A future production model may preserve observations across refreshes for change tracking.

## Non-negotiable provenance rule

A canonical answerable fact should be able to name the extracted fact(s) and source(s) that support it.


## Main onboarding-run rule

Staging is not an optional post-processing report. It runs as part of the main onboarding flow:

```text
source classification
  -> relevant source
  -> fact extraction
  -> Staging
  -> match / conflict / review
  -> accepted observations
  -> canonical tables
  -> chunks
  -> embeddings
  -> retrieval tests
```

The research agent may perform broad research itself, but every fact that becomes canonical should remain auditable through Staging and its source evidence.
