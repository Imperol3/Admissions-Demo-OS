import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  Bot,
  GraduationCap,
  Inbox,
  LayoutDashboard,
  SearchCheck,
  Settings2,
} from "lucide-react";
import type { ReactNode } from "react";
import type { Institution } from "@/lib/data";
import { InstitutionSwitcher } from "@/components/institution-switcher";

const navigation = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/enquiries", label: "Enquiries", icon: Inbox },
  { href: "/ask", label: "Ask Admissions", icon: Bot },
  { href: "/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/testing", label: "Testing", icon: SearchCheck },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export function AppShell({
  children,
  institutions,
  activeInstitution,
}: {
  children: ReactNode;
  institutions: Institution[];
  activeInstitution: Institution;
}) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><GraduationCap size={18} /></div>
          <div>
            <strong>Admissions OS</strong>
            <span>Demo workspace</span>
          </div>
        </div>

        <nav className="nav">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={`${item.href}?institution=${activeInstitution.slug}`}
                className="nav-item"
              >
                <Icon size={17} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <Link
            href={`/settings?institution=${activeInstitution.slug}`}
            className="nav-item"
          >
            <Settings2 size={17} />
            Settings
          </Link>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <span className="eyebrow">Admissions workspace</span>
            <strong>{activeInstitution.name}</strong>
          </div>
          <InstitutionSwitcher
            institutions={institutions}
            activeSlug={activeInstitution.slug}
          />
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
