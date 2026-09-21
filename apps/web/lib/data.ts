import { query } from "@/lib/db/postgres";

export type Institution = {
  id: string;
  slug: string;
  name: string;
  website: string | null;
  status: string;
  external_key: string | null;
  last_synced_at: string | null;
};

export type KnowledgeRecord = {
  id: string;
  dataset: string;
  record_key: string;
  payload: Record<string, unknown>;
  data_status: string | null;
  review_status: string | null;
  synced_at: string;
};

export const knowledgeDatasets = [
  "Programmes",
  "Fees",
  "Intakes",
  "Requirements",
  "Application Process",
  "FAQs & Policies",
  "Scholarships",
  "Contacts & Locations",
  "Response Policy",
  "Source Pages",
  "Chunk Prep",
] as const;

const publicKnowledgeDatasets = new Set<string>(knowledgeDatasets);

export async function getInstitutions(): Promise<Institution[]> {
  return query<Institution>(`
    select
      t.id::text,
      t.slug,
      t.name,
      t.website,
      t.status,
      t.external_key,
      t.last_synced_at::text
    from public.demo_tenants t
    where t.status <> 'failed'
      and t.external_key is not null
      and exists (
        select 1
        from public.published_sheet_records r
        where r.tenant_id = t.id
      )
    order by t.last_synced_at desc nulls last, t.name
  `);
}

export async function getInstitution(slug?: string): Promise<Institution> {
  const institutions = await getInstitutions();
  const active =
    institutions.find((item) => item.slug === slug) ??
    institutions[0];

  if (!active) {
    throw new Error("No synced institutions are available");
  }

  return active;
}

export type DatasetCount = {
  dataset: string;
  rows: number;
};

export async function getKnowledgeDatasetCounts(
  institution: Institution,
): Promise<DatasetCount[]> {
  return query<DatasetCount>(`
    select dataset, count(*)::int as rows
    from public.published_sheet_records
    where tenant_id = $1
      and dataset = any($2::text[])
    group by dataset
    order by dataset
  `, [institution.id, knowledgeDatasets]);
}

export async function getOverview(institution: Institution) {
  const counts = await query<{
    published_records: number;
    source_pages: number;
    programmes: number;
    facts: number;
    chunks: number;
    pending_embeddings: number;
  }>(`
    select
      (select count(*)::int
       from public.published_sheet_records
       where tenant_id = $1) as published_records,

      (select count(*)::int
       from public.source_pages
       where tenant_id = $1 and active = true) as source_pages,

      (select count(*)::int
       from public.programmes
       where tenant_id = $1 and active = true) as programmes,

      (select count(*)::int
       from public.programme_facts
       where tenant_id = $1 and active = true) as facts,

      (select count(*)::int
       from public.knowledge_chunks
       where tenant_id = $1
         and content is not null
         and btrim(content) <> '') as chunks,

      (select count(*)::int
       from public.knowledge_chunks
       where tenant_id = $1
         and embedding_status = 'pending') as pending_embeddings
  `, [institution.id]);

  const datasets = await getKnowledgeDatasetCounts(institution);
  const row = counts[0];

  return {
    live: true,
    publishedRecords: row?.published_records ?? 0,
    sourcePages: row?.source_pages ?? 0,
    programmes: row?.programmes ?? 0,
    facts: row?.facts ?? 0,
    chunks: row?.chunks ?? 0,
    pendingEmbeddings: row?.pending_embeddings ?? 0,
    datasets: [...datasets].sort((a, b) => b.rows - a.rows),
  };
}

export async function getKnowledgeRecords(
  institution: Institution,
  dataset = "Programmes",
  limit = 100,
): Promise<KnowledgeRecord[]> {
  const safeDataset = publicKnowledgeDatasets.has(dataset) ? dataset : "Programmes";
  const safeLimit = Math.max(1, Math.min(limit, 250));

  return query<KnowledgeRecord>(`
    select
      id::text,
      dataset,
      record_key,
      payload,
      data_status,
      review_status,
      synced_at::text
    from public.published_sheet_records
    where tenant_id = $1
      and dataset = $2
    order by record_key
    limit $3
  `, [institution.id, safeDataset, safeLimit]);
}
