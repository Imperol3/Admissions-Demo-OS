# Onboarding Extraction Pipeline

## Purpose

Define exact contracts between the stages that transform already-collected institution website/document content into canonical Admissions OS data.

The pipeline assumes source content is available. Discovery/crawling can happen before this contract.

## Stage 0 — Common envelope

Every stage should carry:

```json
{
  "tenant_id": "uuid",
  "institution_id": "INST-001",
  "onboarding_run_id": "RUN-001"
}
```

`tenant_id` is mandatory for runtime persistence and retrieval isolation.

---

## Stage 1 — Source classification

### Input

One source item with URL/title/content and crawl metadata.

### Output

Stage 1 is deliberately narrow. Return only:

```json
{
  "page_type": "programme_listing",
  "relevance": "relevant",
  "relevance_level": "high",
  "next_action": "process",
  "reason": "Lists academic programmes offered by the institution."
}
```

Allowed relevance values:

```text
relevant
irrelevant
needs_review
```

Allowed next actions:

```text
process
skip
review
```

Routing rule:

```text
relevant      -> process
irrelevant    -> skip
needs_review  -> review
```

### Rule

Classification decides what the page is and whether it should continue. It must not extract detailed admissions facts or create canonical records.

Schema: `01-source-classification.schema.json`.

---

## Stage 2 — Fact extraction

### Input

A classified source plus its current raw/clean content.

### Output

Two collections:

1. candidate entities found in the source
2. atomic fact observations attached to those candidate entities

Example observation:

```json
{
  "fact_id": "FACT-001",
  "temporary_entity_id": "TMP-PROGRAMME-01",
  "entity_type": "programme",
  "field_name": "duration",
  "raw_value": "24 Weeks",
  "normalized_candidate": {
    "value": 24,
    "unit": "weeks"
  },
  "source_evidence": "Course Duration: 24 Weeks",
  "confidence": 0.99
}
```

### Rules

- Extract only evidence present in the source.
- Do not infer missing institution facts.
- Preserve the raw value.
- Preserve a short evidence span or locator.
- A page may produce facts for several entities and categories.
- Extraction confidence is not canonical truth confidence.

Schema: `02-fact-extraction.schema.json`.

---

## Stage 2A — Staging / persist extracted facts

Every atomic observation is written to the onboarding `Staging` layer as part of the same run before it can update a canonical table.

This layer is required for auditability:

```text
canonical record
  -> accepted Staging observation(s)
  -> source page
  -> source evidence
```

For the Google Sheet onboarding workflow, use the `Staging` tab. Runtime/database implementations may persist the same contract in `extracted_facts`.

Compare observations for the same logical entity + field:

```text
unique     = no previous observation
match      = same normalized value
conflict   = different normalized value
not_checked
```

Resolution statuses used by the Sheet workflow:

```text
unresolved
accepted
rejected
needs_review
```

Only `accepted` observations may promote to canonical tables. Conflicts must be retained and routed to `Conflicts & Review`; do not silently choose a winner.

The detailed persistence contract is in [EXTRACTED-FACTS.md](EXTRACTED-FACTS.md).

Schema: `02a-extracted-fact.schema.json`.

---

## Stage 3 — Entity matching and conflict detection

### Input

A candidate entity plus relevant existing canonical entities for the same tenant.

### Output

At minimum, determine whether the observation belongs to an existing logical entity and whether the same entity + field already has another observation.

Outputs may include:

```text
matched
new_entity
ambiguous
needs_review
```

A matched entity returns its canonical entity ID and any newly observed aliases.

### Rules

- Resolve within `tenant_id` only.
- Do not merge solely because names are similar.
- Use programme type, parent programme, qualification, location, delivery mode and source context when available.
- Ambiguous matches go to review; they are not auto-merged.

Schema: `03-entity-resolution.schema.json`.

---

## Stage 4 — Normalization and reconciliation

### Input

All observations for a canonical entity/field plus source metadata.

### Output

A canonical candidate value and resolution status.

Statuses:

```text
resolved
conflicting
needs_review
rejected
not_published
not_applicable
expired
```

### Reconciliation order

1. Check whether observations refer to the same programme/intake/scope.
2. Normalize units, currency, dates, modes and aliases.
3. Prefer current, scope-correct observations.
4. Consider source authority.
5. Preserve all supporting fact IDs.
6. If evidence still disagrees, create a conflict instead of choosing silently.

Schema: `04-reconciliation.schema.json`.

---

## Stage 5 — Canonical record writer

Only accepted/resolved Staging observations enter canonical entities.

Canonical datasets:

```text
Institution
Programmes
Fees
Intakes
Requirements
Application Process
FAQs & Policies
Contacts & Locations
Scholarships
```

Every answerable record should carry source provenance and review/current-state metadata.

Machine schemas are prefixed `05-`.

### Important

The canonical writer must be idempotent for the same resolved entity/fact set. Re-running the same onboarding content must not create duplicate active entities.

---

## Stage 6 — Completeness and readiness

### Input

All canonical records and unresolved conflicts for the institution/programme.

### Output

- per-programme completeness checks
- blocking gaps
- source-verification state
- conflict state
- KB-test state
- `ready_for_publish`

A percentage alone is never sufficient. Missing fees or requirements can be blocking even if most other fields exist.

Schema: `06-readiness.schema.json`.

---

## Failure contract

Every stage returns a machine-readable status:

```text
success
partial
failed
needs_review
```

When partial/failed:

- preserve successful observations
- return structured warnings/errors
- record the failed stage
- do not silently promote the onboarding run
- never mark an institution ready because later steps happened to succeed

## Persistence boundary

Recommended persistence:

```text
source_pages             current source content + classification
extracted_facts          every atomic extracted observation
canonical entities       reconciled current institutional truth
conflicts                unresolved disagreements / decisions
knowledge_chunks         approved answer evidence
onboarding_runs          stage-level trace and readiness
```
