import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function PlusIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <path d="M8 3.25v9.5M3.25 8h9.5" />
    </svg>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <path d="M11.8 2.8a1.5 1.5 0 1 1 2.1 2.1L6 12.8 2.5 13.5l.7-3.5 8.6-7.2Z" />
    </svg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <path d="M2.75 4.25h10.5" />
      <path d="M6.25 2.75h3.5" />
      <path d="M4 4.25V12a1.25 1.25 0 0 0 1.25 1.25h5.5A1.25 1.25 0 0 0 12 12V4.25" />
      <path d="M6.5 6.5v4M9.5 6.5v4" />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <path d="m3.5 6 4.5 4 4.5-4" />
    </svg>
  );
}

export function ArrowUpIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <path d="M8 12.5v-9" />
      <path d="M4.5 7 8 3.5 11.5 7" />
    </svg>
  );
}

export function ArrowDownIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <path d="M8 3.5v9" />
      <path d="m4.5 9 3.5 3.5L11.5 9" />
    </svg>
  );
}
