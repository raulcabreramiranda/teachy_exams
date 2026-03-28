import { getRichTextPreview, sanitizeRichTextHtml } from "@/lib/rich-text";

type RichTextContentProps = {
  html: string;
  className?: string;
  emptyFallback?: string;
};

const baseClassName = [
  "text-slate-900",
  "[&_p]:my-0",
  "[&_p+p]:mt-2",
  "[&_div]:my-0",
  "[&_div+div]:mt-2",
  "[&_ul]:my-2",
  "[&_ul]:list-disc",
  "[&_ul]:pl-5",
  "[&_ol]:my-2",
  "[&_ol]:list-decimal",
  "[&_ol]:pl-5",
  "[&_li]:my-1",
  "[&_strong]:font-semibold",
  "[&_em]:italic",
  "[&_u]:underline",
].join(" ");

export function RichTextContent({
  html,
  className,
  emptyFallback,
}: RichTextContentProps) {
  const sanitizedHtml = sanitizeRichTextHtml(html);

  if (getRichTextPreview(sanitizedHtml).length === 0) {
    return emptyFallback ? (
      <div className={className}>{emptyFallback}</div>
    ) : null;
  }

  return (
    <div
      className={[baseClassName, className].filter(Boolean).join(" ")}
      dangerouslySetInnerHTML={{
        __html: sanitizedHtml,
      }}
    />
  );
}
