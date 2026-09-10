# n8n Workflow Contracts

## Registered core workflows

The core workflow definitions were inspected and exported on **2026-09-10**.

| Workflow | Repository snapshot |
| --- | --- |
| Admissions OS — Gmail intake, classification, response and review logging | [admissions-os.json](../workflows/n8n/admissions-os.json) |
| read the embeddings data — tenant-scoped semantic retrieval | [retrieval.json](../workflows/n8n/retrieval.json) |

The main workflow's `retrieve data` tool calls the retrieval workflow. Both source workflows were active at export; repository imports are inactive and exclude credential bindings and pinned data.

See the [snapshot guide](../workflows/n8n/README.md) for actual behaviour, inputs, dependencies, import instructions and observed gaps, and the [manifest](../workflows/n8n/manifest.json) for source versions. The contracts below are design targets; the snapshots document the current implementation, which does not yet implement every target.

## Purpose

The demo runtime should be built from a small number of reusable workflows rather than institution-specific automations.

Each workflow must be tenant-aware and versioned.

The goal is to create a stable set of contracts that a minimal UI, Postman, curl, or another n8n workflow can call.

---

# 1. DEMO — Create Institution

## Input

```json
{
  "institution_name": "Example University",
  "website": "https://example.edu",
  "slug": "example-university",
  "config": {
    "country": "Kenya",
    "default_currency": "KES"
  }
}
```

## Responsibilities

```text
Validate input
    ↓
Create tenant
    ↓
Discover relevant URLs
    ↓
Fetch/crawl pages
    ↓
Classify page types
    ↓
Extract structured admissions data
    ↓
Persist source versions
    ↓
Normalize programmes / fees / intakes / requirements
    ↓
Create knowledge chunks
    ↓
Generate embeddings
    ↓
Run validation checks
    ↓
Mark tenant READY or FAILED
```

## Output

```json
{
  "tenant_id": "uuid",
  "slug": "example-university",
  "status": "ready",
  "summary": {
    "pages_collected": 42,
    "programmes": 28,
    "fees": 19,
    "intakes": 8,
    "requirements": 35,
    "knowledge_chunks": 317
  },
  "validation": {
    "passed": true,
    "warnings": []
  }
}
```

## Failure behaviour

Do not silently mark a tenant ready if critical extraction or embedding steps failed.

Return:

```json
{
  "status": "failed",
  "stage": "embedding",
  "errors": ["..."]
}
```

---

# 2. DEMO — Ask Admissions

This is the fastest way to test the Admissions Brain.

## Input

```json
{
  "tenant_id": "uuid",
  "message": "How much is the Software Engineering course and when is the next intake?"
}
```

## Responsibilities

```text
Resolve tenant
   ↓
Create demo_run
   ↓
Interpret question
   ↓
Identify entities + required facts
   ↓
Call Retrieval Tool
   ↓
Receive evidence
   ↓
Generate grounded answer
   ↓
Choose decision
   ↓
Persist full trace
   ↓
Return answer + trace summary
```

## Output

```json
{
  "run_id": "uuid",
  "answer": "...",
  "classification": {
    "intent": "programme_fee_and_intake",
    "programme": "Software Engineering"
  },
  "confidence": 0.96,
  "decision": "reply",
  "sources": [
    {
      "title": "Software Engineering",
      "url": "https://example.edu/software-engineering"
    }
  ],
  "retrieval_summary": {
    "exact_matches": 2,
    "semantic_matches": 3,
    "selected_evidence": 3
  }
}
```

---

# 3. DEMO — Process Email

## Input

```json
{
  "tenant_id": "uuid",
  "message_id": "demo-001",
  "thread_id": "thread-001",
  "from": "student@example.com",
  "subject": "September intake",
  "body": "Hi, I want to join Software Engineering. Are applications still open?",
  "received_at": "2026-09-07T12:00:00+03:00"
}
```

## Responsibilities

```text
Normalize message
   ↓
Persist demo_message
   ↓
Classify
   ↓
Determine routing eligibility
   ↓
Plan required knowledge
   ↓
Retrieve evidence
   ↓
Generate draft where appropriate
   ↓
Choose action
   ├── reply
   ├── review
   ├── escalate
   └── ignore
   ↓
Persist run
```

## Output

```json
{
  "run_id": "uuid",
  "classification": {
    "intent": "admissions_enquiry",
    "topic": "programme_intake",
    "status": "classified"
  },
  "decision": "reply",
  "draft": "...",
  "confidence": 0.94,
  "sources": [],
  "rationale": "..."
}
```

For account-specific or unsupported questions, the response may be:

```json
{
  "decision": "escalate",
  "draft": null,
  "confidence": 0.99,
  "rationale": "Payment status requires access to the institution's finance system."
}
```

