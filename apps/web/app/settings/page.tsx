import { AppShell } from "@/components/app-shell";
import { resolveWorkspace } from "@/lib/workspace";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { institutions, activeInstitution } = await resolveWorkspace(searchParams);
  return <AppShell institutions={institutions} activeInstitution={activeInstitution}>
    <section className="page-header compact"><div><span className="eyebrow">Workspace configuration</span><h1>Settings</h1><p>Institution identity, integrations, user access and sync controls will be managed here.</p></div></section>
    <section className="panel"><div className="settings-row"><div><strong>Institution key</strong><span>Stable tenant identifier</span></div><code>{activeInstitution.external_key ?? activeInstitution.slug}</code></div><div className="settings-row"><div><strong>Source</strong><span>Onboarding data is published from Google Sheets</span></div><span className="badge">Synced</span></div></section>
  </AppShell>;
}
