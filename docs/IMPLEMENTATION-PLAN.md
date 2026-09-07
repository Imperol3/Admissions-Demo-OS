# Implementation Plan

## Goal

Build the smallest system that lets us create, test, rehearse and run institution demos without changing product code.

The build order should optimize for **working intelligence first**, not polished presentation.

---

# Phase 0 — Foundation

## Objective

Create the minimum data and workflow foundation required for tenant-aware demos.

## Build

- Supabase project/schema
- enable pgvector
- create tenant table
- create source/version tables
- create structured admissions tables
- create knowledge chunks table
- create demo messages/runs tables
- create indexes
- create tenant-scoped retrieval functions/queries
- establish environment variables and n8n credentials

## Acceptance criteria

- [ ] Two tenants can exist in the same database
- [ ] Programme records are tenant-scoped
- [ ] Vector retrieval is tenant-scoped
- [ ] A query for tenant A cannot return tenant B data
- [ ] Demo runs can be persisted

---

# Phase 1 — Institution Onboarding

## Objective

Turn a website into a usable demo knowledge base.

## Build

### `DEMO — Create Institution`

- create tenant
- discover site pages
- prioritize admissions-relevant URLs
- scrape pages
- classify page types
- extract structured fields
- persist page versions
- normalize programme data
- normalize fees
- normalize intakes
- normalize requirements
- create chunks
- create embeddings
- validate coverage
- mark tenant ready

## Important design decision

Do not require the full website to be perfect before creating a demo.

A tenant may be `ready_with_warnings` if the system has enough high-value admissions data to demonstrate the core flow.

## Acceptance criteria

- [ ] A new institution can be created from name + website
- [ ] No code changes are required per institution
- [ ] Source pages are stored
- [ ] Extracted records retain source provenance
- [ ] Chunks are embedded
- [ ] A readiness summary is returned
- [ ] Failed stages are visible rather than hidden

---

# Phase 2 — Retrieval Tool

## Objective

Build one reliable retrieval interface for the Admissions Brain.

## Build

### Exact lookup

Support deterministic lookup for at least:

- programme
- fee
- intake
- duration
- study mode
- requirements
- application URL

### Semantic retrieval

- embed query
- tenant-scoped vector search
- return scores and source metadata

### Hybrid orchestration

- interpret request
- determine exact fields required
- run exact lookup
- supplement with semantic search
- combine/de-duplicate
- assess evidence sufficiency

## Acceptance criteria

- [ ] Exact known facts are returned from structured data
- [ ] Semantic queries return tenant-scoped chunks
- [ ] Hybrid requests can use both paths
- [ ] Every selected evidence item has source provenance
- [ ] Weak/contradictory evidence can return `sufficient=false`

---

# Phase 3 — Admissions Brain

## Objective

Create the main decision-making workflow.

## Build

### `DEMO — Ask Admissions`

The brain should:

1. understand the user request,
2. identify intent/entities,
3. identify what facts are required,
4. call the Retrieval Tool,
5. assess whether evidence is sufficient,
6. generate a grounded response,
7. choose reply/review/escalate,
8. persist a complete trace.

## Initial intents

Start with a practical set instead of over-classifying:

```text
programme_information
programme_fee
programme_intake
programme_requirements
application_process
application_status
finance_account_issue
technical_issue
other_admissions
not_admissions
```

Compound questions can carry one primary intent plus `required_fields` rather than inventing dozens of labels.

## Acceptance criteria

- [ ] Common programme questions are answered correctly
- [ ] The response is grounded in retrieved evidence
- [ ] Unsupported facts are not invented
- [ ] Account-specific questions can escalate
- [ ] The trace stores interpretation, evidence, response and decision
- [ ] Prompt/model/workflow versions are stored

---

# Phase 4 — Email Simulator

## Objective

Demonstrate the operational pipeline without production email setup.

## Build

### `DEMO — Process Email`

