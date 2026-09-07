# Architecture

## 1. Purpose

Admissions Demo OS is a **demo runtime and AI experimentation layer**, not the production Admissions OS application.

Its job is to make the core intelligence easy to configure, run, inspect and repeat across institutions.

The system should optimize for:

- fast institution onboarding
- zero-code demo creation
- easy prompt/RAG iteration
- visible evidence and execution traces
- repeatable test scenarios
- portability of proven workflows into production

It should not optimize for polished end-user experience or full enterprise infrastructure in its first versions.

---

## 2. Architectural principle

> **Institution-specific behaviour must come from data and configuration, not branches or code changes.**

A tenant is the unit of demo configuration.

Every request that reaches the system must carry or resolve a `tenant_id`, and every institution-scoped query must enforce that tenant boundary.

Conceptually:

```sql
WHERE tenant_id = :tenant_id
```

This applies to:

- programmes
- fees
- intakes
- requirements
- source pages
- knowledge chunks
- messages
- demo runs
- tenant configuration

---

## 3. Runtime components

### 3.1 Demo Console

A minimal internal operator surface.

Responsibilities:

- select tenant
- create tenant
- run onboarding
- ask a question
- simulate an email
- inspect retrieval
- inspect response generation
- inspect routing
- inspect source evidence
- re-run/regenerate
- reset demo state

The console is deliberately not the final customer UI.

### 3.2 n8n

n8n is the primary orchestration layer for the demo runtime.

Responsibilities:

- expose webhooks/endpoints
- crawl or call scraping services
- run extraction steps
- normalize outputs
- call embedding models
- execute exact lookup and semantic retrieval
- invoke the Admissions Brain
- store run traces
- simulate integrations
- manage reset/clone operations

The goal is to keep behavioural iteration here because it is faster than rebuilding and redeploying the production app.

### 3.3 Supabase / PostgreSQL / pgvector

Supabase is the system of record for the demo runtime.

Responsibilities:

- tenant metadata
- source/version history
- structured admissions entities
- chunk storage
- embeddings
- test messages
- run traces
- configuration

Structured admissions facts and semantic knowledge should coexist. Exact facts should be retrieved directly where possible; semantic search should be used where interpretation is needed.

### 3.4 LLMs

LLMs are used for tasks that benefit from probabilistic reasoning:

- page classification
- structured extraction
- query interpretation
- classification
- retrieval planning
- answer synthesis
- routing rationale

LLMs should not be used to invent institution facts that can be looked up deterministically.

---

## 4. Core request path

```text
User/demo input
      ↓
Resolve tenant
      ↓
Admissions Brain
      ↓
Interpret request
      ↓
Choose retrieval strategy
      ↓
Retrieval Tool
  ├── exact/structured lookup
  └── semantic/vector search
      ↓
Evidence set
      ↓
Grounded response generation
      ↓
Decision
  ├── reply
  ├── review
  └── escalate
      ↓
Persist complete run trace
```

The Admissions Brain should call one logical retrieval tool. That tool may internally route between deterministic lookup and semantic retrieval.

This keeps the brain simple while allowing retrieval behaviour to evolve independently.

---

## 5. Retrieval architecture

### 5.1 Exact lookup first when the user asks for known fields

Examples:

- programme name
- tuition fee
- intake date
- application deadline
- course duration
- study mode
- entry requirements

For these, structured lookup is preferred because it is deterministic and easier to validate.

Example:

```text
"How much is the Software Engineering course?"
        ↓
intent = programme_fee
programme = Software Engineering
        ↓
structured lookup
        ↓
programme_fees
```

### 5.2 Semantic retrieval when interpretation is needed

Use vector retrieval for:

- broad policy questions
- unclear wording
- explanatory content
- multi-part questions
- facts stored only in source text
- supporting evidence around structured facts

### 5.3 Hybrid retrieval

The preferred final behaviour is hybrid:

```text
Query interpretation
       ↓
Structured facts + semantic evidence
       ↓
Evidence validation
       ↓
Answer
```

For important admissions facts, the answer should ideally have both:

- a normalized structured value
- source evidence that proves where it came from

---

## 6. Source provenance and versioning

Every extracted fact should remain traceable back to a source page/version.

Minimum provenance chain:

```text
Tenant
  ↓
Source page
  ↓
Source version
  ↓
Extracted structured record / knowledge chunk
  ↓
Retrieval result
  ↓
Generated response
```

This allows the operator to answer:

- where did this answer come from?
- when was that page collected?
- which version produced this fact?
- what evidence did the AI actually use?

---

## 7. Demo integration philosophy

The demo should prove decision quality before integration plumbing.

### Email

Production:

```text
Gmail OAuth → Gmail Trigger → thread management → send
```

Demo:

```text
Email simulator → normalized inbound payload → same Admissions Brain
```

### CRM

Production:

```text
Admissions decision → CRM API
```

Demo:

```text
Admissions decision → simulated CRM action in trace
```

### Human review

Production:

```text
Slack / dashboard / operational queue
```

Demo:

```text
Approve / Edit / Reject action in the console
```

The downstream product integration can be attached after the intelligence is proven.

---

## 8. Separation from production

### Demo Runtime

Optimizes for:

- speed
- visibility
- iteration
- inspection
- repeatability

### Production Admissions OS

Optimizes for:

- reliability
- security
- permissions
- scale
- deployment
- observability
- integration lifecycle
- customer UX

The two tracks should share contracts and proven logic, but they should not block each other.

---

## 9. Non-negotiable design rules

1. New institution = new tenant/configuration, not new branch.
2. Every institution-scoped record carries `tenant_id`.
3. Every answer stores its retrieval evidence.
4. Structured facts are preferred over LLM inference when available.
5. The system must be able to say "I do not know" or escalate.
6. Demo integrations may be simulated, but AI decisions must be real.
7. The operator must be able to inspect the full execution trace.
8. Demo state must be resettable without destroying institution knowledge.
9. Prompts and workflow versions should be recorded on every run.
10. The demo engine must remain lightweight enough to iterate quickly.
