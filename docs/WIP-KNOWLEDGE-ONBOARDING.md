# WIP — Institution Knowledge Onboarding

> **Status:** Idea / Work in Progress
>
> **Purpose:** Capture the current direction for rapidly onboarding a new institution into the Admissions Demo OS knowledge base.
>
> This is **not yet a locked implementation specification**. It records the data we want, the working knowledge architecture, and the proposed agent-assisted onboarding flow so we can test the approach during demos before hardening it into the production Admissions OS.

---

## 1. Goal

For demos, onboarding a new institution should require as little setup as possible.

The desired operator experience is eventually as simple as:

```text
Institution: Riara University
Website: https://...
Country: Kenya

[ Start Onboarding ]
```

The system should then discover the institution's official information, organize the admissions knowledge we need, preserve source evidence, prepare it for review, and publish approved data into the demo knowledge base.

The working principle is:

> **Agents build the first version of the knowledge base. Humans validate exceptions and important facts. Deterministic workflows publish approved data into Supabase.**

For the demo phase, we do not need to build a sophisticated onboarding UI first. A structured Google Sheet or similar staging template can act as the review layer.

---

# 2. What the knowledge base needs to capture

The knowledge model should cover the information an admissions team or prospective student is likely to ask about.

Not every institution will expose every item. Missing information should remain missing rather than being inferred.

## 2.1 Institution identity

- institution name
- alternative/trading names
- institution type
- description/about information
- founded year
- charter/accreditation information where available
- ownership/type
- religious affiliation where applicable
- vision
- mission
- values/philosophy
- official website

## 2.2 Contacts

- general email
- admissions email
- finance email
- general phone
- admissions phone
- finance phone
- WhatsApp where officially provided
- postal/physical address
- relevant department contacts

## 2.3 Campuses

- campus name
- address/location
- city
- country
- main-campus status
- residential/non-residential status
- campus description
- campus-specific contacts
- campus-specific facilities

## 2.4 Academic structure

- schools
- faculties
- departments
- institutes
- centres
- parent/child academic relationships

Internally these can resolve to a common `academic_unit` entity with a type such as `school`, `faculty`, `department`, `institute`, or `centre`.

## 2.5 Programmes / courses

This is a critical admissions domain.

Capture where available:

- programme name
- alternative programme name
- programme description
- programme level
- qualification awarded
- programme/course type
- school/faculty/department
- campus
- duration
- delivery mode
- study mode
- attendance mode
- programme status
- programme page URL
- programme application URL

Suggested normalized programme levels:

```text
certificate
diploma
higher_diploma
undergraduate
postgraduate_diploma
masters
doctorate
professional
short_course
other
```

Suggested delivery modes:

```text
on_campus
online
hybrid
distance
unspecified
```

Suggested study modes:

```text
full_time
part_time
evening
weekend
self_paced
unspecified
```

## 2.6 Admissions

- general admission requirements
- academic requirements
- programme-specific requirements
- eligibility rules
- document requirements
- application steps
- application URL
- application opening date
- application deadline
- international student requirements where available
- transfer requirements where available
- other explicit admissions rules

## 2.7 Intakes and dates

Intakes should be treated as time-aware information rather than a generic text field.

Capture:

- intake name
- year
- programme relationship
- campus relationship
- start date
- application opening date
- application deadline
- intake status
- effective/current/historical context

Example entity:

```text
intake:institution:2026-september
```

## 2.8 Fees

Fees need precise context to avoid false answers.

Capture:

- fee name
- fee type
- amount
- currency
- programme
- campus
- intake
- academic year
- semester/term where relevant
- billing basis
- mandatory/optional status
- description/notes

Suggested fee types:

```text
tuition
application
registration
accommodation
examination
library
technology
student_activity
graduation
other
```

Suggested billing basis:

```text
one_time
per_semester
per_term
per_year
per_course
per_credit
per_unit
per_month
total_programme
unspecified
```

