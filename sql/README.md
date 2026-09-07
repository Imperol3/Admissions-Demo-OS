# Database bootstrap

Run `001_init_admissions_demo_os.sql` once in the Supabase SQL editor or against the target PostgreSQL database.

It creates the full Admissions Demo OS schema in one pass:

1. `demo_tenants`
2. `source_pages`
3. `source_page_versions`
4. `programmes`
5. `programme_facts`
6. `knowledge_chunks`
7. `demo_messages`
8. `demo_runs`
9. `demo_evaluations`

It also creates:

- `pgcrypto`
- `vector` / pgvector
- tenant and lookup indexes
- HNSW cosine index for `knowledge_chunks.embedding`
- automatic `updated_at` triggers
- `match_knowledge_chunks(...)` for tenant-scoped semantic retrieval
- `reset_demo_transient_state(...)` for clearing demo messages, runs and evaluations without deleting institution knowledge

## Embeddings

The script currently creates `knowledge_chunks.embedding` as `vector(1536)`, matching `text-embedding-3-small` at its standard 1536 dimensions.

If the embedding model or configured dimensions change, update both the column and the retrieval function signature together before initializing a new database.

## Important

All retrieval must remain tenant-scoped. The supplied `match_knowledge_chunks(...)` function requires `p_tenant_id` for this reason.

`programmes` and `programme_facts` are retained for exact lookup, entity resolution, validation and future UI/reporting. `knowledge_chunks` remains the primary grounded evidence/retrieval layer for generated admissions responses.
