"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthPanel } from "@/components/AuthPanel";
import { api, getToken } from "@/lib/api";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) return;
    api
      .me()
      .then(() => router.replace("/dashboard"))
      .catch(() => {
        // Token is stale; AuthPanel will let them sign in again.
      });
  }, [router]);

  return <AuthPanel />;
}