---

# 4. DEMO — Retrieval Tool

This is a sub-workflow called by the Admissions Brain.

The Brain should not care whether the answer comes from SQL, vector search, or both.

## Input

```json
{
  "tenant_id": "uuid",
  "query": "What are the entry requirements for Data Science?",
  "intent": "programme_entry_requirements",
  "entities": {
    "programme_name": "Data Science"
  },
  "required_fields": [
    "academic_requirements",
    "document_requirements"
  ]
}
```

## Retrieval strategy

```text
Input
 ↓
Can this be answered deterministically?
 ├── yes → structured lookup
 └── no/partial → semantic retrieval
 ↓
Combine candidate evidence
 ↓
De-duplicate
 ↓
Validate tenant/source scope
 ↓
Rank/select evidence
 ↓
Return normalized evidence bundle
```

## Output

```json
{
  "strategy": "hybrid",
  "exact_results": [
    {
      "entity": "programme_requirement",
      "value": "KCSE mean grade C+ ...",
      "source_version_id": "uuid"
    }
  ],
  "semantic_results": [
    {
      "chunk_id": "uuid",
      "score": 0.89,
      "content": "...",
      "source_url": "https://example.edu/data-science"
    }
  ],
  "selected_evidence": [
    {
      "type": "structured",
      "content": "...",
      "source_url": "https://example.edu/data-science"
    }
  ],
  "sufficient": true
}
```

## Retrieval rules

1. Always require `tenant_id`.
2. Prefer exact structured facts for known fields.
3. Use semantic retrieval for supporting/unclear content.
4. Never return another tenant's records.
5. Return source provenance with every selected fact.
6. If evidence is weak or contradictory, set `sufficient=false`.
7. Do not let the final response model infer missing institution facts.

---

# 5. DEMO — Inspect Retrieval

This is a debugging endpoint, not a customer capability.

## Input

```json
{
  "tenant_id": "uuid",
  "query": "What are the entry requirements for Data Science?"
}
```

## Output

Return the complete internal retrieval trace:

```json
{
  "interpretation": {
    "intent": "programme_entry_requirements",
    "entities": {
      "programme_name": "Data Science"
    },
    "required_fields": ["academic_requirements", "document_requirements"]
  },
  "exact_lookup": [],
  "semantic_results": [],
  "selected_evidence": [],
  "final_answer": "..."
}
```

The console should render these sections separately.

---

# 6. DEMO — Reset Institution

## Input

```json
{
  "tenant_id": "uuid",
  "mode": "test_state"
}
```

`test_state` should remove:

- demo messages
- demo runs
- evaluations

It should preserve institution knowledge.

A destructive mode may be added later for complete re-onboarding.

## Output

```json
{
  "tenant_id": "uuid",
  "status": "reset",
  "deleted": {
    "messages": 18,
    "runs": 31,
    "evaluations": 12
  }
}
```

---

# 7. DEMO — Clone Institution

## Input

```json
{
  "source_tenant_id": "uuid",
  "new_name": "Example University — Sales Demo",
  "new_slug": "example-university-sales"
}
```

## Behaviour

Clone:

- tenant config
- structured admissions data
- current knowledge
- chunks/embeddings

Do not clone:

- test messages
- runs
- evaluations

---

# 8. Run tracing contract

Every AI-facing workflow should persist at least:

```json
{
  "run_id": "uuid",
  "tenant_id": "uuid",
  "run_type": "ask_admissions",
  "input": {},
  "interpretation": {},
  "classification": {},
  "retrieval_plan": {},
  "exact_results": [],
  "semantic_results": [],
  "selected_evidence": [],
  "generated_response": "...",
  "decision": "reply",
  "confidence": 0.94,
  "rationale": "...",
  "sources": [],
  "prompt_version": "brain-v1",
  "workflow_version": "ask-admissions-v1",
  "model_info": {},
  "status": "completed"
}
```

If the demo cannot show why a response happened, the trace is incomplete.

---

# 9. Workflow naming convention

Use names that remain obvious inside n8n:

```text
DEMO — Create Institution
DEMO — Ask Admissions
DEMO — Process Email
DEMO — Retrieval Tool
DEMO — Inspect Retrieval
DEMO — Reset Institution
DEMO — Clone Institution
```

Sub-workflows may follow:

```text
DEMO SUB — Crawl Website
DEMO SUB — Extract Page
DEMO SUB — Normalize Programme
DEMO SUB — Embed Chunks
DEMO SUB — Validate Tenant
```

---

# 10. Versioning

Every production of a response should identify:

- main brain prompt version
- classifier prompt version where separate
- retrieval workflow version
- answer-generation prompt version where separate
- model
- embedding model

This is required for meaningful regression testing.
