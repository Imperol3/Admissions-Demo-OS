-- 004_demo_chunk_staging.sql
--
-- Lightweight demo-first table for storing chunk-prep output directly from the
-- onboarding Google Sheet before we wire the full canonical/FK-heavy model.
--
-- Intended flow:
--   Google Sheet -> Chunk Prep -> embedding -> demo_chunk_staging
--
-- The `content` column is the text sent to the embedding model.
-- Supporting fields and provenance stay as top-level columns or `metadata`.

create extension if not exists vector;
create extension if not exists pgcrypto;

create table if not exists public.demo_chunk_staging (
  id uuid primary key default gen_random_uuid(),
  chunk_key text not null,
  institution_id text not null,
  page_url text,
  category text,
  entity_type text,
  entity_name text,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(1536),
  publish_ready boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep the demo simple but make common inspection/filtering fast.
create index if not exists demo_chunk_staging_institution_idx
  on public.demo_chunk_staging (institution_id);

create index if not exists demo_chunk_staging_category_idx
  on public.demo_chunk_staging (category);

create index if not exists demo_chunk_staging_chunk_key_idx
  on public.demo_chunk_staging (chunk_key);

-- Optional semantic-search index. It becomes useful once rows have embeddings.
create index if not exists demo_chunk_staging_embedding_hnsw_idx
  on public.demo_chunk_staging
  using hnsw (embedding vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- Sample record: RCM Online College — CPA
-- ---------------------------------------------------------------------------
-- This mirrors the format produced by the current `Chunk Prep` sheet.
-- `content` is what gets embedded.
-- `metadata` holds aliases, source URLs, source tabs, review state and notes.

insert into public.demo_chunk_staging (
  chunk_key,
  institution_id,
  page_url,
  category,
  entity_type,
  entity_name,
  content,
  metadata,
  publish_ready
)
select
  'RCM-PROG-CPA',
  'rcm-online-college',
  'https://rcmonlinecollege.co.ke/certified-public-accountants/',
  'programme',
  'programme',
  'Certified Public Accountants (CPA)',
  'Institution: RCM Online College. Category: Programme. Programme: Certified Public Accountants (CPA). Type: KASNEB professional qualification. Description: Professional accounting qualification preparing learners for accounting, audit, finance, tax and business advisory roles. Structure: Foundation, Intermediate and Advanced levels. Study mode: Flexible. Delivery: physical classes, live Zoom, online classes and pre-recorded sessions. Campus: Nairobi and online. Current intake: September–December 2026; status ongoing. Current tuition for September–December 2026: online KES 5,200 per unit; physical KES 7,000 per unit. Minimum entry: KCSE mean grade C+ (Plus), or a KASNEB diploma qualification, or any other recognized diploma. RCM is KASNEB-accredited for CPA. Exact class start date and enrollment cutoff were not published in the reviewed source.',
  jsonb_build_object(
    'keywords', jsonb_build_array(
      'CPA',
      'accounting',
      'KASNEB',
      'fees',
      'intake',
      'requirements',
      'online',
      'physical'
    ),
    'source_urls', jsonb_build_array(
      'https://rcmonlinecollege.co.ke/certified-public-accountants/',
      'https://rcmonlinecollege.co.ke/new-kasneb-syllabus-changes-coming-in-2027-what-students-need-to-know/',
      'https://kasneb.or.ke/cpa'
    ),
    'source_tabs', jsonb_build_array(
      'Programmes',
      'Fees',
      'Intakes',
      'Requirements'
    ),
    'review_status', 'Pending human review',
    'notes', 'Good candidate for one production programme chunk after approval.'
  ),
  false
where not exists (
  select 1
  from public.demo_chunk_staging
  where institution_id = 'rcm-online-college'
    and chunk_key = 'RCM-PROG-CPA'
);

-- ---------------------------------------------------------------------------
-- n8n mapping reference
-- ---------------------------------------------------------------------------
-- Google Sheet `Chunk Prep` row:
--
-- content       -> demo_chunk_staging.content
-- embedding     -> demo_chunk_staging.embedding
-- chunk_key     -> demo_chunk_staging.chunk_key
-- institution_id-> demo_chunk_staging.institution_id
-- page_url      -> demo_chunk_staging.page_url
-- category      -> demo_chunk_staging.category
-- entity_type   -> demo_chunk_staging.entity_type
-- entity_name   -> demo_chunk_staging.entity_name
-- publish_ready -> demo_chunk_staging.publish_ready
--
-- Suggested metadata object in n8n:
-- {
--   "keywords": ...,
--   "source_urls": ...,
--   "source_tabs": ...,
--   "review_status": ...,
--   "notes": ...
-- }
--
-- Only `content` should be sent to the embedding model.
