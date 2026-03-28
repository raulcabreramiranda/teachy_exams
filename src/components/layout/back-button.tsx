"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

type BackButtonProps = {
  fallbackHref: string;
  label?: string;
  className?: string;
};

export function BackButton({
  fallbackHref,
  label,
  className = "app-button-secondary px-3 py-2",
}: BackButtonProps) {
  const t = useTranslations("Common");
  const router = useRouter();

  function handleClick() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  }

  return (
    <button type="button" onClick={handleClick} className={className}>
      {label ?? t("back")}
    </button>
  );
}
