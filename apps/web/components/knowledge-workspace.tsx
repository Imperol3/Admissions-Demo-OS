"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Search,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { DatasetCount, KnowledgeRecord } from "@/lib/data";

type Props = {
  institutionName: string;
  institutionSlug: string;
  lastSyncedAt: string | null;
  dataset: string;
  records: KnowledgeRecord[];
  counts: DatasetCount[];
  programmeRecords: KnowledgeRecord[];
};

const groups = [
  {
    label: "Admissions",
    items: ["Programmes", "Fees", "Intakes", "Requirements", "Application Process"],
  },
  {
    label: "Guidance",
    items: ["Scholarships", "Contacts & Locations", "Response Policy", "FAQs & Policies"],
  },
  {
    label: "System",
    items: ["Source Pages", "Chunk Prep"],
  },
];

const datasetDescriptions: Record<string, string> = {
  Programmes: "Published programmes, delivery modes, duration and qualification details.",
  Fees: "Programme and application fees with billing basis and effective year.",
  Intakes: "Current and upcoming intake windows, study mode and application availability.",
  Requirements: "Entry requirements, exams and supporting-document rules.",
  "Application Process": "The approved application journey and responsibilities at each step.",
  "FAQs & Policies": "Approved reusable answers and institutional policy guidance.",
  Scholarships: "Financial aid, scholarship availability, eligibility and deadlines.",
  "Contacts & Locations": "Admissions contacts, departments, campuses and operating hours.",
  "Response Policy": "Rules that control how Admissions OS should answer and escalate.",
  "Source Pages": "Official source pages used to build and verify admissions knowledge.",
  "Chunk Prep": "Prepared retrieval chunks and their review, publish and embedding state.",
};

const headers: Record<string, string[]> = {
  Programmes: ["Programme", "Type", "Duration", "Mode", "Status"],
  Fees: ["Fee", "Programme", "Amount", "Basis", "Year"],
  Intakes: ["Intake", "Programme", "Starts", "Mode", "Availability"],
  Requirements: ["Requirement", "Applies to", "Level", "Type", "Status"],
  "Application Process": ["Step", "Instruction", "Documents", "Owner", "Status"],
  "FAQs & Policies": ["Question / Policy", "Approved answer / rule", "Type", "Status", "Review"],
  Scholarships: ["Scholarship", "Status", "Deadline", "Benefit", "Review"],
  "Contacts & Locations": ["Contact", "Department", "Contact details", "Campus", "Hours"],
  "Response Policy": ["Policy area", "Rule", "Priority", "Action", "Review"],
  "Source Pages": ["Source", "Type", "Authority", "Verified", "Ingestion"],
  "Chunk Prep": ["Chunk", "Category", "Source", "Publish", "Embedding"],
};

const detailFields: Record<string, Array<[string, string]>> = {
  Programmes: [
    ["name", "Programme"],
    ["aliases", "Alias"],
    ["programme_type", "Type"],
    ["qualification", "Qualification"],
    ["description", "Description"],
    ["duration_value", "Duration"],
    ["study_mode", "Study mode"],
    ["delivery_mode", "Delivery mode"],
    ["campus_or_location", "Location"],
    ["application_url", "Application URL"],
  ],
  Fees: [
    ["fee_type", "Fee type"],
    ["amount", "Amount"],
    ["currency", "Currency"],
    ["programme_id", "Programme"],
    ["billing_basis", "Billing basis"],
    ["academic_year", "Academic year"],
    ["effective_from", "Effective from"],
    ["mandatory", "Mandatory"],
  ],
  Intakes: [
    ["intake_name", "Intake"],
    ["programme_id", "Programme"],
    ["start_date", "Start date"],
    ["study_mode", "Study mode"],
    ["delivery_mode", "Delivery mode"],
    ["availability_status", "Availability"],
    ["intake_status", "Application status"],
    ["campus_or_location", "Location"],
  ],
  Requirements: [
    ["requirement_text", "Requirement"],
    ["applies_to", "Applies to"],
    ["admission_requirement_level", "Level"],
    ["requirement_type", "Requirement type"],
    ["programme_id", "Programme"],
    ["accepted_alternatives", "Accepted alternatives"],
  ],
  "Application Process": [
    ["step_number", "Step number"],
    ["step_name", "Step"],
    ["instructions", "Instructions"],
    ["documents_needed", "Documents needed"],
    ["responsible_contact", "Responsible contact"],
    ["application_url", "Application URL"],
  ],
  Scholarships: [
    ["scholarship_name", "Scholarship"],
    ["scholarship_type", "Type"],
    ["status", "Status"],
    ["deadline", "Deadline"],
    ["eligibility", "Eligibility"],
    ["amount_or_benefit", "Benefit"],
    ["application_process", "Application process"],
    ["application_url", "Application URL"],
  ],
  "Contacts & Locations": [
    ["name", "Name"],
    ["role_or_department", "Department"],
    ["email", "Email"],
    ["phone", "Phone"],
    ["campus", "Campus"],
    ["address_line", "Address"],
    ["city", "City"],
    ["opening_hours", "Opening hours"],
    ["website_or_booking_url", "Website"],
  ],
  "Response Policy": [
    ["policy_area", "Policy area"],
    ["rule", "Rule"],
    ["priority", "Priority"],
    ["trigger_or_condition", "When it applies"],
    ["response_action", "Response action"],
    ["escalation_route", "Escalation route"],
    ["example_or_notes", "Notes"],
  ],
  "Source Pages": [
    ["page_title", "Page title"],
    ["url", "URL"],
    ["page_type", "Page type"],
    ["authority_level", "Authority"],
    ["discovery_method", "Discovery method"],
    ["ingestion_status", "Ingestion status"],
    ["last_verified_at", "Last verified"],
  ],
  "Chunk Prep": [
    ["entity_name", "Entity"],
    ["entity_type", "Entity type"],
    ["category", "Category"],
    ["content", "Chunk content"],
    ["source_tabs", "Source dataset"],
    ["source_urls", "Source URL"],
    ["publish_ready", "Publish ready"],
    ["embedding_status", "Embedding status"],
    ["embedding_model", "Embedding model"],
  ],
};

