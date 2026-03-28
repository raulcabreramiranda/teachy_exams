import Image from "next/image";
import Link from "next/link";

type BrandMarkProps = {
  href?: string;
  compact?: boolean;
  className?: string;
};

export function BrandMark({
  href,
  compact = false,
  className = "",
}: BrandMarkProps) {
  const imageSize = compact ? 36 : 44;
  const content = (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      <Image
        src="/brand/teachy-logo.jpg"
        alt="Teachy logo"
        width={imageSize}
        height={imageSize}
        className="rounded-full border border-slate-200 bg-white object-cover shadow-sm"
        priority
      />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Teachy
        </p>
        <p className="text-base font-semibold text-slate-900">
          Exams
        </p>
      </div>
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="inline-flex">
      {content}
    </Link>
  );
}
