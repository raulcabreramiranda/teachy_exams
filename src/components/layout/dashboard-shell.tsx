"use client";

import { BrandMark } from "@/components/layout/brand-mark";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { LogoutButton } from "@/components/layout/logout-button";
import { Link, usePathname } from "@/i18n/navigation";

type DashboardNavItem = {
  href: string;
  label: string;
  exact?: boolean;
  badgeCount?: number;
};

type DashboardStatusNotice = {
  href: string;
  compactLabel: string;
  title: string;
  description: string;
  tone?: "info" | "success" | "warning";
};

type DashboardShellProps = {
  title: string;
  subtitle: string;
  navItems: DashboardNavItem[];
  statusNotice?: DashboardStatusNotice;
  showSidebar?: boolean;
  centerHeaderContent?: boolean;
  children: React.ReactNode;
};

function getNoticeBadgeClass(
  tone: NonNullable<DashboardStatusNotice["tone"]>,
  active = false,
) {
  if (active) {
    return "border-white/25 bg-white/15 text-white";
  }

  if (tone === "success") {
    return "app-badge app-badge-success";
  }

  if (tone === "warning") {
    return "app-badge app-badge-warning";
  }

  return "app-badge app-badge-info";
}

export function DashboardShell({
  title,
  subtitle,
  navItems,
  statusNotice,
  showSidebar = true,
  centerHeaderContent = false,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen text-slate-900">
      <div className="flex min-h-screen">
        {showSidebar ? (
          <aside className="app-shell-sidebar hidden w-64 shrink-0 border-r md:block">
            <div className="border-b border-[var(--border)] px-4 py-5">
              <BrandMark href={navItems[0]?.href ?? "/"} />
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
                    <span className="flex items-center justify-between gap-3">
                      <span>{item.label}</span>
                      {item.badgeCount && item.badgeCount > 0 ? (
                        <span
                          className={`inline-flex min-w-7 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                            isActive
                              ? getNoticeBadgeClass("warning", true)
                              : "app-badge app-badge-warning"
                          }`}
                        >
                          {item.badgeCount > 99 ? "99+" : item.badgeCount}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                );
              })}
            </nav>

            {statusNotice ? (
              <div className="border-t border-[var(--border)] px-3 py-4">
                <Link href={statusNotice.href} className="app-panel block px-3 py-3">
                  <span
                    className={getNoticeBadgeClass(statusNotice.tone ?? "info")}
                  >
                    {statusNotice.compactLabel}
                  </span>
                  <p className="mt-3 text-sm font-semibold text-slate-900">
                    {statusNotice.title}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {statusNotice.description}
                  </p>
                </Link>
              </div>
            ) : null}
          </aside>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="app-shell-header border-b px-5 py-4">
            {centerHeaderContent ? (
              <div className="flex flex-col gap-3 md:grid md:grid-cols-[auto_1fr_auto] md:items-center md:gap-4">
                <div className={`justify-self-start ${showSidebar ? "md:hidden" : ""}`}>
                  <BrandMark href={navItems[0]?.href ?? "/"} compact />
                </div>

                <div className="text-center">
                  <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
                  <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 md:justify-self-end">
                  {statusNotice && statusNotice.tone === "warning" ? (
                    <Link
                      href={statusNotice.href}
                      className={getNoticeBadgeClass(statusNotice.tone)}
                    >
                      {statusNotice.compactLabel}
                    </Link>
                  ) : null}
                  <LanguageSwitcher />
                  <LogoutButton />
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div className={showSidebar ? "space-y-3" : "flex flex-col gap-3 md:flex-row md:items-center md:gap-4"}>
                  <div className={showSidebar ? "md:hidden" : ""}>
                    <BrandMark href={navItems[0]?.href ?? "/"} compact />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
                    <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  {statusNotice && statusNotice.tone === "warning" ? (
                    <Link
                      href={statusNotice.href}
                      className={getNoticeBadgeClass(statusNotice.tone)}
                    >
                      {statusNotice.compactLabel}
                    </Link>
                  ) : null}
                  <LanguageSwitcher />
                  <LogoutButton />
                </div>
              </div>
            )}
          </header>

          <main className="min-w-0 flex-1 p-5">{children}</main>
        </div>
      </div>
    </div>
  );
}
