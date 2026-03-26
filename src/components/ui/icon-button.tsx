import Link from "next/link";

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
  default:
    "border-slate-300 bg-white text-slate-600 hover:border-slate-900 hover:text-slate-900",
  danger:
    "border-rose-200 bg-white text-rose-600 hover:border-rose-500 hover:text-rose-700",
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
  const className = `inline-flex h-8 w-8 items-center justify-center rounded-md border text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${variantClassNames[variant]}`;

  if (href) {
    return (
      <Link href={href} aria-label={label} title={label} className={className}>
        <span className="h-4 w-4">{icon}</span>
      </Link>
    );
  }

  return (
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
  );
}
