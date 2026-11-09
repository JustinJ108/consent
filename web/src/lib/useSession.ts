"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, clearToken, getToken } from "@/lib/api";
import type { Me } from "@/lib/types";

export function useSession() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!getToken()) {
        router.replace("/");
        return;
      }
      try {
        const info = await api.me();
        if (!cancelled) {
          setMe(info);
          setLoading(false);
        }
      } catch (err) {
        clearToken();
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Session expired");
          router.replace("/");
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return { me, loading, error };
}
