"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearToken } from "@/lib/api";
import type { Me } from "@/lib/types";

export function AppHeader({ me }: { me: Me }) {
  const router = useRouter();

  return (
    <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-sm font-bold text-white">
            C
          </span>
          <span className="text-sm font-bold tracking-tight">Consent Hub</span>
        </Link>

        <div className="flex items-center gap-3 text-xs">
          <div className="hidden text-right sm:block">
            <p className="font-semibold text-zinc-800 dark:text-zinc-200">
              {me.org.name}
            </p>
            <p className="text-zinc-500 dark:text-zinc-400">
              {me.email} · {me.role}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              clearToken();
              router.replace("/");
            }}
            className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
