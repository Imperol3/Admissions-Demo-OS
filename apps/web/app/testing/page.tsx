import { SearchCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { resolveWorkspace } from "@/lib/workspace";

export default async function TestingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { institutions, activeInstitution } = await resolveWorkspace(searchParams);
  return <AppShell institutions={institutions} activeInstitution={activeInstitution}>
    <section className="page-header compact"><div><span className="eyebrow">Quality assurance</span><h1>Testing</h1><p>Run known questions against retrieval and inspect the exact evidence selected.</p></div></section>
    <div className="empty-panel"><SearchCheck size={24}/><strong>Retrieval tests are next</strong><p>Embedding is the remaining dependency before we connect the test runner.</p></div>
  </AppShell>;
}
