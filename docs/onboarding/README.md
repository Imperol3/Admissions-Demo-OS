# Admissions OS Onboarding Contract

This directory is the authoritative human-readable contract for converting institution source content into trusted Admissions OS knowledge.

The onboarding pipeline is:

```text
Source content
  -> source classification
  -> fact extraction
  -> extracted-facts staging
  -> entity resolution
  -> normalization / reconciliation
  -> canonical records
  -> completeness / readiness
  -> KB build
  -> retrieval validation
  -> human approval
```

## ID conventions

Three identifiers serve different purposes:

- `tenant_id` — runtime / Supabase isolation key. Every institution-scoped database query must enforce it.
- `institution_id` — stable canonical identity for the institution represented in the onboarding package.
- `onboarding_run_id` — identifies one onboarding or refresh run so extraction and QA can be traced.

Do not drop `tenant_id` from runtime persistence just because the human onboarding workbook uses `institution_id`.

## Documents

- [EXTRACTION-PIPELINE.md](EXTRACTION-PIPELINE.md) — stage-by-stage input, output and failure contracts.
- [EXTRACTED-FACTS.md](EXTRACTED-FACTS.md) — staging/audit layer between source content and canonical truth.
- [CANONICAL-DATA-MODEL.md](CANONICAL-DATA-MODEL.md) — canonical Admissions OS entities and relationships.
- [READINESS-RULES.md](READINESS-RULES.md) — gates required before an institution can be marked ready.

Machine-readable JSON Schemas live in [../../schemas/onboarding/](../../schemas/onboarding/README.md).

## Core rule

> Extraction records what a source says. Reconciliation decides what the system currently accepts as canonical truth.

An extractor must never silently overwrite a conflicting fact. Every answerable canonical fact must remain traceable to source evidence.
