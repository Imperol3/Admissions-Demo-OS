-- Admissions Demo OS
-- One-run PostgreSQL / Supabase bootstrap
--
-- Creates:
--   1. demo_tenants
--   2. source_pages
--   3. source_page_versions
--   4. programmes
--   5. programme_facts
--   6. knowledge_chunks
--   7. demo_messages
--   8. demo_runs
--   9. demo_evaluations
--
-- Plus:
--   - pgvector extension
--   - useful indexes
--   - updated_at trigger helper
--   - tenant-scoped semantic retrieval function
--   - demo transient-state reset function
--
-- Designed to be safe to run more than once.

begin;

-- -----------------------------------------------------------------------------
-- Extensions
-- -----------------------------------------------------------------------------

create extension if not exists pgcrypto;
create extension if not exists vector;

-- -----------------------------------------------------------------------------
-- Generic updated_at helper
-- -----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 1. demo_tenants
-- One row = one institution/demo workspace.
-- -----------------------------------------------------------------------------

create table if not exists public.demo_tenants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  website text not null,
  status text not null default 'created',
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint demo_tenants_status_check check (
    status in (
      'created',
      'crawling',
      'extracting',
      'embedding',
      'validating',
      'ready',
      'failed'
    )
  )
);

drop trigger if exists trg_demo_tenants_updated_at on public.demo_tenants;
create trigger trg_demo_tenants_updated_at
before update on public.demo_tenants
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 2. source_pages
-- Canonical pages discovered for an institution.
-- -----------------------------------------------------------------------------

create table if not exists public.source_pages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.demo_tenants(id) on delete cascade,
  url text not null,
  title text,
  page_type text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint source_pages_tenant_url_unique unique (tenant_id, url)
);

create index if not exists source_pages_tenant_idx
  on public.source_pages (tenant_id);

create index if not exists source_pages_tenant_type_idx
  on public.source_pages (tenant_id, page_type);

drop trigger if exists trg_source_pages_updated_at on public.source_pages;
create trigger trg_source_pages_updated_at
before update on public.source_pages
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3. source_page_versions
-- Every collection/extraction can be retained instead of overwriting history.
-- structured_data stores the full normalized parser/extractor output.
-- -----------------------------------------------------------------------------

create table if not exists public.source_page_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.demo_tenants(id) on delete cascade,
  page_id uuid not null references public.source_pages(id) on delete cascade,
  content_hash text,
  raw_content text,
  structured_data jsonb,
  parser_status text,
  parser_errors jsonb not null default '[]'::jsonb,
  is_current boolean not null default true,
  collected_at timestamptz not null default now()
);

create index if not exists source_page_versions_tenant_idx
  on public.source_page_versions (tenant_id);

create index if not exists source_page_versions_page_idx
  on public.source_page_versions (page_id, collected_at desc);

create index if not exists source_page_versions_current_idx
  on public.source_page_versions (tenant_id, page_id, is_current);

create index if not exists source_page_versions_structured_data_gin_idx
  on public.source_page_versions using gin (structured_data);

-- -----------------------------------------------------------------------------
-- 4. programmes
-- Structured programme directory.
-- Kept for exact lookup, entity resolution, validation and future UI/reporting.
-- knowledge_chunks remains the primary grounded retrieval/evidence layer.
-- -----------------------------------------------------------------------------

create table if not exists public.programmes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.demo_tenants(id) on delete cascade,
  source_version_id uuid references public.source_page_versions(id) on delete set null,
  name text not null,
  parent_programme text,
  programme_type text,
  qualification text,
  description text,
  duration_value numeric,
  duration_unit text,
  study_mode text,
  delivery_mode text,
  application_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists programmes_tenant_idx
  on public.programmes (tenant_id);

create index if not exists programmes_tenant_name_idx
  on public.programmes (tenant_id, lower(name));

create index if not exists programmes_tenant_active_idx
  on public.programmes (tenant_id, active);

drop trigger if exists trg_programmes_updated_at on public.programmes;
create trigger trg_programmes_updated_at
before update on public.programmes
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 5. programme_facts
-- Flexible structured facts related to programmes.
-- Avoids creating separate schema tables for every admissions fact type.
-- Examples: fee, intake, requirement, application, scholarship, location.
-- -----------------------------------------------------------------------------

