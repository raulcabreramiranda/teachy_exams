import { Tooltip } from "@/components/ui/tooltip";
import { Link } from "@/i18n/navigation";

type IconButtonProps = {
  label: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
  type?: "button" | "submit";
};

const variantClassNames = {
  default: "app-icon-button",
  danger: "app-button-danger",
};

export function IconButton({
  label,
  icon,
  href,
  onClick,
  variant = "default",
  disabled,
  type = "button",
}: IconButtonProps) {
  const className = `h-8 w-8 text-sm ${variantClassNames[variant]}`;

  if (href) {
    return (
      <Tooltip content={label}>
        <Link href={href} aria-label={label} title={label} className={className}>
          <span className="h-4 w-4">{icon}</span>
        </Link>
      </Tooltip>
    );
  }

  return (
    <Tooltip content={label}>
      <button
        type={type}
        onClick={onClick}
        aria-label={label}
        title={label}
        disabled={disabled}
        className={className}
      >
        <span className="h-4 w-4">{icon}</span>
      </button>
    </Tooltip>
  );
}
