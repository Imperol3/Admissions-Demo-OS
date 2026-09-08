-- Admissions Demo OS
-- Fast semantic retrieval for demo_chunk_staging
--
-- Expects query embeddings with 1536 dimensions (text-embedding-3-small).

create or replace function public.match_demo_chunk_staging(
  query_embedding vector(1536),
  match_count integer default 5,
  filter_institution_id text default null,
  filter_category text default null,
  min_similarity double precision default 0
)
returns table (
  id uuid,
  chunk_key text,
  institution_id text,
  page_url text,
  category text,
  entity_type text,
  entity_name text,
  content text,
  metadata jsonb,
  similarity double precision
)
language sql
stable
as $$
  select
    d.id,
    d.chunk_key,
    d.institution_id,
    d.page_url,
    d.category,
    d.entity_type,
    d.entity_name,
    d.content,
    d.metadata,
    1 - (d.embedding <=> query_embedding) as similarity
  from public.demo_chunk_staging d
  where d.embedding is not null
    and d.publish_ready = true
    and (filter_institution_id is null or d.institution_id = filter_institution_id)
    and (filter_category is null or d.category = filter_category)
    and (1 - (d.embedding <=> query_embedding)) >= min_similarity
  order by d.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

-- Example sanity check using an existing stored chunk vector as the query vector.
-- This validates vector ranking plumbing; in live use, pass the embedding of the user's question instead.
--
-- select chunk_key, category, entity_name, similarity
-- from public.match_demo_chunk_staging(
--   (select embedding from public.demo_chunk_staging where chunk_key = 'RCM-PROG-CPA'),
--   5,
--   'rcm-online-college',
--   null,
--   0
-- );

-- n8n Postgres node example if the query embedding is at $json.data[0].embedding:
--
-- select *
-- from public.match_demo_chunk_staging(
--   '{{ $json.data[0].embedding.toJsonString() }}'::vector(1536),
--   5,
--   'rcm-online-college',
--   null,
--   0.65
-- );
--
-- Adjust the n8n expression to match the embedding node output shape.
