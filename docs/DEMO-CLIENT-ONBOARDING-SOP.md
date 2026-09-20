# Demo Client Onboarding SOP — Research Sheet to Retrieval-Ready Chunks

**Status:** Working SOP for Admissions Demo OS  
**Version:** 1.1  
**Last updated:** 2026-09-20  
**Reference implementations:** RCM Online College, Moringa School, Strathmore University

## Purpose

Define the current manual/AI-assisted process for onboarding a new institution into the Admissions Demo OS.

The goal is to move from:

```text
Institution name + website
```

to:

```text
Reviewed, publish-ready knowledge chunks
```

which can then be embedded and used by the Admissions Demo OS retrieval pipeline.

For the demo phase, the Google Sheet is the working onboarding and review surface. We deliberately use it before building a dedicated onboarding UI because it lets AI do most of the research while keeping human review simple and visible.

---

## 1. End-to-end demo onboarding flow

```text
Institution + website
        ↓
Source discovery / scrape
        ↓
Stage 1: classify page + relevance
        ↓
Relevant source
        ↓
Stage 2: extract explicit facts
        ↓
Staging (audit observations)
        ↓
match / conflict / review
        ↓
accepted facts → canonical tabs
        ↓
Chunk Prep / automatic chunks
        ↓
publish_ready = TRUE
        ↓
Embeddings
        ↓
knowledge_chunks / pgvector
        ↓
Retrieval tests
        ↓
Knowledge Ready
        ↓
Email / enquiry response testing
```

The Sheet is the starting point for the demo knowledge build.

---

## 2. Onboarding Sheet structure

Each new institution should get a duplicate of the Admissions OS Client Onboarding Template.

Expected tabs:

- `Institution`
- `Source Pages`
- `Staging`
- `Programmes`
- `Fees`
- `Intakes`
- `Requirements`
- `Application Process`
- `FAQs & Policies`
- `Contacts & Locations`
- `Scholarships`
- `Conflicts & Review`
- `KB Test Questions`
- `Response Policy`
- `Go-Live Checklist`
- `Chunk Prep`

Not every institution will have every type of information. Missing data should remain a knowledge gap rather than being inferred.

---

## 3. AI research and extraction pass

Given the institution name and official website, AI/Astra should research the institution end to end.

The onboarding run must not treat research output as canonical truth immediately. The run should:

1. register/discover the source;
2. classify the source;
3. skip irrelevant sources;
4. extract only explicit facts from relevant sources;
5. write each extracted observation to `Staging`;
6. compare observations for the same entity + field;
7. promote accepted observations into the canonical tabs.

The canonical tabs remain the working current-state knowledge model; `Staging` is the audit layer that records how those values were obtained.

### Primary research targets

AI should look for:

- programmes / courses
- programme descriptions
- qualifications
- programme type / level
- duration
- study mode
- delivery mode
- campus/location
- current intake
- start dates
- application deadlines
- tuition fees
- other fees
- payment methods
- entry requirements
- academic requirements
- document requirements
- application steps
- application URLs
- scholarships / funding
- contacts
- physical locations
- admissions FAQs
- refund/rescheduling rules
- course access rules
- other policies likely to affect student responses

### Stage 1 — source classification

For each source, Stage 1 returns only:

```text
page_type
relevance
relevance_level
next_action
reason
```

Stage 1 does not extract programmes, fees, dates, requirements, contacts, links or other detailed facts.

Routing:

```text
relevant      → process
irrelevant    → skip
needs_review  → review
```

`relevance_level` measures usefulness to the admissions knowledge base, not the general importance of the webpage.

### Stage 2 — fact extraction

For relevant sources, extract only facts explicitly supported by the source. Missing facts stay missing; do not create placeholder observations such as `unknown`.

One entity may produce many observations. Example:

```text
Bachelor of Commerce | programme_name | Bachelor of Commerce
Bachelor of Commerce | duration       | 4 years
Bachelor of Commerce | study_mode     | Full-time
```

Each observation must retain source evidence and provenance.

### Source rules

1. Prefer official institution sources.
2. Use regulator/exam-body sources to verify important externally governed facts where useful.
3. Prefer current information over historical information.
4. Retain the URL supporting each important fact.
5. Do not silently merge contradictory facts.
6. Record conflicting facts in `Conflicts & Review`.
7. Treat `not found` differently from `does not exist`.
8. Do not invent missing fees, dates, requirements, contacts or policies.

---


## 4. Staging — mandatory audit step

Every extracted observation must be written to the `Staging` tab as part of the same onboarding run before it is promoted to canonical tables.

### Staging purpose

Staging preserves:

- what the source literally said;
- the source URL / source ID;
- the entity the fact belongs to;
- the field and raw value;
- the normalized candidate;
- short source evidence;
- extraction confidence;
- match/conflict state;
- resolution state;
- the canonical record eventually created or updated.

### Required Staging fields

```text
staging_id
onboarding_run_id
source_id
source_url
temporary_entity_id
entity_type
entity_name
field_name
raw_value
normalized_value
source_evidence
extraction_confidence
resolution_status
canonical_entity_id
canonical_table
conflict_status
extracted_at
reviewed_at
notes
```

