"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";

export function LogoutButton() {
  const t = useTranslations("Common");
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleLogout() {
    setIsPending(true);

    const response = await fetch("/api/auth/logout", {
      method: "POST",
    });

    setIsPending(false);

    if (!response.ok) {
      return;
    }

    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isPending}
      className="app-button-secondary px-3 py-1.5 text-xs"
    >
      {isPending ? t("signingOut") : t("signOut")}
    </button>
  );
}
