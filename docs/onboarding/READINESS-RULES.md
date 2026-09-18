# Onboarding Readiness Rules

## Principle

`ready` is a gated state, not a subjective judgement and not a simple completeness percentage.

An onboarding run must not become ready while a blocking condition remains unresolved.

## Programme-level gates

For every in-scope programme, evaluate at least:

```text
identity_complete
duration_complete
study_delivery_mode_complete
fee_complete
current_intake_complete
requirements_complete
application_process_complete
contact_or_location_complete
policy_or_faq_coverage
sources_verified
conflicts_resolved
kb_tests_passed
```

## Blocking rules

The following normally block publish/go-live:

- programme identity cannot be resolved
- no authoritative source supports an answerable fact
- required current fee is missing where the institution publishes/uses one
- intake/application status required for answering is stale or unresolved
- entry requirements are missing for a programme that requires them
- a blocking conflict remains unresolved
- a required fact is marked `needs_review` or `conflicting`
- KB publishing/chunking/embedding failed
- required retrieval tests failed
- unsupported/stale questions do not fall back to review/escalation
- required operational routing/integration tests failed
- human approval is missing

## Non-blocking / conditional cases

A field can be marked:

- `not_applicable` when it truly does not apply
- `not_published` only after targeted re-search confirms it is not published in available approved sources
- `missing` when research is incomplete
- `expired` when the fact is known but should not be used for current answers

`not_published` and `not_applicable` may be acceptable only when the response policy defines safe behavior.

## Second-pass gap search

Before declaring a required field `not_published`:

1. run first-pass extraction
2. calculate programme gaps
3. search the existing corpus specifically for the missing field
4. optionally discover approved additional sources
5. only then classify the field as not published / needs review

## Institution-level ready gate

An institution may be marked ready only when:

```text
all in-scope programmes pass blocking gates
AND no unresolved blocking conflicts exist
AND publish-ready knowledge has been embedded
AND required KB tests pass
AND routing/fallback behavior passes
AND human reviewer approves
```

A subset of programmes may be activated if the institution explicitly scopes go-live to those programmes.

## Readiness output

The machine contract returns:

- checks
- blocking gaps
- warning gaps
- unresolved conflicts
- test status
- `ready_for_publish`
- optional reviewer state

Schema: `../../schemas/onboarding/06-readiness.schema.json`.
