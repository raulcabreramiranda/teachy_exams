"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
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
      {isPending ? "Signing out..." : "Sign out"}
    </button>
  );
}
