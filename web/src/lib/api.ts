import type {
  AuditEntry,
  Category,
  Client,
  ClientDetail,
  Consent,
  Me,
  Organization,
} from "./types";

const TOKEN_KEY = "consent.token";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

function extractErrorMessage(payload: unknown, status: number): string {
  const error = (payload as { error?: unknown } | null)?.error;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const fieldErrors = (error as { fieldErrors?: Record<string, string[]> })
      .fieldErrors;
    if (fieldErrors) {
      const parts = Object.entries(fieldErrors)
        .filter(([, messages]) => messages?.length)
        .map(([field, messages]) => `${field}: ${messages.join(", ")}`);
      if (parts.length) return parts.join("; ");
    }
    const formErrors = (error as { formErrors?: string[] }).formErrors;
    if (formErrors?.length) return formErrors.join("; ");
  }
  return `Request failed (${status})`;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body !== undefined) headers.set("Content-Type", "application/json");

  const res = await fetch(`/api${path}`, { ...init, headers });
  const text = await res.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!res.ok) {
    throw new ApiError(extractErrorMessage(payload, res.status), res.status);
  }
  return payload as T;
}

export const api = {
  register(input: { orgName: string; email: string; password: string }) {
    return request<{ token: string; org: { id: string; name: string } }>(
      "/auth/register",
      { method: "POST", body: JSON.stringify(input) },
    );
  },

  login(input: { email: string; password: string }) {
    return request<{ token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  me() {
    return request<Me>("/auth/me");
  },

  listClients() {
    return request<Client[]>("/clients");
  },

  createClient(fullName: string) {
    return request<Client>("/clients", {
      method: "POST",
      body: JSON.stringify({ fullName }),
    });
  },

  getClient(id: string) {
    return request<ClientDetail>(`/clients/${id}`);
  },

  upsertRecord(id: string, category: Category, data: Record<string, unknown>) {
    return request<unknown>(`/clients/${id}/records`, {
      method: "PUT",
      body: JSON.stringify({ category, data }),
    });
  },

  listConsents(clientId: string) {
    return request<Consent[]>(`/consents/client/${clientId}`);
  },

  grantConsent(input: {
    clientId: string;
    orgId: string;
    category: Category;
    expiresAt?: string | null;
  }) {
    return request<Consent>("/consents", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  revokeConsent(id: string) {
    return request<Consent>(`/consents/${id}`, { method: "DELETE" });
  },

  getAuditLog(clientId: string) {
    return request<AuditEntry[]>(`/audit-log/client/${clientId}`);
  },

  listOrganizations() {
    return request<Organization[]>("/organizations");
  },
};
