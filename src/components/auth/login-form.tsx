"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { showErrorAlert, showSuccessAlert } from "@/lib/sweetalert";

export function LoginForm() {
  const t = useTranslations("Login");
  const router = useRouter();
  const [email, setEmail] = useState("teacher@teachy.test");
  const [password, setPassword] = useState("password123");
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const body = (await response.json().catch(() => null)) as
      | { message?: string; redirectTo?: string }
      | null;

    setIsPending(false);

    if (!response.ok) {
      await showErrorAlert({
        title: t("unableToSignIn"),
        text: body?.message ?? t("checkCredentials"),
      });
      return;
    }

    await showSuccessAlert({
      title: t("signedIn"),
      text: t("redirecting"),
      timer: 900,
    });

    router.push(body?.redirectTo ?? "/");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="app-card space-y-5 p-6"
    >
      <div className="space-y-1">
        <h1 className="text-lg font-semibold text-slate-900">{t("title")}</h1>
        <p className="text-sm text-slate-500">{t("subtitle")}</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          {t("email")}
        </label>
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          className="app-input"
          placeholder="teacher@teachy.test"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          {t("password")}
        </label>
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          className="app-input"
          placeholder="password123"
          required
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="app-button-primary w-full px-3 py-2"
      >
        {isPending ? t("signingIn") : t("signIn")}
      </button>

      <div className="app-panel px-3 py-3 text-xs text-slate-600">
        <p className="font-medium text-slate-700">{t("seededAccounts")}</p>
        <p className="mt-1">{t("teacherAccount")}</p>
        <p>{t("studentAccounts")}</p>
      </div>
    </form>
  );
}
