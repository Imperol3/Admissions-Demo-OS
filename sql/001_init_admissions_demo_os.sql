-- Admissions Demo OS
-- One-run PostgreSQL / Supabase bootstrap
--
-- Demo-first current-state architecture.
-- A scraped page is created or updated in source_pages; page history/versioning is
-- deliberately deferred until the production system needs it.
--
-- Creates:
--   1. demo_tenants
--   2. source_pages
--   3. programmes
--   4. programme_facts
--   5. knowledge_chunks
--   6. demo_messages
--   7. demo_runs
--   8. demo_evaluations
--
-- Plus pgvector, indexes, updated_at triggers, semantic retrieval and reset helpers.

begin;

create extension if not exists pgcrypto;
create extension if not exists vector;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

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
    status in ('created','onboarding','scraping','extracting','completed','failed')
  )
);

drop trigger if exists trg_demo_tenants_updated_at on public.demo_tenants;
create trigger trg_demo_tenants_updated_at
before update on public.demo_tenants
for each row execute function public.set_updated_at();

create table if not exists public.source_pages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.demo_tenants(id) on delete cascade,
  url text not null,
  title text,
  page_type text,
  raw_content text,
  structured_data jsonb,
  parser_status text,
  parser_errors jsonb not null default '[]'::jsonb,
  content_hash text,
  scraped_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint source_pages_tenant_url_unique unique (tenant_id, url)
);

create index if not exists source_pages_tenant_idx on public.source_pages (tenant_id);
create index if not exists source_pages_tenant_type_idx on public.source_pages (tenant_id, page_type);
create index if not exists source_pages_structured_data_gin_idx on public.source_pages using gin (structured_data);

drop trigger if exists trg_source_pages_updated_at on public.source_pages;
create trigger trg_source_pages_updated_at
before update on public.source_pages
for each row execute function public.set_updated_at();

create table if not exists public.programmes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.demo_tenants(id) on delete cascade,
  source_page_id uuid references public.source_pages(id) on delete set null,
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

create index if not exists programmes_tenant_idx on public.programmes (tenant_id);
create index if not exists programmes_tenant_name_idx on public.programmes (tenant_id, lower(name));
create index if not exists programmes_tenant_active_idx on public.programmes (tenant_id, active);

drop trigger if exists trg_programmes_updated_at on public.programmes;
create trigger trg_programmes_updated_at
before update on public.programmes
for each row execute function public.set_updated_at();

create table if not exists public.programme_facts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.demo_tenants(id) on delete cascade,
  programme_id uuid references public.programmes(id) on delete cascade,
  source_page_id uuid references public.source_pages(id) on delete set null,
  fact_type text not null,
  fact_key text not null,
  value_text text,
  value_number numeric,
  value_date date,
  currency text,
  unit text,
  metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists programme_facts_tenant_idx on public.programme_facts (tenant_id);
create index if not exists programme_facts_programme_idx on public.programme_facts (programme_id);
create index if not exists programme_facts_lookup_idx on public.programme_facts (tenant_id, fact_type, fact_key);
create index if not exists programme_facts_programme_lookup_idx on public.programme_facts (tenant_id, programme_id, fact_type, fact_key);
create index if not exists programme_facts_metadata_gin_idx on public.programme_facts using gin (metadata);

drop trigger if exists trg_programme_facts_updated_at on public.programme_facts;
create trigger trg_programme_facts_updated_at
before update on public.programme_facts
for each row execute function public.set_updated_at();

create table if not exists public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.demo_tenants(id) on delete cascade,
  page_id uuid references public.source_pages(id) on delete cascade,
  programme_id uuid references public.programmes(id) on delete set null,
  category text,
  entity_type text,
  entity_name text,
  fact_type text,
  fact_key text,
  content text not null,
  structured_value jsonb,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create index if not exists knowledge_chunks_tenant_idx on public.knowledge_chunks (tenant_id);
