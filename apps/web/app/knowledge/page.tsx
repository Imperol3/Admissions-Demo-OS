import { AppShell } from "@/components/app-shell";
import { getKnowledgeRecords, knowledgeDatasets } from "@/lib/data";
import { resolveWorkspace } from "@/lib/workspace";

function primaryText(payload: Record<string, unknown>) {
  const candidates = [
    payload.name,
    payload.programme_name,
    payload.scholarship_name,
    payload.intake_name,
    payload.requirement_text,
    payload.step_name,
    payload.page_title,
    payload.question_or_policy,
    payload.entity_name,
  ];
  return String(candidates.find(Boolean) ?? "Knowledge record");
}

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

  const records = await getKnowledgeRecords(activeInstitution, dataset);

  return (
    <AppShell institutions={institutions} activeInstitution={activeInstitution}>
      <section className="page-header compact">
        <div>
          <span className="eyebrow">Approved institution data</span>
          <h1>Knowledge</h1>
          <p>Inspect exactly what Admissions OS knows before it answers a student.</p>
        </div>
      </section>

      <div className="knowledge-layout">
        <aside className="knowledge-nav">
          {knowledgeDatasets.map((item) => (
            <a
              key={item}
              className={item === dataset ? "knowledge-link active" : "knowledge-link"}
              href={`/knowledge?institution=${activeInstitution.slug}&dataset=${encodeURIComponent(item)}`}
            >
              <span>{item}</span>
            </a>
          ))}
        </aside>

        <section className="panel knowledge-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">{dataset}</span>
              <h2>{records.length} records</h2>
            </div>
          </div>

          {records.length === 0 ? (
            <div className="empty-state">
              <strong>No records found for {dataset}.</strong>
              <p>This dataset is connected to PostgreSQL but currently contains no published rows for {activeInstitution.name}.</p>
            </div>
          ) : (
            <div className="record-table">
              {records.map((record) => (
                <article className="record-row" key={record.id}>
                  <div className="record-main">
                    <strong>{primaryText(record.payload ?? {})}</strong>
                    <span>{record.record_key}</span>
                  </div>
                  <div className="record-meta">
                    {record.data_status && <span className="badge">{record.data_status}</span>}
                    {record.review_status && <span className="badge muted">{record.review_status}</span>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
