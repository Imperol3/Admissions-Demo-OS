"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Institution } from "@/lib/data";

export function InstitutionSwitcher({
  institutions,
  activeSlug,
}: {
  institutions: Institution[];
  activeSlug: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function changeInstitution(slug: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("institution", slug);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <label className="institution-switcher">
      <span>Institution</span>
      <select
        value={activeSlug}
        onChange={(event) => changeInstitution(event.target.value)}
        aria-label="Active institution"
      >
        {institutions.map((institution) => (
          <option key={institution.id} value={institution.slug}>
            {institution.name}
          </option>
        ))}
      </select>
    </label>
  );
}
