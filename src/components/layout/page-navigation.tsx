import { BackButton } from "@/components/layout/back-button";
import { Link } from "@/i18n/navigation";

type PageNavigationLink = {
  href: string;
  label: string;
  variant?: "primary" | "secondary";
};

type PageNavigationProps = {
  backHref: string;
  backLabel?: string;
  links?: PageNavigationLink[];
  className?: string;
};

export function PageNavigation({
  backHref,
  backLabel,
  links = [],
  className = "",
}: PageNavigationProps) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`.trim()}>
      <BackButton fallbackHref={backHref} label={backLabel} />

      {links.map((link) => (
        <Link
          key={`${link.href}-${link.label}`}
          href={link.href}
          className={
            link.variant === "primary"
              ? "app-button-primary px-3 py-2"
              : "app-button-secondary px-3 py-2"
          }
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}