Workflow-owned IDs must not be invented by the research model.

### Observation comparison

Compare observations using the same logical entity + field.

```text
no previous observation        → conflict_status = unique
same normalized value          → conflict_status = match
different normalized value     → conflict_status = conflict
```

For a conflict:

```text
resolution_status = needs_review
```

and create/update the corresponding item in `Conflicts & Review`.

Do not silently choose between conflicting values.

### Promotion rule

Only observations with:

```text
resolution_status = accepted
```

may populate or update canonical tabs.

After promotion, record:

```text
canonical_entity_id
canonical_table
```

A conflict on one field does not block unrelated accepted facts for the same entity unless that conflict is marked blocking.

---

## 5. Human review gate

AI should prepare the first version of the data, but the demo operator should validate the important facts before they are used for production-style retrieval.

High-priority review items include:

- current fees
- current intake
- application deadlines
- entry requirements
- payment instructions
- physical location
- admissions contacts
- accreditation/status
- refund/payment policies
- any conflicting information

Rows can use states such as:

```text
Pending human review
Approved
Needs research
Needs human input
Conflict pending
```

Unresolved information must not become a publish-ready chunk when the uncertainty would materially change the student answer.

---

# 6. Preparing data for chunking

## Core rule

**Do not make one chunk per spreadsheet row.**

The Sheet is structured for review. Retrieval chunks must be structured around how students actually ask questions.

A chunk should normally represent either:

1. one **entity**, such as CPA; or
2. one **student intent/topic**, such as refunds or how to apply.

The goal is that a useful chunk can be retrieved and understood on its own.

---

## 7. Entity-based chunks

Use an entity chunk when related data across several tabs describes the same programme/course.

Example:

```text
Programmes: CPA
        +
Fees: CPA
        +
Intakes: CPA
        +
Requirements: CPA
        ↓
RCM-PROG-CPA
```

### Programme chunk fields

Where available, assemble:

- programme name
- programme type
- qualification
- description
- duration
- study mode
- delivery mode
- campus
- current intake
- current tuition
- entry requirements
- accreditation/status where relevant
- material caveats

### Example

```text
Institution: RCM Online College.
Category: Programme.
Programme: Certified Public Accountants (CPA).
Type: KASNEB professional qualification.
Description: Professional accounting qualification preparing learners for accounting, audit, finance, tax and business advisory roles.
Delivery: Physical classes, live Zoom, online classes and pre-recorded sessions.
Current intake: September–December 2026.
Current fees: Online KES 5,200 per unit; Physical KES 7,000 per unit.
Minimum entry: KCSE mean grade C+ (Plus), or a KASNEB diploma qualification, or another recognized diploma.
```

This one chunk can support questions such as:

- What is CPA?
- How much is CPA?
- When is the CPA intake?
- What are the CPA requirements?
- Can I study CPA online?

---

## 8. Topic / intent chunks

Some knowledge should not be attached to one programme.

Create topic chunks around a coherent student question family.

Common categories:

```text
fees
intake
application_process
policy
faq
contact
scholarship
```

### Examples

#### Application process

Combine related steps into one coherent process:

```text
choose programme
→ create institution account
→ register with examining body where applicable
→ select units
→ pay tuition
→ send payment confirmation
→ access classes
```

#### Refund policy

Combine:

- refund eligibility
- non-refundable cases
- rescheduling window
- missed-class rules
- what the AI must not promise

#### Current fee schedule

Combine fees that share the same validity period:

- online fee
- physical fee
- retake fee
- special current fee
- payment method
- effective intake

---

# 9. Chunk grouping criteria

Before combining records into one chunk, evaluate:

### 1. Entity
Are the facts about the same programme/course/entity?

### 2. Intent
Would students naturally ask for these facts together?

### 3. Relatedness
Does combining the information improve the usefulness of one retrieval result?

### 4. Freshness
Do the facts belong to the same current/effective period?

### 5. Conflict status
Is any material fact unresolved?

### 6. Self-containedness
Would the chunk make sense if it were the only knowledge retrieved?

Do not combine unrelated information merely to create larger chunks.

---

# 10. Freshness rules

Time-sensitive information must retain its effective context.

Examples:

```text
Current tuition for September–December 2026:
Online: KES 5,200 per unit.
Physical: KES 7,000 per unit.
```

Good:

```text
September–December 2026 tuition is KES 5,200 per online unit.
```

Bad:

```text
CPA costs KES 5,200.
```

because the second statement loses the validity period and billing basis.

Historical and current fees should not be flattened into one undated value.

---

# 11. Conflict handling

A chunk may still be generated for review when a conflict exists, but it must remain:

```text
publish_ready = FALSE
```

Examples:

- two current-looking fee amounts
- conflicting campus addresses
- unclear `always open` intake wording
- unknown admissions email
- unverified entry requirements
- unverified accreditation/status

The chunk can include the caveat for human review, but the disputed fact must not enter production-style retrieval as approved knowledge.

