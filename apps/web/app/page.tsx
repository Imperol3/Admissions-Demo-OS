import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  CircleCheck,
  Database,
  FileStack,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getOverview } from "@/lib/data";
import { resolveWorkspace } from "@/lib/workspace";

function Metric({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  note: string;
  icon: typeof Database;
}) {
  return (
    <article className="metric-card">
      <div className="metric-icon"><Icon size={17} /></div>
      <div className="metric-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>
    </article>
  );
}

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { institutions, activeInstitution } = await resolveWorkspace(searchParams);
  const overview = await getOverview(activeInstitution);

  return (
    <AppShell institutions={institutions} activeInstitution={activeInstitution}>
      <section className="page-header">
        <div>
          <div className="status-line">
            <span className="status-dot" />
            {overview.live ? "Connected to live PostgreSQL database" : "Database connection unavailable"}
          </div>
          <h1>{activeInstitution.name}</h1>
          <p>
            A single view of the institution knowledge base, admissions AI readiness,
            and the data published from onboarding.
          </p>
        </div>
        <Link
          className="secondary-button"
          href={`/knowledge?institution=${activeInstitution.slug}`}
        >
          Browse knowledge <ArrowUpRight size={16} />
        </Link>
      </section>

      <section className="metric-grid">
        <Metric
          label="Published records"
          value={overview.publishedRecords}
          note="Synced from onboarding"
          icon={Database}
        />
        <Metric
          label="Programmes"
          value={overview.programmes}
          note="Available for exact lookup"
          icon={GraduationCap}
        />
        <Metric
          label="Knowledge chunks"
          value={overview.chunks}
          note="Prepared for retrieval"
          icon={FileStack}
        />
        <Metric
          label="Embeddings pending"
          value={overview.pendingEmbeddings}
          note="Next pipeline step"
          icon={Sparkles}
        />
      </section>

      <section className="dashboard-grid">
        <article className="panel panel-large">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Knowledge coverage</span>
              <h2>What is available in the workspace</h2>
            </div>
            <BookOpen size={19} />
          </div>
          <div className="dataset-list">
            {overview.datasets.slice(0, 8).map((item) => (
              <Link
                className="dataset-row dataset-row-link"
                key={item.dataset}
                href={`/knowledge?institution=${activeInstitution.slug}&dataset=${encodeURIComponent(item.dataset)}`}
              >
                <div>
                  <strong>{item.dataset}</strong>
                  <span>Published onboarding data</span>
                </div>
                <span className="count-pill">{item.rows}</span>
              </Link>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Readiness</span>
              <h2>Demo pipeline</h2>
            </div>
            <CircleCheck size={19} />
          </div>
          <div className="readiness-list">
            <div className="readiness-item complete">
              <span>1</span><div><strong>Onboarding</strong><small>Sheet populated and reviewed</small></div>
            </div>
            <div className="readiness-item complete">
              <span>2</span><div><strong>Database sync</strong><small>{overview.publishedRecords} records published</small></div>
            </div>
            <div className="readiness-item current">
              <span>3</span><div><strong>Embedding</strong><small>{overview.pendingEmbeddings} chunks waiting</small></div>
            </div>
            <div className="readiness-item">
              <span>4</span><div><strong>Retrieval tests</strong><small>Run after embeddings</small></div>
            </div>
          </div>
        </article>
      </section>
    </AppShell>
  );
}
