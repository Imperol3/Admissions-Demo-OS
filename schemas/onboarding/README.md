# Onboarding JSON Schemas

These schemas define the machine contracts for the Admissions OS onboarding extraction pipeline.

## Pipeline schemas

1. `00-common.schema.json` — shared IDs, status enums and provenance primitives.
2. `01-source-classification.schema.json` — source/page classification input and output.
3. `02-fact-extraction.schema.json` — structured extraction input and output.
4. `02a-extracted-fact.schema.json` — persisted atomic observation.
5. `03-entity-resolution.schema.json` — candidate-to-canonical entity resolution.
6. `04-reconciliation.schema.json` — normalization/conflict-resolution contract.
7. `05-*.schema.json` — canonical entity contracts.
8. `06-readiness.schema.json` — programme/institution readiness result.

## Conventions

- JSON Schema dialect: Draft 2020-12.
- `tenant_id` scopes runtime data.
- `institution_id` identifies the canonical institution.
- `onboarding_run_id` traces one onboarding/refresh.
- Extraction never silently promotes an unsupported fact.
- Canonical answerable facts preserve provenance.
- Unknown states are explicit; blank/null alone must not mean `missing`.

These files are contracts, not necessarily one-to-one physical Supabase tables.
