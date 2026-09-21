import { Inbox } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { resolveWorkspace } from "@/lib/workspace";

export default async function EnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { institutions, activeInstitution } = await resolveWorkspace(searchParams);
  return (
    <AppShell institutions={institutions} activeInstitution={activeInstitution}>
      <section className="page-header compact">
        <div><span className="eyebrow">Student conversations</span><h1>Enquiries</h1><p>Inbound conversations, AI responses, reviews and escalations will live here.</p></div>
      </section>
      <div className="empty-panel"><Inbox size={24}/><strong>No demo enquiries yet</strong><p>The first test conversations will appear here once the RAG test runner is connected.</p></div>
    </AppShell>
  );
}
