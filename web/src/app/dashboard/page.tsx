"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Client } from "@/lib/types";
import { useSession } from "@/lib/useSession";
import { AppHeader } from "@/components/AppHeader";

export default function DashboardPage() {
  const { me, loading } = useSession();
  const [clients, setClients] = useState<Client[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    try {
      setClients(await api.listClients());
      setListError(null);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Failed to load clients");
    }
  }, []);

  useEffect(() => {
    if (!me) return;
    let cancelled = false;

    (async () => {
      try {
        const rows = await api.listClients();
        if (!cancelled) {
          setClients(rows);
          setListError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setListError(
            err instanceof Error ? err.message : "Failed to load clients",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [me]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    setCreateError(null);
    try {
      await api.createClient(trimmed);
      setName("");
      await loadClients();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create client");
    } finally {
      setCreating(false);
    }
  }

  if (loading || !me) {
    return (
      <div className="grid flex-1 place-items-center p-10 text-sm text-zinc-500">
        Loading…
      </div>
    );
  }

  const owned = clients.filter((c) => c.ownerOrgId === me.org.id);
  const shared = clients.filter((c) => c.ownerOrgId !== me.org.id);

  return (
    <>
      <AppHeader me={me} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Master records your organization owns, plus records other
            organizations have shared with you via active consent.
          </p>
        </div>

        <form
          onSubmit={handleCreate}
          className="mt-6 flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center dark:border-zinc-800 dark:bg-zinc-900"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New client full name"
            className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-950"
          />
          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? "Creating…" : "Create client"}
          </button>
        </form>

        {createError && (
          <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
            {createError}
          </p>
        )}

        {listError && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
            {listError}
          </p>
        )}

        <div className="mt-8 flex flex-col gap-6">
          <section>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Owned by {me.org.name}
              </h2>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {owned.length}
              </span>
            </div>
            {owned.length === 0 ? (
              <EmptyRow text="No client records yet. Create one above to get started." />
            ) : (
              <ClientGrid clients={owned} owned />
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Shared with you
              </h2>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {shared.length}
              </span>
            </div>
            {shared.length === 0 ? (
              <EmptyRow text="No other organization has granted your org consent yet." />
            ) : (
              <ClientGrid clients={shared} owned={false} />
            )}
          </section>
        </div>
      </main>
    </>
  );
}

function ClientGrid({ clients, owned }: { clients: Client[]; owned: boolean }) {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {clients.map((client) => (
        <li key={client.id}>
          <Link
            href={`/clients/${client.id}`}
            className="flex h-full flex-col justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-colors hover:border-blue-400 hover:shadow dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-blue-600"
          >
            <div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                {client.fullName}
              </p>
              <p className="mt-1 font-mono text-[11px] text-zinc-400">
                {client.id}
              </p>
            </div>
            <span
              className={`inline-block w-fit rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                owned
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300"
              }`}
            >
              {owned ? "Owner" : "Read-only share"}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
      {text}
    </p>
  );
}
