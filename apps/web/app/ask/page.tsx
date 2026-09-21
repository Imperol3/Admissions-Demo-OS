import { AppShell } from "@/components/app-shell";
import { AskPanel } from "@/components/ask-panel";
import { resolveWorkspace } from "@/lib/workspace";

export default async function AskPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { institutions, activeInstitution } = await resolveWorkspace(searchParams);

  return (
    <AppShell institutions={institutions} activeInstitution={activeInstitution}>
      <AskPanel institutionName={activeInstitution.name} />
    </AppShell>
  );
}
