# Database bootstrap

Run `001_init_admissions_demo_os.sql` once in the Supabase SQL editor or against a fresh PostgreSQL database.

It creates the current Admissions Demo OS schema:

1. `demo_tenants`
2. `source_pages`
3. `programmes`
4. `programme_facts`
5. `knowledge_chunks`
6. `demo_messages`
7. `demo_runs`
8. `demo_evaluations`

## Demo-first source storage

There is intentionally **no `source_page_versions` table**.

For this demo, `source_pages` stores the current scraped + extracted state of a URL:

- URL/title/page type
- latest cleaned scraped content
- latest structured extraction JSON
- parser status/errors
- content hash
- last scraped timestamp

When the same page is scraped again, UPSERT `(tenant_id, url)` and replace the current state. When Step 2 creates embeddings, rebuild that page's `knowledge_chunks` from the new content.

Historical page versions/diffs are deferred to the production architecture.

## Tenant onboarding statuses

The bootstrap allows:

```text
created
onboarding
scraping
extracting
completed
failed
```

Onboarding V1 ends at `completed`. Chunking, embeddings and RAG happen in Step 2 and do not block onboarding completion.

## Included helpers

The script also creates:

- `pgcrypto`
- `vector` / pgvector
- tenant and lookup indexes
- HNSW cosine index for `knowledge_chunks.embedding`
- automatic `updated_at` triggers
- `match_knowledge_chunks(...)` for tenant-scoped semantic retrieval
- `reset_demo_transient_state(...)` for clearing demo messages, runs and evaluations without deleting institution knowledge

## Embeddings

`knowledge_chunks.embedding` is currently `vector(1536)`, matching the existing `text-embedding-3-small` setup.

If the embedding model/dimension changes, update both the vector column and retrieval function signature together.

## Existing databases

If you already ran an older bootstrap containing `source_page_versions`, run the migration provided after the bootstrap scripts to collapse the latest page state into `source_pages` and remove the version table.

## Important

All retrieval must remain tenant-scoped.

`programmes` and `programme_facts` remain for exact lookup, entity resolution, validation and future UI/reporting while we test the design. `knowledge_chunks` remains the primary grounded evidence/retrieval layer for generated admissions responses.
