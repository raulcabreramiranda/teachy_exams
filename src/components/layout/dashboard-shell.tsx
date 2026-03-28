"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/layout/logout-button";

type DashboardShellProps = {
  title: string;
  subtitle: string;
  navItems: Array<{
    href: string;
    label: string;
    exact?: boolean;
  }>;
  showSidebar?: boolean;
  children: React.ReactNode;
};

export function DashboardShell({
  title,
  subtitle,
  navItems,
  showSidebar = true,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen text-slate-900">
      <div className="flex min-h-screen">
        {showSidebar ? (
          <aside className="app-shell-sidebar hidden w-64 shrink-0 border-r md:block">
            <div className="border-b border-[var(--border)] px-4 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Teachy
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                Exams
              </p>
            </div>

            <nav className="space-y-1 px-3 py-4">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (!item.exact && pathname.startsWith(`${item.href}/`));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`app-nav-link ${
                      isActive
                        ? "app-nav-link-active"
                        : ""
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="app-shell-header border-b px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
                <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
              </div>

              <LogoutButton />
            </div>
          </header>

          <main className="min-w-0 flex-1 p-5">{children}</main>
        </div>
      </div>
    </div>
  );
}
