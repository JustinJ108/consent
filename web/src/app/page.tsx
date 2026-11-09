"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthPanel } from "@/components/AuthPanel";
import { DemoAccess } from "@/components/DemoAccess";
import { api, getToken } from "@/lib/api";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) return;
    api
      .me()
      .then(() => router.replace("/dashboard"))
      .catch(() => {
        // Token is stale; the manual sign-in form below lets them recover.
      });
  }, [router]);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-4 py-12 sm:px-6">
      <DemoAccess />

      <div className="mx-auto flex w-full max-w-md items-center gap-3 text-[11px] font-medium uppercase tracking-widest text-zinc-400">
        <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        or use your own account
        <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
      </div>

      <AuthPanel />
    </main>
  );
}
