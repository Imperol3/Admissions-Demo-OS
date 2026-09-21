import { BarChart3 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { resolveWorkspace } from "@/lib/workspace";

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { institutions, activeInstitution } = await resolveWorkspace(searchParams);
  return <AppShell institutions={institutions} activeInstitution={activeInstitution}>
    <section className="page-header compact"><div><span className="eyebrow">Admissions performance</span><h1>Analytics</h1><p>Resolution rate, response time, enquiry topics and knowledge gaps will appear here.</p></div></section>
    <div className="empty-panel"><BarChart3 size={24}/><strong>Waiting for conversation data</strong><p>The analytics model activates as soon as the demo starts processing enquiries.</p></div>
  </AppShell>;
}
