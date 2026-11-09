"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, setToken } from "@/lib/api";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/demo";

/**
 * One-click demo entry. Each button signs into a pre-seeded organization so
 * you can jump between orgs in two browser windows without typing anything.
 */
export function DemoAccess() {
  const router = useRouter();
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(email: string) {
    setError(null);
    setBusyEmail(email);
    try {
      const { token } = await api.login({ email, password: DEMO_PASSWORD });
      setToken(token);
      router.replace("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Demo sign-in failed — did you run `npm run demo:seed`?",
      );
      setBusyEmail(null);
    }
  }

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
          Consent Hub
        </p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          See consent-aware sharing in action
        </h1>
        <p className="mx-auto max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
          Pick an organization below to enter the pre-seeded demo. Records are
          shared category by category, only while the client&apos;s consent is
          active — and every allowed and denied read is audited.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {DEMO_ACCOUNTS.map((account) => {
          const busy = busyEmail === account.email;
          return (
            <button
              key={account.email}
              type="button"
              onClick={() => signIn(account.email)}
              disabled={busyEmail !== null}
              className="group flex h-full flex-col items-start gap-2 rounded-xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-blue-400 hover:shadow disabled:cursor-not-allowed disabled:opacity-70 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-blue-600"
            >
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {account.org}
              </span>
              <span className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                {account.blurb}
              </span>
              <span className="mt-auto text-[11px] font-medium text-blue-600 dark:text-blue-400">
                {busy ? "Signing in…" : "Enter demo →"}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="mx-auto w-full max-w-xl rounded-md bg-red-50 px-3 py-2 text-center text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="mx-auto flex w-full max-w-xl flex-col gap-1 rounded-lg border border-dashed border-zinc-300 px-4 py-3 text-center text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        <p>
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">
            Demo tip:
          </span>{" "}
          open Riverside and Harbor in two separate windows, then grant or
          revoke a consent in Riverside and refresh Harbor.
        </p>
        <p>
          Password for every demo account:{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[11px] dark:bg-zinc-800">
            {DEMO_PASSWORD}
          </code>
        </p>
      </div>
    </section>
  );
}
