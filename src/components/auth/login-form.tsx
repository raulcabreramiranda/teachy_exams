"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { showErrorAlert, showSuccessAlert } from "@/lib/sweetalert";

export function LoginForm() {
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
        title: "Unable to sign in",
        text: body?.message ?? "Check the provided credentials and try again.",
      });
      return;
    }

    await showSuccessAlert({
      title: "Signed in",
      text: "Redirecting to your dashboard.",
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
        <h1 className="text-lg font-semibold text-slate-900">Sign in</h1>
        <p className="text-sm text-slate-500">Use one of the seeded accounts below.</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Email
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
          Password
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
        {isPending ? "Signing in..." : "Sign in"}
      </button>

      <div className="app-panel px-3 py-3 text-xs text-slate-600">
        <p className="font-medium text-slate-700">Seeded accounts</p>
        <p className="mt-1">Teacher: teacher@teachy.test / password123</p>
        <p>Students: bob@teachy.test or carol@teachy.test / password123</p>
      </div>
    </form>
  );
}