create table if not exists public.programme_facts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.demo_tenants(id) on delete cascade,
  programme_id uuid references public.programmes(id) on delete cascade,
  source_version_id uuid references public.source_page_versions(id) on delete set null,
  fact_type text not null,
  fact_key text not null,
  value_text text,
  value_number numeric,
  value_date date,
  currency text,
  unit text,
  metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists programme_facts_tenant_idx
  on public.programme_facts (tenant_id);

create index if not exists programme_facts_programme_idx
  on public.programme_facts (programme_id);

create index if not exists programme_facts_lookup_idx
  on public.programme_facts (tenant_id, fact_type, fact_key);

create index if not exists programme_facts_programme_lookup_idx
  on public.programme_facts (tenant_id, programme_id, fact_type, fact_key);

create index if not exists programme_facts_metadata_gin_idx
  on public.programme_facts using gin (metadata);

-- -----------------------------------------------------------------------------
-- 6. knowledge_chunks
-- Primary retrieval/evidence layer for the Admissions Brain.
-- Supports semantic search, source traceability and optional programme scoping.
--
-- embedding dimension = 1536 for text-embedding-3-small.
-- Change this only if the embedding model/dimension is deliberately changed.
-- -----------------------------------------------------------------------------

create table if not exists public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.demo_tenants(id) on delete cascade,
  page_id uuid references public.source_pages(id) on delete cascade,
  source_version_id uuid references public.source_page_versions(id) on delete cascade,
  programme_id uuid references public.programmes(id) on delete set null,
  category text,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create index if not exists knowledge_chunks_tenant_idx
  on public.knowledge_chunks (tenant_id);

create index if not exists knowledge_chunks_tenant_category_idx
  on public.knowledge_chunks (tenant_id, category);

create index if not exists knowledge_chunks_programme_idx
  on public.knowledge_chunks (programme_id);

create index if not exists knowledge_chunks_metadata_gin_idx
  on public.knowledge_chunks using gin (metadata);

-- HNSW index for cosine similarity. Suitable for semantic retrieval as data grows.
create index if not exists knowledge_chunks_embedding_hnsw_idx
  on public.knowledge_chunks
  using hnsw (embedding vector_cosine_ops)
  where embedding is not null;

-- -----------------------------------------------------------------------------
-- 7. demo_messages
-- Normalized inbound enquiry used by email/chat/manual demo simulations.
-- -----------------------------------------------------------------------------

create table if not exists public.demo_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.demo_tenants(id) on delete cascade,
  external_message_id text,
  thread_id text,
  sender text,
  recipient text,
  subject text,
  body text not null,
  channel text not null default 'email',
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists demo_messages_tenant_received_idx
  on public.demo_messages (tenant_id, received_at desc);

create index if not exists demo_messages_thread_idx
  on public.demo_messages (tenant_id, thread_id);

-- -----------------------------------------------------------------------------
-- 8. demo_runs
-- Full execution trace for every Ask Admissions / Process Email / Retrieval run.
-- This is the main debugging and demo-observability record.
-- -----------------------------------------------------------------------------

create table if not exists public.demo_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.demo_tenants(id) on delete cascade,
  message_id uuid references public.demo_messages(id) on delete set null,
  run_type text not null,
  input jsonb not null,
  interpretation jsonb,
  classification jsonb,
  retrieval_plan jsonb,
  exact_results jsonb,
  semantic_results jsonb,
  selected_evidence jsonb,
  generated_response text,
  decision text,
  confidence numeric,
  rationale text,
  sources jsonb,
  prompt_version text,
  workflow_version text,
  model_info jsonb,
  status text not null default 'started',
  error jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,

  constraint demo_runs_confidence_check check (
    confidence is null or (confidence >= 0 and confidence <= 1)
  ),
  constraint demo_runs_decision_check check (
    decision is null or decision in ('reply', 'review', 'escalate', 'ignore')
  ),
  constraint demo_runs_status_check check (
    status in ('started', 'completed', 'failed')
  )
);

create index if not exists demo_runs_tenant_started_idx
  on public.demo_runs (tenant_id, started_at desc);

create index if not exists demo_runs_message_idx
  on public.demo_runs (message_id);

create index if not exists demo_runs_type_idx
  on public.demo_runs (tenant_id, run_type, started_at desc);

-- -----------------------------------------------------------------------------
-- 9. demo_evaluations
-- Regression/testing layer. Created now so it is ready when systematic evals start.
-- -----------------------------------------------------------------------------