Money should be normalized structurally, for example:

```json
{
  "amount": 110000,
  "currency": "KES"
}
```

while preserving the original source wording as evidence.

## 2.9 Payment methods

These are high-risk operational facts and should retain strong source evidence.

Capture:

- payment method
- bank name
- account name
- account number
- branch
- M-Pesa paybill
- till number
- SWIFT code
- payment reference instructions
- online payment URL
- other explicit payment instructions

Critical payment values should not be silently overwritten when a different value is discovered later.

## 2.10 Financial aid

- scholarship/bursary/loan/grant name
- financial aid type
- description
- eligibility
- coverage
- amount where available
- currency
- application requirements
- application deadline
- application URL
- current status

Possible types:

```text
scholarship
loan
bursary
grant
discount
work_study
other
```

## 2.11 Accommodation

- accommodation availability
- campus
- accommodation/hostel name
- accommodation type
- gender restrictions where explicit
- boarding type
- meals included
- self-catering status
- capacity where explicit
- fee where available
- description

## 2.12 Facilities

Examples:

- libraries
- laboratories
- clinics
- sports facilities
- cafeterias
- studios
- auditoriums
- moot courts
- other useful campus facilities

## 2.13 Student life and services

Where relevant:

- clubs
- societies
- sports
- chaplaincy
- counselling
- health services
- disability support
- security
- transport
- career services
- other student services

## 2.14 Leadership and accreditation

- person name
- role
- school/department relationship
- term/date where available
- accreditation body
- accreditation/charter status
- accreditation date

## 2.15 Policies

Useful admissions-related policies can include:

- admissions policy
- payment policy
- refund policy
- deferment policy
- withdrawal policy
- transfer policy
- other policies that materially affect applicants/students

## 2.16 Useful links

- application portal
- programme page
- fee structure URL
- student portal
- admissions portal
- official contact page
- scholarship page
- payment page
- other authoritative operational URLs

## 2.17 Other useful facts

The system should allow useful information that genuinely does not fit an existing controlled field, but this should be the exception rather than allowing the extractor to invent arbitrary schemas.

---

# 3. Working knowledge architecture

A major design principle is that **LLM extraction output is not automatically the final truth**.

Use distinct layers:

```text
RAW WEBSITE / SOURCE
        ↓
SOURCE PAGES
        ↓
PAGE EXTRACTION
        ↓
FACT CLAIMS
        ↓
NORMALIZATION
        ↓
ENTITY RESOLUTION
        ↓
DEDUPLICATION
        ↓
CONFLICT / TEMPORAL RESOLUTION
        ↓
CANONICAL FACTS
        ↓
SCHOOL PROFILE + EXACT LOOKUP + RAG
```

### Source page

The original evidence collected from the institution.

### Extracted claim

A statement that a particular source page appears to make.

Example:

```text
This page says the Nairobi Campus is non-residential.
```

### Canonical fact

The normalized, deduplicated and accepted value that the KB currently trusts.

Example:

```text
campus:nairobi
campus.residential = false
```

This distinction allows multiple pages to support one fact and allows conflicting/outdated claims to remain auditable without becoming current answers.

---

# 4. Canonical fact shape

Working mental model:

```text
SUBJECT + PREDICATE + VALUE + QUALIFIERS + TIME + EVIDENCE
```

Example:

```json
{
  "subject_id": "programme:example:bachelor-of-law",
  "predicate": "fee.tuition",
  "value": {
    "amount": 110000,
    "currency": "KES"
  },
  "qualifiers": {
    "billing_basis": "semester",
    "academic_year": "2026"
  }
}
```

Every accepted important fact should be traceable back to its original source evidence.

Desired trace:

```text
ANSWER
  ↓
CANONICAL FACT
  ↓
FACT SOURCE
  ↓
SOURCE PAGE
  ↓
ORIGINAL EVIDENCE
```

---