- accept normalized email payload
- store inbound message
- classify
- retrieve
- generate response where allowed
- choose action
- show simulated send/review/escalate outcome

## Acceptance criteria

- [ ] We can paste an email into the system
- [ ] It follows the same core brain/retrieval path
- [ ] Admissions enquiries generate grounded drafts
- [ ] Non-admissions/unsupported issues route correctly
- [ ] No Gmail OAuth is required for the demo

---

# Phase 5 — Operator Console

## Objective

Build the minimum UI required to operate and inspect demos quickly.

## Required screens

### A. Tenant selector

- institution dropdown
- status
- onboarding summary
- create new demo

### B. Ask Admissions

- question input
- Run button
- answer
- confidence
- decision

### C. Email Simulator

- from
- subject
- body
- Process button
- classification
- draft
- action

### D. Retrieval Inspector

- interpreted intent/entities
- exact results
- semantic results + scores
- selected evidence
- sources

### E. Execution Trace

- input
- workflow version
- prompt version
- models
- timestamps
- errors

### F. Demo controls

- re-run
- regenerate response
- reset test state
- clone tenant

## Explicit UX rule

Do not polish this into a customer product yet. It is an internal testing and demo surface.

## Acceptance criteria

- [ ] The full demo can be run from one console
- [ ] No database UI or n8n editor is required during a prospect demo
- [ ] Retrieval evidence can be inspected visually
- [ ] A failed run can be diagnosed from the console
- [ ] A run can be repeated quickly

---

# Phase 6 — Reset, Clone and Rehearsal

## Objective

Make demos reusable and safe to rehearse.

## Build

- reset transient messages/runs/evaluations
- preserve institution knowledge
- clone institution knowledge/config
- maintain clean demo versions

## Acceptance criteria

- [ ] We can rehearse a demo repeatedly
- [ ] Reset does not require re-scraping
- [ ] Clone produces an independent demo tenant
- [ ] Test history does not contaminate a fresh demo session

---

# Phase 7 — Regression Test Pack

## Objective

Prevent prompt/retrieval changes from breaking demos.

Create a reusable scenario pack for each tenant.

Example categories:

- direct programme fact
- fee
- intake
- requirement
- multi-part question
- ambiguous wording
- unsupported fact
- account-specific question
- non-admissions email
- escalation

Each test should record:

- input
- expected intent
- expected decision
- required facts
- expected source(s) where practical
- grounded/not grounded

## Acceptance criteria

- [ ] A workflow/prompt change can be tested against a stable scenario set
- [ ] Regressions are visible before a sales demo
- [ ] We can compare runs across prompt/workflow versions

---

# Recommended build order

Do not start with the UI.

Build in this order:

```text
1. Database foundation
2. Create Institution
3. Retrieval Tool
4. Ask Admissions
5. Inspect Retrieval
6. Process Email
7. Reset / Clone
8. Minimal Console
9. Regression pack
```

This gives us useful testing capability as early as possible.

---

# First demo milestone

The first meaningful milestone is reached when we can do this from n8n alone:

```text
Create tenant from website
        ↓
Ask 10 admissions questions
        ↓
Inspect exact + semantic evidence
        ↓
Process 5 simulated emails
        ↓
Show correct reply/review/escalate decisions
        ↓
Reset and repeat
```

At that point the demo engine is already valuable even before the operator console exists.

---

# What not to build yet

Avoid introducing these into the critical path:

- authentication redesign
- enterprise permissions
- live Gmail integration
- full CRM integration
- queue architecture
- notification system
- full analytics suite
- customer settings UI
- enterprise dashboard
- mobile responsiveness
- production deployment hardening

If a feature does not make the demo intelligence faster to build, easier to test, or clearer to prove, it should not block this repository's MVP.

---

# Final MVP definition

Admissions Demo OS MVP is complete when:

> We can create a new institution demo from its website, test the core Admissions AI against real institution knowledge, inspect every retrieval and decision, simulate inbound enquiries, and repeat the demo without changing code or rebuilding the product application.
