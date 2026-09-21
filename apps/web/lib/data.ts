import { createDemoClient } from "@/lib/supabase/client";

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

export async function getInstitutions(): Promise<Institution[]> {
  const db = createDemoClient();
  const { data, error } = await db.rpc("demo_list_institutions");

  if (error) throw error;
  return (data ?? []) as Institution[];
}

export async function getInstitution(slug?: string): Promise<Institution> {
  const institutions = await getInstitutions();
  const active = institutions.find((item) => item.slug === slug) ?? institutions[0];

  if (!active) {
    throw new Error("No demo institutions are available");
  }

  return active;
}

export async function getOverview(institution: Institution) {
  const db = createDemoClient();
  const { data, error } = await db.rpc("demo_get_overview", {
    p_slug: institution.slug,
  });

  if (error) throw error;

  return {
    live: true,
    publishedRecords: Number(data?.publishedRecords ?? 0),
    sourcePages: Number(data?.sourcePages ?? 0),
    programmes: Number(data?.programmes ?? 0),
    facts: Number(data?.facts ?? 0),
    chunks: Number(data?.chunks ?? 0),
    pendingEmbeddings: Number(data?.pendingEmbeddings ?? 0),
    datasets: Array.isArray(data?.datasets) ? data.datasets : [],
  };
}

export async function getKnowledgeRecords(
  institution: Institution,
  dataset = "Programmes",
  limit = 100,
): Promise<KnowledgeRecord[]> {
  const db = createDemoClient();
  const { data, error } = await db.rpc("demo_get_knowledge", {
    p_slug: institution.slug,
    p_dataset: dataset,
    p_limit: limit,
  });

  if (error) throw error;
  return (data ?? []) as KnowledgeRecord[];
}