create index if not exists knowledge_chunks_tenant_category_idx on public.knowledge_chunks (tenant_id, category);
create index if not exists knowledge_chunks_programme_idx on public.knowledge_chunks (programme_id);
create index if not exists knowledge_chunks_page_idx on public.knowledge_chunks (tenant_id, page_id);
create index if not exists knowledge_chunks_entity_fact_idx on public.knowledge_chunks (tenant_id, entity_name, fact_type, fact_key);
create index if not exists knowledge_chunks_metadata_gin_idx on public.knowledge_chunks using gin (metadata);
create index if not exists knowledge_chunks_embedding_hnsw_idx
  on public.knowledge_chunks using hnsw (embedding vector_cosine_ops)
  where embedding is not null;

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

create index if not exists demo_messages_tenant_received_idx on public.demo_messages (tenant_id, received_at desc);
create index if not exists demo_messages_thread_idx on public.demo_messages (tenant_id, thread_id);

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
  constraint demo_runs_confidence_check check (confidence is null or (confidence >= 0 and confidence <= 1)),
  constraint demo_runs_decision_check check (decision is null or decision in ('reply','review','escalate','ignore')),
  constraint demo_runs_status_check check (status in ('started','completed','failed'))
);

create index if not exists demo_runs_tenant_started_idx on public.demo_runs (tenant_id, started_at desc);
create index if not exists demo_runs_message_idx on public.demo_runs (message_id);
create index if not exists demo_runs_type_idx on public.demo_runs (tenant_id, run_type, started_at desc);

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
  constraint demo_evaluations_score_check check (score is null or (score >= 0 and score <= 1))
);

create index if not exists demo_evaluations_tenant_idx on public.demo_evaluations (tenant_id, created_at desc);
create index if not exists demo_evaluations_run_idx on public.demo_evaluations (run_id);

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
  programme_id uuid,
  category text,
  entity_type text,
  entity_name text,
  fact_type text,
  fact_key text,
  content text,
  structured_value jsonb,
  metadata jsonb,
  similarity double precision
)
language sql
stable
as $$
  select
    kc.id, kc.page_id, kc.programme_id, kc.category,
    kc.entity_type, kc.entity_name, kc.fact_type, kc.fact_key,
    kc.content, kc.structured_value, kc.metadata,
    1 - (kc.embedding <=> p_query_embedding) as similarity
  from public.knowledge_chunks kc
  where kc.tenant_id = p_tenant_id
    and kc.embedding is not null
    and (p_category is null or kc.category = p_category)
    and (1 - (kc.embedding <=> p_query_embedding)) >= p_match_threshold
  order by kc.embedding <=> p_query_embedding
  limit greatest(p_match_count, 1);
$$;

create or replace function public.reset_demo_transient_state(p_tenant_id uuid)
returns jsonb
language plpgsql
as $$
declare
  v_evaluations_deleted integer := 0;
  v_runs_deleted integer := 0;
  v_messages_deleted integer := 0;
begin
  delete from public.demo_evaluations where tenant_id = p_tenant_id;
  get diagnostics v_evaluations_deleted = row_count;
  delete from public.demo_runs where tenant_id = p_tenant_id;
  get diagnostics v_runs_deleted = row_count;
  delete from public.demo_messages where tenant_id = p_tenant_id;
  get diagnostics v_messages_deleted = row_count;
  return jsonb_build_object(
    'tenant_id', p_tenant_id,
    'evaluations_deleted', v_evaluations_deleted,
    'runs_deleted', v_runs_deleted,
    'messages_deleted', v_messages_deleted
  );
end;
$$;

comment on table public.source_pages is
  'Current scraped and extracted state for each URL. Re-scrapes update the same row; page version history is deferred.';
comment on table public.programmes is
  'Structured programme directory used for exact lookup/entity resolution.';
comment on table public.programme_facts is
  'Flexible exact facts about programmes such as fees, intakes and requirements.';
comment on table public.knowledge_chunks is
  'Primary grounded retrieval/evidence layer. Rebuild a page''s chunks when that page changes.';

commit;
