"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, setToken } from "@/lib/api";

type Mode = "login" | "register";

export function AuthPanel() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "register") {
        const result = await api.register({ orgName, email, password });
        setToken(result.token);
      } else {
        const result = await api.login({ email, password });
        setToken(result.token);
      }
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold tracking-tight">
            {mode === "login" ? "Sign in" : "Register an organization"}
          </h2>
          {mode === "register" && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Create a new organization and become its first admin.
            </p>
          )}
        </div>

        {mode === "register" && (
          <label className="flex flex-col gap-1 text-sm font-medium">
            Organization name
            <input
              required
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Riverside Shelter"
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
        )}

        <label className="flex flex-col gap-1 text-sm font-medium">
          Email
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@riverside.org"
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Password
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "register" ? "At least 8 characters" : "••••••••"}
            minLength={mode === "register" ? 8 : undefined}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy
            ? "Working…"
            : mode === "login"
              ? "Sign in"
              : "Create organization"}
        </button>

        <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
          {mode === "login" ? "New here?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError(null);
            }}
            className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
          >
            {mode === "login" ? "Register an organization" : "Sign in"}
          </button>
        </p>
      </form>
    </div>
  );
}
