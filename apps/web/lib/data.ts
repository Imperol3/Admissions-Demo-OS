import { createAdminClient } from "@/lib/supabase/admin";

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

const fallbackInstitution: Institution = {
  id: "0cf8d009-227f-46c6-b89b-3f5bcfe5ddd8",
  slug: "strathmore-university-ke",
  name: "Strathmore University",
  website: "https://strathmore.edu/",
  status: "completed",
  external_key: "STRATHMORE-UNIVERSITY-KE",
  last_synced_at: null,
};

export async function getInstitutions(): Promise<Institution[]> {
  const db = createAdminClient();
  if (!db) return [fallbackInstitution];

  const { data, error } = await db
    .from("demo_tenants")
    .select("id,slug,name,website,status,external_key,last_synced_at")
    .order("name");

  if (error) throw error;
  return data ?? [];
}

export async function getInstitution(slug?: string): Promise<Institution> {
  const institutions = await getInstitutions();
  return institutions.find((item) => item.slug === slug) ?? institutions[0] ?? fallbackInstitution;
}

export async function getOverview(institution: Institution) {
  const db = createAdminClient();

  if (!db) {
    return {
      live: false,
      publishedRecords: 956,
      sourcePages: 33,
      programmes: 28,
      facts: 42,
      chunks: 65,
      pendingEmbeddings: 65,
      datasets: [
        { dataset: "Programmes", rows: 28 },
        { dataset: "Source Pages", rows: 33 },
        { dataset: "Chunk Prep", rows: 65 },
        { dataset: "Staging", rows: 198 },
      ],
    };
  }

  const tenantId = institution.id;
  const [published, sources, programmes, facts, chunks, pending, datasetRows] =
    await Promise.all([
      db.from("published_sheet_records").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId),
      db.from("source_pages").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId),
      db.from("programmes").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId),
      db.from("programme_facts").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId),
      db.from("knowledge_chunks").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId),
      db.from("knowledge_chunks").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("embedding_status", "pending"),
      db.from("published_sheet_records").select("dataset").eq("tenant_id", tenantId),
    ]);

  const rows = new Map<string, number>();
  for (const row of datasetRows.data ?? []) {
    rows.set(row.dataset, (rows.get(row.dataset) ?? 0) + 1);
  }

  return {
    live: true,
    publishedRecords: published.count ?? 0,
    sourcePages: sources.count ?? 0,
    programmes: programmes.count ?? 0,
    facts: facts.count ?? 0,
    chunks: chunks.count ?? 0,
    pendingEmbeddings: pending.count ?? 0,
    datasets: [...rows.entries()]
      .map(([dataset, count]) => ({ dataset, rows: count }))
      .sort((a, b) => b.rows - a.rows),
  };
}

export async function getKnowledgeRecords(
  institution: Institution,
  dataset = "Programmes",
  limit = 100,
): Promise<KnowledgeRecord[]> {
  const db = createAdminClient();
  if (!db) return [];

  const { data, error } = await db
    .from("published_sheet_records")
    .select("id,dataset,record_key,payload,data_status,review_status,synced_at")
    .eq("tenant_id", institution.id)
    .eq("dataset", dataset)
    .order("record_key")
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as KnowledgeRecord[];
}
