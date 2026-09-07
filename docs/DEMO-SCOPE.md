# Demo Scope

## Objective

The Admissions Demo OS should prove the **core intelligence and operational decisions** of the product with the least possible setup friction.

The first version is deliberately narrower than the production system.

---

## What must be real

These capabilities are the product value and should run for real in every demo.

### Institution onboarding

- website URL intake
- relevant page discovery
- page collection
- structured extraction
- source/version persistence
- knowledge chunking
- embedding generation
- demo readiness validation

### Admissions knowledge

- programme/course information
- tuition and other fees
- intake dates
- application deadlines where available
- duration
- study/delivery mode
- entry requirements
- application links
- other high-value admissions facts found in source content

### Retrieval

- exact lookup against structured data
- semantic search against embedded content
- hybrid retrieval
- tenant scoping
- source evidence
- retrieval scores where applicable

### Intelligence

- admissions/non-admissions classification
- intent identification
- knowledge requirement planning
- routing decision
- answer generation
- confidence
- response rationale
- escalation when evidence is insufficient or the issue requires a human/system-of-record check

### Inspection

- raw question/message
- normalized interpretation
- exact lookup results
- semantic retrieval results
- selected evidence
- sources used
- response
- decision
- confidence
- workflow/prompt version
- run timestamp

---

## What may be simulated initially

These elements can use lightweight adapters or demo-only actions.

### Email

Use an email simulator that produces the same normalized payload expected from Gmail.

Required fields should approximate the production contract:

```json
{
  "tenant_id": "example-university",
  "message_id": "demo-message-001",
  "thread_id": "demo-thread-001",
  "from": "student@example.com",
  "subject": "September intake",
  "body": "Are applications still open for Software Engineering?",
  "received_at": "2026-09-07T12:00:00+03:00"
}
```

### CRM

Instead of making a live CRM write, record a proposed action such as:

```json
{
  "action": "create_follow_up",
  "entity": "lead",
  "reason": "student requested a callback"
}
```

### Human review

The demo console only needs:

- approve
- edit
- reject
- escalate

These actions can persist to the demo database without a full review product.

### Sending

The system may display `would_send`, `would_review`, or `would_escalate` rather than performing a real outbound action.

---

## Explicitly out of scope for the first demo runtime

Do not let these block the demo engine:

- enterprise RBAC
- SSO
- sophisticated authentication
- production Gmail OAuth lifecycle
- production CRM integrations
- full ticketing integration
- distributed queues
- large-scale worker architecture
- production retry infrastructure
- polished customer-facing navigation
- responsive enterprise UI
- advanced organization administration
- billing
- production analytics dashboard
- deep observability stack
- full notification infrastructure
- deployment-specific enterprise hardening

These belong in the production Admissions OS once behaviour is proven.

---

## Core demo capabilities

A complete demo should be able to show all of the following without changing code:

### 1. Learn an institution

Input:

```json
{
  "institution_name": "Example University",
  "website": "https://example.edu"
}
```

Expected outcome:

```text
Status: READY
Pages collected: N
Programmes: N
Fees: N
Intakes: N
Requirements: N
Knowledge chunks: N
```

### 2. Answer an admissions question

Example:

> How much is the Data Science course and when is the next intake?

The trace should show:

- intent
- resolved programme
- structured fee lookup
- intake lookup
- supporting source evidence
- final grounded answer

### 3. Process an inbound enquiry

Example:

> Hi, I want to join Software Engineering in January. What do I need and how do I apply?

The system should:

- classify
- identify information required
- retrieve requirements and intake/application data
- generate a draft
- choose reply/review/escalate

### 4. Refuse to hallucinate operational facts

Example:

> I paid yesterday but my portal still says unpaid. Can you confirm the payment?

Expected behaviour:

- identify finance/account-specific issue
- do not claim payment status
- explain the need for verification
- route/escalate appropriately

### 5. Show why it made the decision

The operator should be able to see:

- what the system understood
- what it searched
- what it found
- what it selected
- what it answered
- why it chose the final action

---

## Definition of a successful prospect demo

A prospect should leave understanding that Admissions OS can:

1. learn their institution's admissions knowledge,
2. answer student questions from that knowledge,
3. process enquiries consistently,
4. avoid making up unsupported answers,
5. route cases that need staff intervention,
6. expose exactly what information drove each response.

That is enough to validate interest before full implementation work begins.
