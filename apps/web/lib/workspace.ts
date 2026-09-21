import { getInstitution, getInstitutions } from "@/lib/data";

export async function resolveWorkspace(
  searchParams: Promise<Record<string, string | string[] | undefined>>,
) {
  const params = await searchParams;
  const institutionParam =
    typeof params.institution === "string" ? params.institution : undefined;

  const [institutions, activeInstitution] = await Promise.all([
    getInstitutions(),
    getInstitution(institutionParam),
  ]);

  return { params, institutions, activeInstitution };
}