function text(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function humanize(value: unknown) {
  const raw = text(value);
  if (!raw) return "—";
  return raw
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: unknown) {
  const raw = text(value);
  if (!raw) return "—";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatMoney(amount: unknown, currency: unknown) {
  const numeric = Number(text(amount));
  const code = text(currency) || "KES";
  if (!Number.isFinite(numeric)) return text(amount) || "—";
  try {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format(numeric);
  } catch {
    return `${code} ${numeric.toLocaleString("en-KE")}`;
  }
}

function statusTone(value: string) {
  const normalized = value.toLowerCase();
  if (["confirmed", "active", "open", "embedded", "ready", "true"].some((x) => normalized.includes(x))) {
    return "positive";
  }
  if (["needs review", "in review", "pending", "not reviewed"].some((x) => normalized.includes(x))) {
    return "warning";
  }
  if (["expired", "closed", "inactive", "false"].some((x) => normalized.includes(x))) {
    return "neutral";
  }
  return "neutral";
}

function programmeMap(records: KnowledgeRecord[]) {
  const map = new Map<string, string>();
  for (const record of records) {
    const id = text(record.payload.programme_id);
    const name = text(record.payload.name);
    if (id && name) map.set(id, name);
  }
  return map;
}

function programmeName(id: unknown, map: Map<string, string>) {
  const key = text(id);
  return map.get(key) || key || "Institution-wide";
}

function recordCells(
  dataset: string,
  record: KnowledgeRecord,
  programmes: Map<string, string>,
): string[] {
  const p = record.payload ?? {};
  const dataStatus = text(record.data_status || p.data_status);
  const reviewStatus = text(record.review_status || p.review_status);

  switch (dataset) {
    case "Programmes":
      return [
        text(p.name) || "Unnamed programme",
        humanize(p.programme_type),
        [text(p.duration_value), text(p.duration_unit)].filter(Boolean).join(" ") || "—",
        [humanize(p.study_mode), humanize(p.delivery_mode)].filter((v) => v !== "—").join(" · ") || "—",
        humanize(dataStatus || p.active_status),
      ];
    case "Fees":
      return [
        humanize(p.fee_type),
        programmeName(p.programme_id, programmes),
        formatMoney(p.amount, p.currency),
        humanize(p.billing_basis),
        text(p.academic_year) || "—",
      ];
    case "Intakes":
      return [
        text(p.intake_name) || "Unnamed intake",
        programmeName(p.programme_id, programmes),
        formatDate(p.start_date),
        [humanize(p.study_mode), humanize(p.delivery_mode)].filter((v) => v !== "—").join(" · ") || "—",
        humanize(p.availability_status || p.intake_status),
      ];
    case "Requirements":
      return [
        text(p.requirement_text) || "Requirement",
        text(p.applies_to) || programmeName(p.programme_id, programmes),
        humanize(p.admission_requirement_level),
        humanize(p.requirement_type),
        humanize(dataStatus),
      ];
    case "Application Process":
      return [
        [text(p.step_number), text(p.step_name)].filter(Boolean).join(". ") || "Application step",
        text(p.instructions) || "—",
        text(p.documents_needed) || "—",
        text(p.responsible_contact) || "—",
        humanize(dataStatus),
      ];
    case "FAQs & Policies":
      return [
        text(p.question_or_policy || p.question) || "Unlabelled item",
        text(p.approved_answer_or_rule || p.answer || p.rule) || "—",
        humanize(p.knowledge_type || p.policy_type || p.item_type),
        humanize(dataStatus),
        humanize(reviewStatus),
      ];
    case "Scholarships":
      return [
        text(p.scholarship_name) || "Unnamed scholarship",
        humanize(p.status),
        formatDate(p.deadline),
        text(p.amount_or_benefit) || "—",
        humanize(reviewStatus),
      ];
    case "Contacts & Locations":
      return [
        text(p.name) || "Contact",
        text(p.role_or_department) || "—",
        [text(p.email), text(p.phone)].filter(Boolean).join(" · ") || "—",
        text(p.campus || p.city) || "—",
        text(p.opening_hours) || "—",
      ];
    case "Response Policy":
      return [
        text(p.policy_area) || "Policy",
        text(p.rule) || "—",
        humanize(p.priority),
        humanize(p.response_action),
        humanize(reviewStatus),
      ];
    case "Source Pages":
      return [
        text(p.page_title) || text(p.url) || "Source page",
        humanize(p.page_type),
        humanize(p.authority_level),
        formatDate(p.last_verified_at || p.scraped_at),
        humanize(p.ingestion_status),
      ];
    case "Chunk Prep":
      return [
        text(p.entity_name) || "Knowledge chunk",
        humanize(p.category),
        text(p.source_tabs) || "—",
        text(p.publish_ready).toUpperCase() === "TRUE" ? "Ready" : "Not ready",
        humanize(p.embedding_status),
      ];
    default:
      return [record.record_key, "—", "—", "—", humanize(dataStatus || reviewStatus)];
  }
}

function recordSearchText(record: KnowledgeRecord) {
  return JSON.stringify(record.payload ?? {}).toLowerCase();
}

function displaySyncDate(value: string | null) {
  if (!value) return "Not synced";
  return formatDate(value);
}

export function KnowledgeWorkspace({
  institutionName,
  institutionSlug,
  lastSyncedAt,
  dataset,
  records,
  counts,
  programmeRecords,
}: Props) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<KnowledgeRecord | null>(null);

  const programmes = useMemo(() => programmeMap(programmeRecords), [programmeRecords]);
  const countMap = useMemo(() => new Map(counts.map((item) => [item.dataset, item.rows])), [counts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((record) => {
      const payloadText = recordSearchText(record);
      const matchesQuery = !q || payloadText.includes(q) || record.record_key.toLowerCase().includes(q);

      if (!matchesQuery) return false;
      if (status === "all") return true;

      const statusText = [
        record.data_status,
        record.review_status,
        record.payload?.data_status,
        record.payload?.review_status,
        record.payload?.embedding_status,
        record.payload?.status,
      ]
        .map(text)
        .join(" ")
        .toLowerCase();

      return statusText.includes(status.replace(/_/g, " "));
    });
  }, [records, query, status]);

  const totalKnowledge = counts.reduce((sum, item) => sum + item.rows, 0);
  const selectedHeaders = headers[dataset] ?? ["Record", "Detail", "Detail", "Detail", "Status"];

  return (
    <div className="knowledge-workspace">
      <section className="knowledge-hero">
        <div>
          <div className="knowledge-kicker">Admissions knowledge</div>
          <h1>Knowledge</h1>
          <p>
            Approved institutional facts, guidance and source coverage for {institutionName}.
          </p>
        </div>
        <div className="knowledge-sync">
          <span className="knowledge-live-dot" />
          <div>
            <strong>PostgreSQL live</strong>
            <span>Last sync {displaySyncDate(lastSyncedAt)}</span>
          </div>
        </div>
      </section>

      <section className="knowledge-summary">
        {["Programmes", "Fees", "Intakes", "Requirements", "Chunk Prep"].map((item) => (
          <a
            key={item}
            href={`/knowledge?institution=${institutionSlug}&dataset=${encodeURIComponent(item)}`}
            className={item === dataset ? "knowledge-summary-card active" : "knowledge-summary-card"}
          >
            <span>{item === "Chunk Prep" ? "Retrieval chunks" : item}</span>
            <strong>{countMap.get(item) ?? 0}</strong>
          </a>
        ))}
        <div className="knowledge-summary-total">
          <span>Knowledge records</span>
          <strong>{totalKnowledge}</strong>
        </div>
      </section>

      <div className="knowledge-shell">
        <aside className="knowledge-sidebar">
          {groups.map((group) => (
            <div className="knowledge-nav-group" key={group.label}>
              <span className="knowledge-nav-label">{group.label}</span>
              {group.items.map((item) => {
                const count = countMap.get(item) ?? 0;
                return (
                  <a
                    key={item}
                    href={`/knowledge?institution=${institutionSlug}&dataset=${encodeURIComponent(item)}`}
                    className={item === dataset ? "knowledge-nav-item active" : "knowledge-nav-item"}
                  >
                    <span>{item}</span>
                    <small>{count}</small>
                  </a>
                );
              })}
            </div>
          ))}
        </aside>

        <section className="knowledge-content-panel">
          <header className="knowledge-section-header">
            <div>
              <div className="knowledge-section-title">
                <h2>{dataset}</h2>
                <span>{countMap.get(dataset) ?? records.length}</span>
              </div>
              <p>{datasetDescriptions[dataset]}</p>
            </div>

            <div className="knowledge-toolbar">
              <label className="knowledge-search">
                <Search size={15} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={`Search ${dataset.toLowerCase()}…`}
                />
              </label>
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="all">All statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="needs_review">Needs review</option>
                <option value="in_review">In review</option>
                <option value="pending">Pending</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </header>

          {records.length === 0 ? (
            <div className="knowledge-gap-state">
              <AlertTriangle size={20} />
              <div>
                <strong>No published {dataset.toLowerCase()} yet</strong>
                <p>
                  The database connection is working. This is a knowledge coverage gap for {institutionName},
                  not a connection error.
                </p>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="knowledge-gap-state">
              <Search size={20} />
              <div>
                <strong>No matching records</strong>
                <p>Change the search text or status filter to see more results.</p>
              </div>
            </div>
          ) : (
            <div className="knowledge-table-wrap">
              <table className="knowledge-data-table">
                <thead>
                  <tr>
                    {selectedHeaders.map((header) => (
                      <th key={header}>{header}</th>
                    ))}
                    <th aria-label="Open record" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((record) => {
                    const cells = recordCells(dataset, record, programmes);
                    return (
                      <tr key={record.id} onClick={() => setSelected(record)}>
                        {cells.map((cell, index) => (
                          <td key={`${record.id}-${index}`} className={index === 0 ? "primary-cell" : ""}>
                            {index === 0 ? <strong>{cell}</strong> : cell}
                          </td>
                        ))}
                        <td className="open-cell">
                          <ChevronRight size={15} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <footer className="knowledge-table-footer">
            <span>{filtered.length} of {records.length} records</span>
            <span>Click any row to inspect source and audit details</span>
          </footer>
        </section>
      </div>

      {selected && (
        <div className="knowledge-drawer-backdrop" onMouseDown={() => setSelected(null)}>
          <aside className="knowledge-drawer" onMouseDown={(event) => event.stopPropagation()}>
            <header className="knowledge-drawer-header">
              <div>
                <span>{dataset}</span>
                <h3>{recordCells(dataset, selected, programmes)[0]}</h3>
              </div>
              <button onClick={() => setSelected(null)} aria-label="Close record inspector">
                <X size={18} />
              </button>
            </header>

            <div className="knowledge-drawer-body">
              <section>
                <h4>Record details</h4>
                <dl className="knowledge-detail-grid">
                  {(detailFields[dataset] ?? []).map(([key, label]) => {
                    let value = selected.payload?.[key];
                    if (key === "programme_id") value = programmeName(value, programmes);
                    if (!text(value)) return null;

                    const isUrl = key.includes("url") && text(value).startsWith("http");
                    return (
                      <div key={key}>
                        <dt>{label}</dt>
                        <dd>
                          {isUrl ? (
                            <a href={text(value)} target="_blank" rel="noreferrer">
                              Open link <ExternalLink size={13} />
                            </a>
                          ) : (
                            text(value)
                          )}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </section>

              {text(selected.payload?.source_evidence) && (
                <section>
                  <h4>Source evidence</h4>
                  <div className="knowledge-evidence">
                    <CheckCircle2 size={16} />
                    <p>{text(selected.payload.source_evidence)}</p>
                  </div>
                </section>
              )}

              <section>
                <h4>Audit</h4>
                <div className="knowledge-audit-grid">
                  <div>
                    <span>Record key</span>
                    <code>{selected.record_key}</code>
                  </div>
                  <div>
                    <span>Data status</span>
                    <strong className={`status-text ${statusTone(text(selected.data_status || selected.payload?.data_status))}`}>
                      {humanize(selected.data_status || selected.payload?.data_status)}
                    </strong>
                  </div>
                  <div>
                    <span>Review status</span>
                    <strong className={`status-text ${statusTone(text(selected.review_status || selected.payload?.review_status))}`}>
                      {humanize(selected.review_status || selected.payload?.review_status)}
                    </strong>
                  </div>
                  <div>
                    <span>Source ID</span>
                    <code>{text(selected.payload?.source_id) || "—"}</code>
                  </div>
                </div>
              </section>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
