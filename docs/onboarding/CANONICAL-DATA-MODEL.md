# Canonical Admissions Data Model

## Purpose

The canonical model is the standardized institution representation produced after extraction, entity resolution and reconciliation.

Source websites may use different terminology. Admissions OS should not.

## Entity graph

```text
Institution
  |
  +-- Programmes
  |     +-- Fees
  |     +-- Intakes
  |     +-- Requirements
  |     +-- Application Process
  |     +-- Scholarships
  |
  +-- FAQs & Policies
  +-- Contacts & Locations
  +-- Source Pages

All canonical facts
  -> source provenance
  -> extracted observations
```

## Canonical datasets

### Institution

Identity and operating defaults: name, aliases, domain, country, timezone, currency, institutional type, accreditation/regulator references, admissions contact and application URL.

### Programme

Canonical course/programme entity. Includes aliases, parent programme, type, qualification, awarding body, description, active status, duration, study/delivery mode, campus/location and application URL.

### Fee

A priced fact linked to programme and optionally intake. Fees must preserve type, amount, currency, billing basis, mandatory state, payment-plan information, academic year and validity dates.

### Intake

A programme cohort/intake with application dates, start/end dates, status, availability, location and study/delivery mode.

### Requirement

A programme/intake admission requirement. Requirements should distinguish type, requirement level, applicability, minimum values and accepted alternatives.

### Application Process

Ordered application steps with instructions, required documents, URLs, application fees and responsible contacts where applicable.

### FAQ / Policy

Approved institutional answer/rule with category, scope, response action and validity.

### Contact / Location

Structured contact or physical/virtual location records.

### Scholarship

Scholarship/bursary information with programme scope, eligibility, benefit, application dates/process and current status.

## Record envelope

Where applicable canonical records include:

```text
tenant_id                 runtime DB scope
institution_id            canonical institution
onboarding_run_id         originating onboarding/refresh
source_id                 primary supporting source
source_evidence           evidence span/locator
valid_from / valid_to     business validity
is_current                current-state flag
data_status               knowledge state
review_status             human/QA state
approved_by / approved_at approval metadata
```

## Data status

Use an explicit knowledge state:

```text
confirmed
missing
not_published
not_applicable
conflicting
needs_review
expired
```

A blank value is not a valid substitute for one of these states when the field is part of readiness evaluation.

## Runtime storage mapping

The existing demo database currently uses `programmes` plus flexible `programme_facts`.

That can remain an implementation detail.

The canonical contract is richer than any one physical table layout. A canonical `Fee` may be persisted as a typed `programme_facts` record in the demo runtime, while the onboarding workbook and machine contract still treat it as a Fee entity.

This separation lets the contract remain stable while storage evolves.

## Machine-readable schemas

See [../../schemas/onboarding/README.md](../../schemas/onboarding/README.md).
