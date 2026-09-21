# `DEMO — Create Institution` — Workflow & Node Plan

## Status

Design plan only. No n8n workflow has been built or imported from this document. It turns the existing contracts — [`N8N-WORKFLOWS.md`](../N8N-WORKFLOWS.md) §1, [`EXTRACTION-PIPELINE.md`](EXTRACTION-PIPELINE.md), [`EXTRACTED-FACTS.md`](EXTRACTED-FACTS.md), [`CANONICAL-DATA-MODEL.md`](CANONICAL-DATA-MODEL.md), [`READINESS-RULES.md`](READINESS-RULES.md) and the `schemas/onboarding/` JSON Schemas — into a concrete n8n node graph, following the node conventions already used in [`workflows/n8n/admissions-os.json`](../../workflows/n8n/admissions-os.json) and [`retrieval.json`](../../workflows/n8n/retrieval.json) (OpenRouter chat model + structured output parser for classification, LangChain agent for generation, Postgres nodes for persistence).

This is the "main onboarding agent": the one workflow a prospect demo depends on to turn `{institution_name, website}` into a ready tenant with zero code changes, per the repository's central rule.

## Orchestration shape

One parent workflow, five sub-workflows, matching the naming convention already reserved in `N8N-WORKFLOWS.md` §9:

```text
DEMO — Create Institution                     (parent / orchestrator)
  ├── DEMO SUB — Crawl Website
  ├── DEMO SUB — Extract Page                 (Stage 1 + Stage 2, per page)
  ├── DEMO SUB — Resolve & Reconcile Entities  (Stage 3 + Stage 4, per run)
  ├── DEMO SUB — Write Canonical Records       (Stage 5)
  ├── DEMO SUB — Embed Chunks
  └── DEMO SUB — Validate Tenant               (Stage 6, calls DEMO — Retrieval Tool)
```