# 5. Controlled predicates and entities

The extractor should not invent a different schema for every institution.

Working top-level domains:

```text
institution.*
contact.*
campus.*
academic_unit.*
programme.*
admission.*
intake.*
fee.*
payment.*
financial_aid.*
accommodation.*
facility.*
student_life.*
student_service.*
leadership.*
calendar.*
policy.*
link.*
```

Canonical entity types initially include:

```text
institution
campus
academic_unit
programme
intake
fee
payment_method
financial_aid
accommodation
facility
student_service
policy
person
event
```

The extraction model should preferably choose from known predicates and known entities and only propose a new entity when required.

---

# 6. Source authority

Not every page should carry equal weight.

During discovery, sources should be categorized and assigned authority/confidence based on what they are.

Working example:

```text
100 = official dedicated source page
 90 = official department page
 80 = official programme page
 70 = current official homepage/campaign
 50 = official news/article content
 30 = old blog/archive content
 10 = repeated footer/sidebar/navigation content
```

Example source registry row:

```json
{
  "url": "https://example.edu/fees",
  "category": "fees",
  "authority": 100,
  "reason": "Official dedicated fee page",
  "active": true
}
```

These values are still provisional. The important idea is that conflict resolution should consider source authority and specificity rather than model confidence alone.

---

# 7. Deduplication and conflict handling

We should preserve repeated evidence without creating duplicate canonical facts.

Example:

```text
30 pages mention admissions@example.edu
        ↓
30 source claims
        ↓
1 canonical admissions-email fact
```

Two useful identifiers are proposed.

## Claim key

Includes the normalized value and identifies identical claims:

```text
subject + predicate + normalized value + identity qualifiers
```

## Slot key

Excludes the value and identifies facts competing for the same slot:

```text
subject + predicate + identity qualifiers
```

So:

```text
campus:nairobi | campus.residential | false
campus:nairobi | campus.residential | true
```

have different claim keys but the same slot key and therefore create a conflict.

Qualifiers such as programme, campus, academic year, intake or billing basis must prevent false deduplication.

---

# 8. Temporal information

Dates, fees, intakes, deadlines, programme status and payment information can change.

Historical facts should generally remain in the system rather than being deleted.

The KB should distinguish at least:

```text
current
historical
superseded
conflicting
```

The current answer layer should prefer facts whose temporal context applies to the student's question.

---

# 9. Proposed demo onboarding approach

For the demo, the easiest high-quality setup is:

```text
NEW INSTITUTION
      ↓
CHATGPT WORK / ONBOARDING AGENT
      ↓
DISCOVERY + ORGANIZATION
      ↓
STAGING TEMPLATE (SHEET)
      ↓
HUMAN VALIDATION
      ↓
N8N PUBLISH WORKFLOW
      ↓
SUPABASE
      ↓
EXACT LOOKUP + RAG + DEMO QA
```

This lets us prove the onboarding experience before building a dedicated admin product.

---

# 10. Role of the onboarding agent / ChatGPT Work

The agent acts as the **research and onboarding operator**, not as an unrestricted database administrator.

Given something like:

```json
{
  "institution": "Riara University",
  "website": "https://example.edu",
  "country": "Kenya"
}
```

it should:

1. identify/verify the official institution website,
2. discover important official pages,
3. map pages into source categories,
4. prioritize authoritative sources,
5. find programme/course information,
6. find fees,
7. find intakes and deadlines,
8. find admissions requirements,
9. find payment methods,
10. find campuses,
11. find contacts,
12. find financial aid/accommodation where available,
13. preserve URL/source evidence,
14. organize the findings into the onboarding template,
15. identify conflicts and uncertain values,
16. identify missing critical admissions information,
17. perform targeted follow-up discovery for gaps,
18. prepare the institution for human validation.

The agent must not fabricate missing information.

---

# 11. Proposed staging template

The staging sheet acts as the first version of the onboarding review UI.

