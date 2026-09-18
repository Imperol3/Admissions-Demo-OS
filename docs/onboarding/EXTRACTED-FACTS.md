# Extracted Facts Staging Model

## Why this layer exists

Writing extractor output directly into `programmes`, fees, intakes or knowledge chunks destroys important information:

- which source supplied a value
- what the source literally said
- whether two sources disagreed
- how an entity was resolved
- why a canonical value was selected

`extracted_facts` is therefore the immutable observation layer for an onboarding run.

## Recommended record

```text
fact_id
tenant_id
institution_id
onboarding_run_id
source_id
temporary_entity_id
entity_type
field_name
raw_value
normalized_candidate
source_evidence
evidence_locator
extraction_confidence
canonical_entity_id
resolution_status
created_at
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

Recommended `resolution_status` values:

```text
unresolved
matched
new_entity
ambiguous
reconciled
conflicting
rejected
needs_review
```

## Current-state vs history

The demo repository currently favors current source-page state rather than long-term page-version history.

That does not mean extracted observations should be discarded during a single onboarding run. The staging facts are needed until reconciliation, QA and readiness are complete.

A future production model may preserve observations across refreshes for change tracking.

## Non-negotiable provenance rule

A canonical answerable fact should be able to name the extracted fact(s) and source(s) that support it.