Splitting into sub-workflows keeps each one independently testable from the n8n editor (matching `IMPLEMENTATION-PLAN.md`'s "useful testing capability as early as possible") and lets `Extract Page` run inside a `Split In Batches` loop without bloating the parent graph.

---

## Parent workflow: `DEMO — Create Institution`

Trigger: **Webhook** (`POST /demo/create-institution`), input per `N8N-WORKFLOWS.md` §1.

| # | Node | Type | Purpose |
|---|------|------|---------|
| 1 | `Webhook — create institution` | `webhook` | Entry point, accepts `{institution_name, website, slug, config}` |
| 2 | `Normalize Input` | `set` | Derive `slug` if absent, default `config.country`/`config.default_currency`, generate `onboarding_run_id` (`RUN-<uuid>`) |
| 3 | `Validate Input` | `if` | Require `institution_name` + `website`; fail branch returns `{status:"failed", stage:"validate_input", errors:[...]}` immediately |
| 4 | `Upsert demo_tenants` | `postgres` | Insert or update on `slug` conflict; `status='onboarding'`; returns `tenant_id` |
| 5 | `Build envelope` | `set` | `{tenant_id, institution_id: slug, onboarding_run_id}` — the Stage 0 envelope attached to every downstream call |
| 6 | `Set status = scraping` | `postgres` | Update `demo_tenants.status` |
| 7 | `DEMO SUB — Crawl Website` | `executeWorkflow` | Input `{website, tenant_id}` → output `pages[]` |
| 8 | `Set status = extracting` | `postgres` | Update `demo_tenants.status` |
| 9 | `Loop Over Pages` | `splitInBatches` | Batch size ~5, iterate `pages[]` |
| 10 | `DEMO SUB — Extract Page` | `executeWorkflow` | Per page → `{source_page, facts[]}` |
| 11 | `Upsert source_pages` | `postgres` | Key `(tenant_id, url)`; write `raw_content`, `page_type`, `structured_data`, `content_hash`, `parser_status`, `scraped_at` |
| 12 | `Insert extracted_facts` | `postgres` | Batch insert Stage 2 observations (requires the `extracted_facts` table — see **Open items**) |
| 13 | *(loop back to 9 until pages exhausted)* | | |
| 14 | `DEMO SUB — Resolve & Reconcile Entities` | `executeWorkflow` | Stage 3 + 4 over the whole run → `{accepted[], conflicts[]}` |
| 15 | `DEMO SUB — Write Canonical Records` | `executeWorkflow` | Stage 5 → upserts `programmes`/`programme_facts`, returns counts |
| 16 | `Set status = completed` | `postgres` | Marks the Onboarding V1 boundary from `DATA-MODEL.md` (structured extraction done) |
| 17 | `DEMO SUB — Embed Chunks` | `executeWorkflow` | Rebuild `knowledge_chunks` for touched pages, embed, insert |
| 18 | `DEMO SUB — Validate Tenant` | `executeWorkflow` | Stage 6 → `{checks, blocking_gaps, warning_gaps, unresolved_conflicts, ready_for_publish}` |
| 19 | `ready_for_publish?` | `if` | Branches to success/failure response |
| 20a | `Set status = ready / ready_with_warnings` + `Build success response` | `postgres` + `set` | Per `N8N-WORKFLOWS.md` §1 output shape |
| 20b | `Set status = failed` + `Build failure response` | `postgres` + `set` | `{status:"failed", stage, errors}` |
| 21 | `Respond to Webhook` | `respondToWebhook` | Returns the final JSON |

**Error handling:** bind an error workflow (same pattern as the existing `wgIupwopCVUf5TLs` reference in `admissions-os.json`) that catches any node failure, writes `demo_tenants.status='failed'` with the failing stage name and error detail, and stops — so a crawl timeout or a bad LLM response never silently reports `ready`. This is the direct implementation of the `IMPLEMENTATION-PLAN.md` Phase 1 acceptance criterion "Failed stages are visible rather than hidden" and the pipeline's failure contract (`success|partial|failed|needs_review`, never silently promoted).

---

## Sub-workflow: `DEMO SUB — Crawl Website`

Input `{website, tenant_id}` → output `pages[]: {url, title, raw_content, content_hash, http_status}`.

1. `Execute Workflow Trigger`
2. `Fetch sitemap.xml` (`httpRequest`, `continueOnFail=true`)
3. `sitemap found?` (`if`) → parse `<loc>` entries; else fall back to `HTML Extract` on the homepage for `a[href]`
4. `Normalize + dedupe URLs` (`code`) — resolve relative links, restrict to the same registrable domain, strip fragments/query noise
5. `Prioritize URLs` (`chainLlm` + `outputParserStructured`, OpenRouter) — given path/title candidates, rank and cap the list (e.g. top ~60) toward admissions-relevant sections (programmes, fees, admissions, requirements, apply, faq, contact) — same pattern as the existing `classify email` node
6. `Loop Over Candidate URLs` (`splitInBatches`)
7. `Fetch page` (`httpRequest`, `continueOnFail=true`, timeout set, restricted to `http(s)` + same domain to avoid SSRF via redirects)
8. `Extract clean text` (`htmlExtract` / `markdown`)
9. `Hash content` (`code`) — sha256 of cleaned text, used for idempotent re-scrape detection against `source_pages.content_hash`
10. `Aggregate` → `pages[]`

## Sub-workflow: `DEMO SUB — Extract Page`

Input `{tenant_id, institution_id, onboarding_run_id, url, title, raw_content}` → output `{source_page, facts[]}`.

1. `Execute Workflow Trigger`
2. `classify page` (`lmChatOpenRouter` + `outputParserStructured`) — Stage 1 contract, schema `01-source-classification.schema.json`
3. `next_action?` (`switch`: `process` / `skip` / `review`)
   - `skip` → short-circuit, `parser_status='skipped'`, `facts=[]`
   - `review` → persist the page but return `facts=[]` and flag for the human review queue; no canonical writes downstream
   - `process` → continue
4. `extract facts` (`lmChatOpenRouter` + `outputParserStructured`) — Stage 2 contract, schema `02-fact-extraction.schema.json`; use a stronger/longer-context model than the Stage 1 classifier since page content can be long
5. `Stamp envelope` (`code`) — attach `tenant_id`/`institution_id`/`onboarding_run_id`/source reference to every fact, set `parser_status='success'`

## Sub-workflow: `DEMO SUB — Resolve & Reconcile Entities`

Input `{tenant_id, institution_id, onboarding_run_id}` → output `{accepted[], conflicts[]}`. Runs once per run, after all pages are processed, so entity matching sees the full candidate set.

1. `Execute Workflow Trigger`
2. `Select unresolved extracted_facts` (`postgres`) for this run
3. `Select existing canonical programmes/programme_facts` (`postgres`) for the tenant (context for matching)
4. `Group by temporary_entity_id` (`code`)
5. `Loop Over Candidate Entities` (`splitInBatches`)
6. `resolve entity` (`lmChatOpenRouter` + `outputParserStructured`) — Stage 3 contract (`matched`/`new_entity`/`ambiguous`/`needs_review`), schema `03-entity-resolution.schema.json`; resolved within `tenant_id` only, never merges purely on name similarity
7. `Diff field values` (`code`) — deterministic comparison against the existing canonical value and any other observation from this run for the same entity+field → `unique`/`match`/`conflict`, per `EXTRACTED-FACTS.md`. Reserve an LLM `reconcile field` step (Stage 4) only for ambiguous prose fields the deterministic diff can't resolve.
8. `conflict?` (`if`) → insert/update a `conflicts` row (`needs_review`, both observations retained); otherwise update `extracted_facts.resolution_status='accepted'`
9. `Aggregate` → `{accepted[], conflicts[]}`

## Sub-workflow: `DEMO SUB — Write Canonical Records`

Input `{tenant_id, institution_id, onboarding_run_id, accepted[]}` → output per-entity-type counts.

1. `Execute Workflow Trigger`
2. `Loop by entity_type` (`splitInBatches`: programme / fee / intake / requirement / application_process / faq_policy / contact_location / scholarship)
3. `Upsert programmes` (`postgres`) — idempotent on `(tenant_id, canonical_entity_id)` for `entity_type='programme'`
4. `Upsert programme_facts` (`postgres`) — idempotent on `(tenant_id, programme_id, fact_type, fact_key, scope)` for fee/intake/requirement/application/scholarship types; richer canonical fields (billing basis, mandatory flag, accepted alternatives, etc.) go into `metadata jsonb`, per the `CANONICAL-DATA-MODEL.md` runtime-storage-mapping note
5. `Close provenance loop` (`postgres`) — write back `canonical_entity_id`/`canonical_table` onto the source `extracted_facts` rows
6. `Aggregate` → `{programmes, fees, intakes, requirements, ...}` for the final response summary

Idempotency here is load-bearing: re-running the same onboarding content must not create duplicate active entities (`EXTRACTION-PIPELINE.md` Stage 5 rule).

## Sub-workflow: `DEMO SUB — Embed Chunks`

Input `{tenant_id, touched_page_ids[]}` → output `{knowledge_chunks: N}`.

1. `Execute Workflow Trigger`
2. `Delete stale chunks` (`postgres`) — `DELETE FROM knowledge_chunks WHERE page_id IN (...)`, rebuild-not-append, per `DATA-MODEL.md`'s re-scrape behaviour
3. `Select touched pages + canonical facts` (`postgres`)
4. `Build chunks` (`code`) — one chunk per section/fact cluster; fields mirror the `demo_chunk_staging` conventions (`content`, `category`, `entity_type`, `entity_name`, `fact_type`, `fact_key`, `metadata.keywords/source_urls/review_status`)
5. `Loop Over Chunks` (`splitInBatches`)
6. `Embed content` (OpenRouter embeddings, `openai/text-embedding-3-small`, 1536-dim) — same model/dimension as `retrieval.json`'s `embedd email` node, so query and chunk embeddings stay compatible
7. `Insert knowledge_chunks` (`postgres`)

## Sub-workflow: `DEMO SUB — Validate Tenant`

Input `{tenant_id, institution_id, onboarding_run_id}` → output the Stage 6 readiness object.

1. `Execute Workflow Trigger`
2. `Select in-scope programmes/facts/conflicts` (`postgres`)
3. `Evaluate programme gates` (`code`) — deterministic check of the `READINESS-RULES.md` gate list (`identity_complete`, `duration_complete`, `study_delivery_mode_complete`, `fee_complete`, `current_intake_complete`, `requirements_complete`, `application_process_complete`, `contact_or_location_complete`, `policy_or_faq_coverage`, `sources_verified`, `conflicts_resolved`) from field presence and `data_status`
4. `Smoke-test retrieval` (`executeWorkflow` → `DEMO — Retrieval Tool` / `retrieval.json`) — 2–3 canned queries built from the tenant's own top programmes; `kb_tests_passed` = `sufficient=true` on all of them
5. `Aggregate readiness` (`code`) — combine programme gates + institution-level gate from `READINESS-RULES.md` ("all in-scope programmes pass blocking gates AND no unresolved blocking conflicts AND KB embedded AND KB tests pass AND routing/fallback passes AND human approval") → `ready_for_publish`, `blocking_gaps[]`, `warning_gaps[]`
6. Return the readiness object to the parent for the final response

Human approval is listed in `READINESS-RULES.md` as part of the institution-level gate but is explicitly out of scope for the automated run — the workflow should report `ready_for_publish` from the automatable checks and leave the human-approval flag for the operator console (Phase 5), not block the pipeline on it.

---

## Open items before this can be built

These are gaps between the current schema/repo state and what this plan assumes. Flagging them rather than resolving them silently, per the repo's own extraction rule.

1. **`extracted_facts` table does not exist yet.** `EXTRACTED-FACTS.md` specifies the DDL; it needs a migration (next number after `sql/005_demo_chunk_retrieval.sql`) before Stage 2A can persist anything.
2. **No `conflicts` table exists.** Needed to hold `conflict` records from Stage 3/4 for the `Conflicts & Review` surface instead of silently picking a winner.
3. **No onboarding-run trace table.** `EXTRACTION-PIPELINE.md`'s persistence boundary lists `onboarding_runs` (stage-level trace + readiness) as recommended. The repo currently only has `demo_runs`, which is shaped for ask/email runs (`interpretation`, `classification`, `decision`...), not onboarding stages. Recommend either a small dedicated `onboarding_runs` table or reusing `demo_runs` with `run_type='onboarding'` and stage data folded into `input`/`status`/`error` — worth a decision before implementation, not during it.
4. **`demo_tenants.status` vs. readiness.** `DATA-MODEL.md` treats `completed` as the end of Onboarding V1 (structured extraction only), while `N8N-WORKFLOWS.md` and `IMPLEMENTATION-PLAN.md` Phase 1 want the same workflow to carry through chunking/embedding/validation to a `ready`/`ready_with_warnings` outcome. Recommendation: keep `status` as the coarse lifecycle column (`created → onboarding → scraping → extracting → completed → failed`) and add a separate `readiness_status` column (`not_ready | ready | ready_with_warnings | failed`) set by `DEMO SUB — Validate Tenant`, rather than overloading one enum with two different concerns.
5. **Crawling mechanism.** This plan uses only built-in n8n nodes (`httpRequest` + `htmlExtract`) to avoid a new integration/credential, matching the "no new integration work per demo" philosophy. A dedicated crawl service (Firecrawl, Apify, etc.) would crawl more reliably (JS-rendered sites, rate limiting) but is an explicit trade-off to confirm before building.
6. **Model choice per stage.** Stage 1 classification should reuse a fast/cheap model (as `classify email` does today); Stage 2 extraction and Stage 3 resolution need a stronger model given longer context and judgment calls. Exact model IDs are an implementation-time decision, not fixed here.

## Traceability to `IMPLEMENTATION-PLAN.md` Phase 1 acceptance criteria

| Criterion | Covered by |
|---|---|
| A new institution can be created from name + website | Parent nodes 1–4 |
| No code changes required per institution | Entire design — config-only, per-tenant data |
| Source pages are stored | `Extract Page` sub-workflow → `Upsert source_pages` |
| Extracted records retain source provenance | `extracted_facts` staging layer + `canonical_entity_id`/`canonical_table` closeout |
| Chunks are embedded | `DEMO SUB — Embed Chunks` |
| A readiness summary is returned | `DEMO SUB — Validate Tenant` output, surfaced in the webhook response |
| Failed stages are visible rather than hidden | Error-workflow binding + explicit `status='failed'` + `stage`/`errors` in the response |