Suggested tabs:

| Tab | Purpose |
| --- | --- |
| `Institution` | Institution identity and general information |
| `Sources` | Discovered URLs, source category and authority |
| `Campuses` | Campus information |
| `Academic Units` | Schools/faculties/departments |
| `Programmes` | Programme/course catalogue |
| `Intakes` | Intakes, dates and deadlines |
| `Fees` | Tuition and other fees |
| `Admissions` | Requirements, eligibility and application steps |
| `Payments` | Bank/M-Pesa/payment instructions |
| `Financial Aid` | Scholarships, bursaries, loans, grants |
| `Accommodation` | Accommodation information |
| `Contacts` | General/admissions/finance contacts |
| `Claims` | Additional structured facts |
| `Issues` | Conflicts, uncertainty and missing data |
| `QA` | Test questions and expected knowledge |

Every important row should retain its source URL and, where practical, supporting evidence text.

---

# 12. Human validation

For the demo, humans should not manually rebuild the institution profile.

The agent prepares it; the human primarily performs:

```text
Approve
Edit
Reject
Mark historical
Resolve conflict
```

Suggested review states:

```text
Pending
Approved
Rejected
Needs Review
Historical
```

Only approved/accepted data should be published as trusted knowledge.

High-risk data should receive extra review attention, especially:

- tuition/fees
- application deadlines
- intake dates
- bank account numbers
- M-Pesa paybills/tills
- payment URLs
- other operational values where a wrong answer could materially mislead a student

---

# 13. Publishing to Supabase

For the demo phase, avoid giving the research agent unrestricted direct SQL access.

Preferred responsibility split:

```text
Work / Agent = research + reasoning + organization
Sheet        = staging + review
n8n          = deterministic transform + publish
Supabase     = source of truth
```

The publishing workflow can read only approved rows and perform the required transformations.

Possible workflow name:

```text
Publish Institution KB
```

Input could be:

```json
{
  "institution": "Riara University",
  "onboarding_sheet_id": "..."
}
```

The workflow should then:

```text
Read approved rows
        ↓
Normalize values
        ↓
Resolve/upsert entities
        ↓
Upsert programmes
        ↓
Upsert campuses
        ↓
Upsert intakes
        ↓
Upsert fees
        ↓
Create/store fact claims
        ↓
Create/update canonical facts
        ↓
Preserve source relationships
        ↓
Generate retrieval documents/chunks
        ↓
Generate embeddings
        ↓
Store vectors
        ↓
Run readiness checks
```

---

# 14. Candidate database/storage layers

The final exact schema is still WIP, but the knowledge lifecycle needs concepts equivalent to:

```text
institutions / schools
source_registry
source_pages
page_extractions
entities
fact_definitions
fact_claims
canonical_facts
fact_sources
school_profiles
curated_documents / knowledge_chunks
qa_questions
qa_runs
```

The important separation is:

- source evidence is preserved,
- extraction is auditable,
- claims are not automatically truth,
- canonical facts are the trusted structured layer,
- RAG is generated from curated/trusted knowledge rather than being the only knowledge store.

---

# 15. RAG and embeddings

Embeddings remain useful, but they should not be responsible for exact operational facts that can be represented relationally.

Working retrieval model:

```text
USER QUESTION
      ↓
RETRIEVAL PLANNER
      ├── exact / structured lookup
      ├── semantic retrieval
      └── hybrid where necessary
```

Good structured lookup targets include:

- fees
- dates
- intakes
- duration
- programme availability
- payment methods
- contacts
- campus properties
- application links

RAG is stronger for:

- programme descriptions
- history/about material
- explanatory policy text
- student life
- detailed admissions guidance
- rich contextual information

Where possible, retrieval chunks should be generated from canonical/curated knowledge instead of blindly embedding noisy page layout.

---

# 16. QA during onboarding

Each institution should eventually have a small admissions test set.

Example questions:

```text
What programmes do you offer?
How much is the Data Science programme?
When is the next intake?
When is the application deadline?
How do I apply?
What documents do I need?
Can international students apply?
Which campus offers Nursing?
Can I study this programme online?
Can I pay via M-Pesa?
What is the paybill?
Do you provide accommodation?
Do you offer scholarships?
What is the admissions email?
```

QA should test:

- exact fact lookup
- semantic retrieval
- answer correctness
- source correctness
- missing-data behaviour
- conflict handling
- hallucination resistance

Possible readiness summary:

```text
Knowledge coverage:        94%
Critical admissions:      100%
QA accuracy:               98%
Unresolved conflicts:       2
Critical data gaps:         0

Status: READY FOR REVIEW
```

The exact thresholds are still to be defined.

---

# 17. Proposed onboarding lifecycle

Working lifecycle:

```text
1. Create institution
2. Verify institution/domain
3. Discover official sources
4. Categorize/score sources
5. Collect pages
6. Extract entities and claims
7. Assess coverage
8. Search specifically for missing information
9. Normalize values
10. Resolve entities
11. Deduplicate claims
12. Detect conflicts and historical values
13. Populate staging template
14. Human validation
15. Publish approved facts
16. Generate structured school profile
17. Generate/refresh RAG chunks and embeddings
18. Run QA
19. Investigate failures/gaps
20. Mark institution demo-ready
```

The discovery loop may run more than once:

```text
DISCOVER
   ↓
EXTRACT
   ↓
ASSESS COVERAGE
   ↓
DISCOVER MISSING DATA
   ↓
EXTRACT
   ↓
ASSESS AGAIN
```

---

# 18. Target demo experience

For demos, the operator should ideally only need to:

```text
1. Give the system the institution name/website
2. Let the onboarding agent discover and organize the KB
3. Review the staging sheet / flagged issues
4. Approve or correct important values
5. Run Publish Institution KB
6. Run admissions QA
7. Use the institution in the live demo
```

This is intentionally lighter than building a full production onboarding console.

---

# 19. Future evolution

## Demo / M0

```text
Agent / Work
    ↓
Staging Sheet
    ↓
Human validation
    ↓
n8n
    ↓
Supabase
```

## Later product version

Replace the sheet with an Admissions OS review UI:

```text
Onboarding Agent
       ↓
Admissions OS Review UI
       ↓
Human review where needed
       ↓
Supabase
```

## Mature version

High-confidence non-critical knowledge may eventually publish automatically while risky, ambiguous or conflicting facts are routed for review.

```text
Onboarding Agent
       ↓
High confidence / safe ─────────→ Publish
       ↓
Ambiguous / critical
       ↓
Human review
       ↓
Publish
```

---

# 20. Open design questions

These are intentionally not locked yet.

- Exact final ontology/predicate registry
- Exact database tables vs materialized views
- Whether staging uses Google Sheets, Airtable or a lightweight internal table
- How source authority should be scored automatically
- Which predicates may auto-publish
- Which predicates always require human approval
- Exact conflict-resolution scoring
- Entity alias/resolution rules
- How much page extraction runs inside n8n vs an agent tool
- Whether Work writes the staging template directly or calls an onboarding service
- Exact QA readiness thresholds
- Refresh/change-detection behaviour after initial onboarding
- How historical facts are surfaced in retrieval
- How the review process should work once the demo graduates into the main product

---

# 21. Current recommendation for the demo

Do **not** build the full production onboarding product yet.

For the current demo, prove this loop first:

```text
Institution URL
     ↓
Agent discovery
     ↓
Structured onboarding sheet
     ↓
Human validation
     ↓
One n8n publisher
     ↓
Supabase structured facts + RAG
     ↓
QA
     ↓
Demo-ready institution
```

If this works cleanly across several different institutions, we can then lock the ontology, replace the sheet with a first-party review UI, and formalize the workflow for the production Admissions OS.
