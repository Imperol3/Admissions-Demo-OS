-- Admissions Demo OS
-- Migration: collapse source_page_versions into current-state source_pages.
--
-- Run this ONLY if an earlier version of 001_init_admissions_demo_os.sql was
-- already applied to the database.
--
-- The migration preserves the latest available scrape/extraction for each page,
-- maps source references to source_page_id, removes source_page_versions, and
-- updates the tenant onboarding status constraint.

begin;

-- Add current-state scrape/extraction fields directly to source_pages.
alter table public.source_pages add column if not exists raw_content text;
alter table public.source_pages add column if not exists structured_data jsonb;
alter table public.source_pages add column if not exists parser_status text;
alter table public.source_pages add column if not exists parser_errors jsonb not null default '[]'::jsonb;
alter table public.source_pages add column if not exists content_hash text;
alter table public.source_pages add column if not exists scraped_at timestamptz;

-- Copy the latest retained page version into source_pages before removing history.
do $$
begin
  if to_regclass('public.source_page_versions') is not null then
    update public.source_pages sp
    set
      raw_content = latest.raw_content,
      structured_data = latest.structured_data,
      parser_status = latest.parser_status,
      parser_errors = coalesce(latest.parser_errors, '[]'::jsonb),
      content_hash = latest.content_hash,
      scraped_at = latest.collected_at,
      updated_at = now()
    from (
      select distinct on (page_id)
        page_id,
        raw_content,
        structured_data,
        parser_status,
        parser_errors,
        content_hash,
        collected_at
      from public.source_page_versions
      order by page_id, is_current desc, collected_at desc
    ) latest
    where sp.id = latest.page_id;
  end if;
end;
$$;

-- Programmes now reference the current source page directly.
alter table public.programmes
  add column if not exists source_page_id uuid references public.source_pages(id) on delete set null;

do $$
begin
  if to_regclass('public.source_page_versions') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema='public' and table_name='programmes' and column_name='source_version_id'
     ) then
    update public.programmes p
    set source_page_id = spv.page_id
    from public.source_page_versions spv
    where p.source_version_id = spv.id
      and p.source_page_id is null;
  end if;
end;
$$;

-- Programme facts now reference the current source page directly.
alter table public.programme_facts
  add column if not exists source_page_id uuid references public.source_pages(id) on delete set null;

do $$
begin
  if to_regclass('public.source_page_versions') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema='public' and table_name='programme_facts' and column_name='source_version_id'
     ) then
    update public.programme_facts pf
    set source_page_id = spv.page_id
    from public.source_page_versions spv
    where pf.source_version_id = spv.id
      and pf.source_page_id is null;
  end if;
end;
$$;

-- knowledge_chunks already had page_id; populate it from source_version_id if needed.
do $$
begin
  if to_regclass('public.source_page_versions') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema='public' and table_name='knowledge_chunks' and column_name='source_version_id'
     ) then
    update public.knowledge_chunks kc
    set page_id = spv.page_id
    from public.source_page_versions spv
    where kc.source_version_id = spv.id
      and kc.page_id is null;
  end if;
end;
$$;

-- Old retrieval function returned source_version_id, so recreate it later.
drop function if exists public.match_knowledge_chunks(uuid, vector, integer, double precision, text);

-- Remove version references from downstream tables.
alter table public.programmes drop column if exists source_version_id;
alter table public.programme_facts drop column if exists source_version_id;
alter table public.knowledge_chunks drop column if exists source_version_id;

-- Remove the version table after current state has been copied/mapped.
drop table if exists public.source_page_versions cascade;

-- Align old tenant statuses to the simplified onboarding lifecycle.
update public.demo_tenants
set status = case
  when status = 'crawling' then 'scraping'
  when status in ('embedding', 'validating', 'ready') then 'completed'
  else status
end
where status in ('crawling', 'embedding', 'validating', 'ready');

alter table public.demo_tenants
  drop constraint if exists demo_tenants_status_check;

alter table public.demo_tenants
  add constraint demo_tenants_status_check
  check (status in ('created','onboarding','scraping','extracting','completed','failed'));

-- Ensure the newer knowledge-chunk metadata columns exist if migrating from the
-- earliest bootstrap.
alter table public.knowledge_chunks add column if not exists entity_type text;
alter table public.knowledge_chunks add column if not exists entity_name text;
alter table public.knowledge_chunks add column if not exists fact_type text;
alter table public.knowledge_chunks add column if not exists fact_key text;
alter table public.knowledge_chunks add column if not exists structured_value jsonb;

create index if not exists source_pages_structured_data_gin_idx
  on public.source_pages using gin (structured_data);
create index if not exists knowledge_chunks_page_idx
  on public.knowledge_chunks (tenant_id, page_id);
create index if not exists knowledge_chunks_entity_fact_idx
  on public.knowledge_chunks (tenant_id, entity_name, fact_type, fact_key);

-- Recreate semantic retrieval without source_version_id.
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
    kc.id,
    kc.page_id,
    kc.programme_id,
    kc.category,
    kc.entity_type,
    kc.entity_name,
    kc.fact_type,
    kc.fact_key,
    kc.content,
    kc.structured_value,
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

comment on table public.source_pages is
  'Current scraped and extracted state for each URL. Re-scrapes update the same row; page version history is deferred.';

commit;