---

# 12. `Chunk Prep` schema

Every demo onboarding Sheet should contain a `Chunk Prep` tab with:

| Field | Purpose |
|---|---|
| `chunk_key` | Stable human-readable chunk ID |
| `institution_id` | Institution/tenant scope |
| `category` | programme, fees, intake, policy, etc. |
| `entity_type` | programme, process, policy, fee_schedule, etc. |
| `entity_name` | Human-readable programme/topic name |
| `content` | Final text that will be embedded |
| `keywords` | Aliases and useful search/debug terms |
| `source_urls` | URLs supporting the chunk |
| `source_tabs` | Sheet tabs used to assemble it |
| `review_status` | Current review state |
| `publish_ready` | TRUE only when safe to embed/use |
| `notes` | Gaps, conflicts and operator notes |

### Primary embedding input

The field sent to the embedding model is:

```text
content
```

The other fields are metadata for filtering, traceability, auditing and debugging.

---

# 13. Publish-ready criteria

Set:

```text
publish_ready = TRUE
```

only when all of the following are true:

- [ ] Material facts have been reviewed/approved.
- [ ] Current and historical values are correctly separated.
- [ ] No unresolved conflict would change the likely student answer.
- [ ] Relevant source URL(s) are retained.
- [ ] The chunk is self-contained.
- [ ] The chunk is assigned to the correct institution.
- [ ] The text contains no unsupported inference.
- [ ] Time-sensitive facts contain appropriate effective context.

Only `publish_ready = TRUE` chunks should be pushed into the demo retrieval index.

---

# 14. Embedding handoff

The next pipeline is intentionally simple:

```text
Chunk Prep
    ↓
filter publish_ready = TRUE
    ↓
content
    ↓
text-embedding-3-small
    ↓
knowledge_chunks
    ↓
pgvector
```

At minimum, store alongside each vector:

```text
institution_id
chunk_key
category
entity_type
entity_name
content
source_urls
embedding
is_active
```

Add effective/version metadata for time-sensitive knowledge when available.

---

# 15. Retrieval validation

After embedding, use the `KB Test Questions` tab to test the institution.

Test at minimum:

- programme overview
- fees
- current intake
- requirements
- application process
- payment instructions
- policies/refunds
- contacts
- multi-part enquiries
- unknown/no-answer cases

For each test inspect:

```text
student question
→ query interpretation
→ chunks retrieved
→ selected evidence
→ generated answer
```

A test is not successful merely because the AI produced a plausible answer. The correct chunk/evidence must have been retrieved.

---

# 16. Demo client onboarding checklist

For every new demo client:

```text
[ ] Duplicate Client Onboarding Template
[ ] Add institution name + official website
[ ] Run source discovery / scrape
[ ] Classify every source
[ ] Skip irrelevant sources
[ ] Extract explicit facts from relevant sources
[ ] Write every extracted observation to Staging
[ ] Compare entity + field observations for match/conflict
[ ] Resolve or flag blocking conflicts
[ ] Promote accepted observations to canonical tabs
[ ] Populate source pages
[ ] Populate programmes
[ ] Populate fees
[ ] Populate intakes
[ ] Populate requirements
[ ] Populate application process
[ ] Populate FAQs/policies
[ ] Populate contacts/locations
[ ] Record scholarships or explicit knowledge gap
[ ] Identify conflicts
[ ] Human-review high-risk facts
[ ] Confirm accepted Staging rows are linked to canonical records
[ ] Build / auto-populate Chunk Prep
[ ] Review chunk grouping
[ ] Resolve material conflicts
[ ] Mark safe chunks publish_ready = TRUE
[ ] Embed publish-ready content
[ ] Run KB test questions
[ ] Inspect retrieval results
[ ] Mark institution Knowledge Ready
```

---

# 17. Reference implementation: RCM Online College

RCM Online College was the first institution run through this manual demo onboarding method.

The process successfully produced:

- structured programme records
- current fee records
- current intake records
- programme requirements
- application process
- policies/FAQs
- contact/location records
- explicit knowledge gaps
- conflict review items
- retrieval-oriented `Chunk Prep` records

The RCM run also showed why human review remains necessary. Examples included:

- historical vs current tuition differences
- a CPFM-specific fee conflict
- multiple published location/address values
- flexible/always-open intake wording vs semester-based intake wording
- missing primary admissions email

Those facts were not silently guessed. Affected chunks remained non-publishable until confirmation.

This RCM workflow is the current reference pattern for onboarding future institutions into the Admissions Demo OS.

---

## Relationship to other demo docs

This SOP operationalizes the ideas in:

- [`WIP-KNOWLEDGE-ONBOARDING.md`](WIP-KNOWLEDGE-ONBOARDING.md)
- [`DATA-MODEL.md`](DATA-MODEL.md)
- [`N8N-WORKFLOWS.md`](N8N-WORKFLOWS.md)
- [`ARCHITECTURE.md`](ARCHITECTURE.md)

The WIP document remains the broader design direction. This file defines the repeatable manual process we can use today for demo onboarding.