create table if not exists public.demo_evaluations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.demo_tenants(id) on delete cascade,
  run_id uuid not null references public.demo_runs(id) on delete cascade,
  test_name text,
  expected_intent text,
  expected_decision text,
  expected_facts jsonb,
  classification_correct boolean,
  retrieval_correct boolean,
  grounded boolean,
  routing_correct boolean,
  answer_correct boolean,
  score numeric,
  reviewer_notes text,
  created_at timestamptz not null default now(),

  constraint demo_evaluations_score_check check (
    score is null or (score >= 0 and score <= 1)
  )
);

create index if not exists demo_evaluations_tenant_idx
  on public.demo_evaluations (tenant_id, created_at desc);

create index if not exists demo_evaluations_run_idx
  on public.demo_evaluations (run_id);

-- -----------------------------------------------------------------------------
-- Semantic retrieval helper
-- Tenant scoping is mandatory.
-- Optional category allows the Retrieval Tool to narrow the search.
-- Returns cosine similarity where 1.0 is closest.
-- -----------------------------------------------------------------------------

create or replace function public.match_knowledge_chunks(
  p_tenant_id uuid,
  p_query_embedding vector(1536),
  p_match_count integer default 8,
  p_match_threshold double precision default 0.0,
  p_category text default null
)
returns table (
  id uuid,
  page_id uuid,
  source_version_id uuid,
  programme_id uuid,
  category text,
  content text,
  metadata jsonb,
  similarity double precision
)
language sql
stable
as $$
  select
    kc.id,
    kc.page_id,
    kc.source_version_id,
    kc.programme_id,
    kc.category,
    kc.content,
    kc.metadata,
    1 - (kc.embedding <=> p_query_embedding) as similarity
  from public.knowledge_chunks kc
  where kc.tenant_id = p_tenant_id
    and kc.embedding is not null
    and (p_category is null or kc.category = p_category)
    and (1 - (kc.embedding <=> p_query_embedding)) >= p_match_threshold
  order by kc.embedding <=> p_query_embedding
  limit greatest(p_match_count, 1);
$$;

-- -----------------------------------------------------------------------------
-- Demo reset helper
-- Clears transient demo/test state while preserving institution knowledge.
-- -----------------------------------------------------------------------------

create or replace function public.reset_demo_transient_state(
  p_tenant_id uuid
)
returns jsonb
language plpgsql
as $$
declare
  v_evaluations_deleted integer := 0;
  v_runs_deleted integer := 0;
  v_messages_deleted integer := 0;
begin
  delete from public.demo_evaluations
  where tenant_id = p_tenant_id;
  get diagnostics v_evaluations_deleted = row_count;

  delete from public.demo_runs
  where tenant_id = p_tenant_id;
  get diagnostics v_runs_deleted = row_count;

  delete from public.demo_messages
  where tenant_id = p_tenant_id;
  get diagnostics v_messages_deleted = row_count;

  return jsonb_build_object(
    'tenant_id', p_tenant_id,
    'evaluations_deleted', v_evaluations_deleted,
    'runs_deleted', v_runs_deleted,
    'messages_deleted', v_messages_deleted
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Helpful comments
-- -----------------------------------------------------------------------------

comment on table public.demo_tenants is
  'One tenant/institution per demo workspace.';

comment on table public.source_page_versions is
  'Versioned raw + structured extraction output. Do not overwrite prior captures.';

comment on table public.programmes is
  'Structured programme directory used for exact lookup/entity resolution; not the sole AI evidence source.';

comment on table public.programme_facts is
  'Flexible exact facts about programmes such as fees, intakes and requirements.';

comment on table public.knowledge_chunks is
  'Primary grounded retrieval/evidence layer for semantic RAG and answer generation.';

comment on table public.demo_runs is
  'Inspectable execution trace for every demo AI run.';

commit;

-- -----------------------------------------------------------------------------
-- QUICK START EXAMPLES (do not run automatically)
-- -----------------------------------------------------------------------------
--
-- Create a demo tenant:
--
-- insert into public.demo_tenants (slug, name, website, config)
-- values (
--   'moringa-school',
--   'Moringa School',
--   'https://moringaschool.com',
--   '{"country":"Kenya","default_currency":"KES","reply_mode":"draft_only"}'::jsonb
-- )
-- returning *;
--
-- Semantic retrieval:
--
-- select *
-- from public.match_knowledge_chunks(
--   '<TENANT_UUID>'::uuid,
--   '<1536-DIMENSION-QUERY-EMBEDDING>'::vector,
--   8,
--   0.45,
--   null
-- );
--
-- Reset only demo messages/runs/evaluations:
--
-- select public.reset_demo_transient_state('<TENANT_UUID>'::uuid);
