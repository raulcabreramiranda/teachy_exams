"use client";

import { useTranslations } from "next-intl";

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  maxWidthClassName?: string;
  children: React.ReactNode;
};

export function Modal({
  open,
  title,
  onClose,
  maxWidthClassName = "max-w-lg",
  children,
}: ModalProps) {
  const t = useTranslations("Common");

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div
        className={`app-card flex max-h-[90vh] w-full flex-col overflow-hidden shadow-xl shadow-slate-900/10 ${maxWidthClassName}`}
      >
        <div className="app-card-header flex items-center justify-between px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="app-button-secondary px-2 py-1 text-xs"
          >
            {t("close")}
          </button>
        </div>
        <div className="overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
