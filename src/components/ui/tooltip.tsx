type TooltipProps = {
  content: string;
  children: React.ReactNode;
};

export function Tooltip({ content, children }: TooltipProps) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span className="pointer-events-none absolute left-1/2 top-0 z-20 hidden -translate-x-1/2 -translate-y-[calc(100%+8px)] whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white shadow-sm group-hover:block group-focus-within:block">
        {content}
      </span>
    </span>
  );
}
