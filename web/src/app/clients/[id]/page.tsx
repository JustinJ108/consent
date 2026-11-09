"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  isConsentActive,
  type AuditEntry,
  type Category,
  type ClientDetail,
  type Consent,
  type Organization,
} from "@/lib/types";
import { useSession } from "@/lib/useSession";
import { AppHeader } from "@/components/AppHeader";
import { CategoryBadge } from "@/components/CategoryBadge";
import { RecordEditor } from "@/components/RecordEditor";

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { me, loading } = useSession();

  const [detail, setDetail] = useState<ClientDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);

  const [consents, setConsents] = useState<Consent[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [audit, setAudit] = useState<AuditEntry[] | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);

  const isOwner = detail?.isOwner ?? false;

  const orgNameById = useMemo(() => {
    const map = new Map<string, string>();
    // The organizations endpoint excludes the caller's own org (it powers the
    // "grant consent to..." picker), but audit rows from the owning org still
    // need a readable name.
    if (me) map.set(me.org.id, me.org.name);
    for (const org of orgs) map.set(org.id, org.name);
    return map;
  }, [orgs, me]);

  const loadDetail = useCallback(async () => {
    const next = await api.getClient(id);
    setDetail(next);
    return next;
  }, [id]);

  const loadConsents = useCallback(async () => {
    setConsents(await api.listConsents(id));
  }, [id]);

  useEffect(() => {
    if (!me) return;
    const currentMe = me;
    let cancelled = false;

    async function load() {
      setLoadingDetail(true);
      try {
        const next = await api.getClient(id);
        if (cancelled) return;
        setDetail(next);
        setDetailError(null);

        if (next.isOwner) {
          try {
            const rows = await api.listConsents(id);
            if (!cancelled) setConsents(rows);
          } catch {
            // Non-fatal: the consent panel just stays empty.
          }

          try {
            const list = await api.listOrganizations();
            if (!cancelled) setOrgs(list);
          } catch {
            // Non-fatal.
          }

          if (currentMe.role === "admin") {
            try {
              const entries = await api.getAuditLog(id);
              if (!cancelled) setAudit(entries);
            } catch (err) {
              if (!cancelled) {
                setAuditError(
                  err instanceof Error ? err.message : "Failed to load audit log",
                );
              }
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          setDetailError(
            err instanceof Error ? err.message : "Failed to load client",
          );
        }
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [id, me]);

  const handleSaveRecord = useCallback(
    async (category: Category, data: Record<string, unknown>) => {
      await api.upsertRecord(id, category, data);
      await loadDetail();
    },
    [id, loadDetail],
  );

  async function handleRevoke(consentId: string) {
    await api.revokeConsent(consentId);
    await loadConsents();
  }

  if (loading || !me) {
    return (
      <div className="grid flex-1 place-items-center p-10 text-sm text-zinc-500">
        Loading…
      </div>
    );
  }

  return (
    <>
      <AppHeader me={me} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/dashboard"
          className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          ← Back to clients
        </Link>

        {loadingDetail && (
          <p className="mt-6 text-sm text-zinc-500">Loading client…</p>
        )}

        {detailError && (
          <p className="mt-6 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
            {detailError}
          </p>
        )}

        {detail && (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                {detail.fullName}
              </h1>
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  isOwner
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300"
                }`}
              >
                {isOwner ? "Owning organization" : "Shared with your org"}
              </span>
            </div>
            <p className="mt-1 font-mono text-[11px] text-zinc-400">{detail.id}</p>

            {!isOwner && (
              <p className="mt-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200">
                You are viewing this client through active consent. Only the
                categories your organization has been granted appear below, and
                this view is read-only. Every access is written to the owning
                organization&apos;s audit log.
              </p>
            )}

            <ClientRecords
              detail={detail}
              isOwner={isOwner}
              onSave={handleSaveRecord}
            />

            {isOwner && (
              <ConsentPanel
                clientId={id}
                consents={consents}
                orgs={orgs}
                orgNameById={orgNameById}
                onRevoked={handleRevoke}
                onChanged={loadConsents}
              />
            )}

            {isOwner && (
              <AuditPanel
                role={me.role}
                audit={audit}
                auditError={auditError}
                orgNameById={orgNameById}
              />
            )}
          </>
        )}
      </main>
    </>
  );
}

function ClientRecords({
  detail,
  isOwner,
  onSave,
}: {
  detail: ClientDetail;
  isOwner: boolean;
  onSave: (category: Category, data: Record<string, unknown>) => Promise<void>;
}) {
  if (isOwner) {
    return (
      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Client records
        </h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          As the owning organization you can read and write every category. Each
          save writes a record to the audit log.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {CATEGORIES.map((category) => (
            <div
              key={category}
              className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  {CATEGORY_LABELS[category]}
                </h3>
                <CategoryBadge category={category} />
              </div>
              <RecordEditor
                category={category}
                initial={detail.records[category]}
                onSave={onSave}
              />
            </div>
          ))}
        </div>
      </section>
    );
  }

  const visible = CATEGORIES.filter((category) => detail.records[category]);
  const withheld = CATEGORIES.length - visible.length;

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Consented categories
        </h2>
        <span className="text-xs text-zinc-500">
          {visible.length} visible · {withheld} not shared
        </span>
      </div>

      {visible.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          This client exists, but no category data has been shared with your
          organization yet.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {visible.map((category) => (
            <div
              key={category}
              className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  {CATEGORY_LABELS[category]}
                </h3>
                <CategoryBadge category={category} />
              </div>
              <pre className="max-h-48 overflow-auto rounded-lg bg-zinc-950 p-3 font-mono text-xs leading-relaxed text-emerald-300">
                {JSON.stringify(detail.records[category], null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ConsentPanel({
  clientId,
  consents,
  orgs,
  orgNameById,
  onRevoked,
  onChanged,
}: {
  clientId: string;
  consents: Consent[];
  orgs: Organization[];
  orgNameById: Map<string, string>;
  onRevoked: (id: string) => Promise<void>;
  onChanged: () => Promise<void>;
}) {
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [category, setCategory] = useState<Category>("contact");
  const [expiresAt, setExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const orgId = selectedOrgId || orgs[0]?.id || "";

  async function handleGrant(event: React.FormEvent) {
    event.preventDefault();
    if (!orgId) {
      setError("No other organization is registered yet.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.grantConsent({
        clientId,
        orgId,
        category,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      });
      setExpiresAt("");
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to grant consent");
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke(consentId: string) {
    setRevokingId(consentId);
    setError(null);
    try {
      await onRevoked(consentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke consent");
    } finally {
      setRevokingId(null);
    }
  }

  const sorted = [...consents].sort(
    (a, b) => new Date(b.grantedAt).getTime() - new Date(a.grantedAt).getTime(),
  );

  return (
    <section className="mt-10">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Consent
      </h2>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Grant another organization read access to one category, with an optional
        expiry. Revocation takes effect immediately.
      </p>

      <form
        onSubmit={handleGrant}
        className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:grid-cols-4 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <label className="flex flex-col gap-1 text-xs font-medium">
          Organization
          <select
            value={orgId}
            onChange={(e) => setSelectedOrgId(e.target.value)}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm font-normal dark:border-zinc-700 dark:bg-zinc-950"
          >
            {orgs.length === 0 && <option value="">No other orgs</option>}
            {orgs.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium">
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm font-normal dark:border-zinc-700 dark:bg-zinc-950"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium">
          Expires (optional)
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm font-normal dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>

        <button
          type="submit"
          disabled={busy || orgs.length === 0}
          className="mt-5 h-9 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Granting…" : "Grant consent"}
        </button>
      </form>

      {error && (
        <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <ul className="mt-4 divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
        {sorted.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-zinc-500">
            No consent has been granted for this client yet.
          </li>
        )}
        {sorted.map((consent) => {
          const active = isConsentActive(consent);
          return (
            <li
              key={consent.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {orgNameById.get(consent.orgId) ?? consent.orgId.slice(0, 8)}
                  </span>
                  <CategoryBadge category={consent.category} />
                  <StatusPill active={active} consent={consent} />
                </div>
                <span className="text-[11px] text-zinc-500">
                  Granted {new Date(consent.grantedAt).toLocaleString()}
                  {consent.expiresAt
                    ? ` · expires ${new Date(consent.expiresAt).toLocaleString()}`
                    : " · no expiry"}
                </span>
              </div>

              {active && (
                <button
                  type="button"
                  onClick={() => handleRevoke(consent.id)}
                  disabled={revokingId === consent.id}
                  className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950"
                >
                  {revokingId === consent.id ? "Revoking…" : "Revoke"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function StatusPill({
  active,
  consent,
}: {
  active: boolean;
  consent: Consent;
}) {
  if (active) {
    return (
      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
        Active
      </span>
    );
  }
  const label = consent.revokedAt ? "Revoked" : "Expired";
  return (
    <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
      {label}
    </span>
  );
}

function AuditPanel({
  role,
  audit,
  auditError,
  orgNameById,
}: {
  role: "admin" | "caseworker";
  audit: AuditEntry[] | null;
  auditError: string | null;
  orgNameById: Map<string, string>;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Access history
      </h2>

      {role !== "admin" ? (
        <p className="mt-2 rounded-xl border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          Only admins can view the audit log.
        </p>
      ) : auditError ? (
        <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
          {auditError}
        </p>
      ) : audit === null ? (
        <p className="mt-2 text-sm text-zinc-500">Loading audit log…</p>
      ) : audit.length === 0 ? (
        <p className="mt-2 rounded-xl border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          No access recorded yet.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-200 shadow-sm dark:border-zinc-800">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              <tr>
                <th className="px-3 py-2 font-semibold">When</th>
                <th className="px-3 py-2 font-semibold">Organization</th>
                <th className="px-3 py-2 font-semibold">Action</th>
                <th className="px-3 py-2 font-semibold">Category</th>
                <th className="px-3 py-2 font-semibold">Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-900">
              {audit.map((entry) => (
                <tr key={entry.id}>
                  <td className="whitespace-nowrap px-3 py-2 text-zinc-600 dark:text-zinc-300">
                    {new Date(entry.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                    {orgNameById.get(entry.orgId) ?? entry.orgId.slice(0, 8)}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-zinc-600 dark:text-zinc-300">
                    {entry.action}
                  </td>
                  <td className="px-3 py-2">
                    {entry.category ? (
                      <CategoryBadge category={entry.category} />
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        entry.allowed
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                      }`}
                    >
                      {entry.allowed ? "Allowed" : "Denied"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
