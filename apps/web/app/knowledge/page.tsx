import { AppShell } from "@/components/app-shell";
import { KnowledgeWorkspace } from "@/components/knowledge-workspace";
import {
  getKnowledgeDatasetCounts,
  getKnowledgeRecords,
  knowledgeDatasets,
} from "@/lib/data";
import { resolveWorkspace } from "@/lib/workspace";

export default async function KnowledgePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { params, institutions, activeInstitution } = await resolveWorkspace(searchParams);
  const requestedDataset =
    typeof params.dataset === "string" ? params.dataset : "Programmes";
  const dataset = knowledgeDatasets.includes(
    requestedDataset as (typeof knowledgeDatasets)[number],
  )
    ? requestedDataset
    : "Programmes";

  const [records, counts, programmeRecords] = await Promise.all([
    getKnowledgeRecords(activeInstitution, dataset, 250),
    getKnowledgeDatasetCounts(activeInstitution),
    getKnowledgeRecords(activeInstitution, "Programmes", 250),
  ]);

  return (
    <AppShell institutions={institutions} activeInstitution={activeInstitution}>
      <KnowledgeWorkspace
        institutionName={activeInstitution.name}
        institutionSlug={activeInstitution.slug}
        lastSyncedAt={activeInstitution.last_synced_at}
        dataset={dataset}
        records={records}
        counts={counts}
        programmeRecords={programmeRecords}
      />
    </AppShell>
  );
}
