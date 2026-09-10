# Admissions Demo OS

A fast, configuration-driven demo runtime for proving the core intelligence and operational capabilities of the Admissions OS without waiting for the full production application, integrations, or polished UI.

## Why this repository exists

The production Admissions OS is becoming a real product: multi-tenant, integration-heavy, UI-heavy, and increasingly concerned with reliability, permissions, deployment, observability, and enterprise controls.

That is the correct direction for production, but it is the wrong development loop for a sales demo.

A prospect demo should not require:

- a new code branch
- application changes
- a new deployment
- Gmail OAuth setup
- CRM integration work
- polished UI changes
- production-grade queues or permissions

The central rule of this repository is therefore:

> **A new institution demo must never require a new code branch.**

A new demo is a new tenant, its institution data, and its configuration.

## Target demo loop

```text
Institution website
        ↓
Create demo tenant
        ↓
Crawl relevant pages
        ↓
Extract structured admissions data
        ↓
Chunk + embed knowledge
        ↓
Validate demo readiness
        ↓
Ask questions / simulate enquiries
        ↓
Inspect classification, retrieval, evidence, response and action
```

The goal is to move from a new institution to a testable demo by configuration and workflows rather than application development.

## Architecture

```text
                    ADMISSIONS DEMO OS

                    ┌───────────────┐
                    │ Demo Console  │
                    │ minimal UI    │
                    └───────┬───────┘
                            │
                            ▼
                     n8n Webhooks
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
         Onboarding      Admissions     Retrieval
          Workflow         Brain          Tool
              │             │             │
              └─────────────┼─────────────┘
                            ▼
                         Supabase
                     ┌─────────────┐
                     │ Structured  │
                     │ admissions  │
                     │ data        │
                     ├─────────────┤
                     │ Embeddings  │
                     ├─────────────┤
                     │ Demo runs   │
                     ├─────────────┤
                     │ Messages    │
                     └─────────────┘
```

### Core stack

- **n8n** — orchestration, AI workflows, ingestion, test endpoints and integrations
- **Supabase / PostgreSQL + pgvector** — tenant data, structured admissions data, source pages, chunks, embeddings and execution history
- **LLMs** — extraction, classification, query planning, reasoning and response generation
- **Minimal demo console** — operator/testing surface only; not the final customer UI

## What must be real in the demo

The demo should prove the capabilities that create actual product value:

- website ingestion
- programme/course extraction
- fee extraction
- intake extraction
- entry-requirement extraction
- source/version tracking
- embeddings
- exact lookup
- semantic retrieval
- admissions enquiry classification
- routing and decisioning
- AI response generation
- source evidence
- confidence
- visible reasoning/rationale
- escalation decisions

The surrounding infrastructure may be simulated initially. For example, an email simulator can emit the same normalized payload that Gmail would eventually send into the system.

## Core workflows

The existing **Admissions OS** email workflow and **read the embeddings data** retrieval workflow are versioned in [`workflows/n8n/`](workflows/n8n/README.md), with JSON snapshots, source versions, setup instructions and implementation notes.

The first version is intentionally small:

1. **DEMO — Create Institution**  
   Website → crawl → extract → store → chunk → embed → validate → READY.

2. **DEMO — Ask Admissions**  
   Institution + question → admissions brain → retrieval → evidence → answer → decision.

3. **DEMO — Process Email**  
   Simulated inbound email → classify → retrieve → draft → route → send/review/escalate decision.

4. **DEMO — Inspect Retrieval**  
   Query interpretation → exact lookup → semantic results → selected evidence → answer.

5. **DEMO — Reset / Clone Institution**  
   Clear test state without destroying institution knowledge, or clone a configured demo tenant.

See [`docs/N8N-WORKFLOWS.md`](docs/N8N-WORKFLOWS.md) for detailed contracts.

## Demo Console

The initial interface is not the customer product. It is our laboratory.

It should let us:

- select an institution
- create/onboard an institution
- ask an admissions question
- simulate an inbound email
- inspect classification and routing
- inspect exact and semantic retrieval
- inspect selected evidence and sources
- view the generated response
- view confidence and rationale
- regenerate/re-run tests
- reset demo state

A rough operator view:

```text
┌────────────────────────────────────────────────────────────┐
│ Admissions Demo OS                         [Institution ▼]  │
├────────────────────────────────────────────────────────────┤
│ Ask a student question                                     │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ How much is the Data Science course?                 │   │
│ └──────────────────────────────────────────────────────┘   │
│                                              [ RUN ]        │
├───────────────────────┬────────────────────────────────────┤
│ CLASSIFICATION        │ RESPONSE                           │
│ programme_fee         │ The Data Science programme...      │
│ Confidence 96%        │                                    │
├───────────────────────┼────────────────────────────────────┤
│ RETRIEVAL             │ SOURCES                            │
│ Exact       ✓         │ Course page                        │
│ Semantic    0.91      │ Fees page                          │
├───────────────────────┴────────────────────────────────────┤
│ Query → Retrieve → Evidence → Answer → Decision            │
└────────────────────────────────────────────────────────────┘
```

## Demo vs production

This repository optimizes for **speed of proving intelligence**.

The production Admissions OS optimizes for **operational reliability and deployability**.

### Demo track

```text
Supabase + n8n + LLMs + minimal console
```

Used to iterate on:

- prompts
- RAG
- extraction
- classification
- routing
- decision rules
- AI behaviour
- institution onboarding

### Production track

Consumes proven capabilities from the demo track and adds:

- authentication
- permissions/RBAC
- production Gmail integration
- queues and retries
- observability
- enterprise controls
- polished UI
- CRM integrations
- security and operational hardening

The intended development loop is:

```text
Idea → n8n workflow → test → improve → prove → productize
```

instead of:

```text
Idea → backend → UI → deploy → test AI
```

## Demo story

Every customer demo should be capable of following the same five-part narrative:

1. **Give us your website** — Admissions Demo OS learns the institution.
2. **Ask something difficult** — show retrieval, evidence and answer.
3. **Give it an enquiry** — show classification, retrieval, response and routing.
4. **Give it something it should not answer** — prove safe escalation instead of hallucination.
5. **Show the operator trace** — what happened, why, which knowledge was used and what action was selected.

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — architecture, boundaries and design principles
- [`docs/DATA-MODEL.md`](docs/DATA-MODEL.md) — proposed Supabase schema and tenant model
- [`docs/N8N-WORKFLOWS.md`](docs/N8N-WORKFLOWS.md) — workflow contracts and payloads
- [`docs/DEMO-SCOPE.md`](docs/DEMO-SCOPE.md) — what is real, what is simulated, and what is explicitly out of scope
- [`docs/IMPLEMENTATION-PLAN.md`](docs/IMPLEMENTATION-PLAN.md) — build order and acceptance criteria
- [`docs/DEMO-SCRIPT.md`](docs/DEMO-SCRIPT.md) — standard prospect demo narrative and test scenarios

## MVP success criteria

The MVP is ready when we can take a new institution website and, without changing application code, produce a demo tenant that can:

- answer common admissions questions from verified institution data
- retrieve structured and semantic evidence
- classify and route simulated inbound enquiries
- generate grounded draft responses
- refuse/escalate unsupported operational questions
- expose the execution trace and sources used
- reset test state and repeat the demo reliably

That is the product of this repository: **a repeatable, fast Admissions OS demo engine.**
