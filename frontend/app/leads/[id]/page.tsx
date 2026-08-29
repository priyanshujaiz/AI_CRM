"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppSidebar } from "@/components/sidebar/AppSidebar";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { LeadDetail } from "@/components/leads/LeadDetail";
import { LeadsErrorState } from "@/components/leads/LeadsStates";
import { getLead, LeadNotFoundError, type Lead } from "@/lib/leads";

/** Full-page loading skeleton for the detail view. */
function DetailSkeleton() {
  return (
    <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Loading lead">
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm space-y-3">
        <div className="h-6 w-48 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="h-4 w-72 rounded bg-gray-100 dark:bg-gray-800" />
        <div className="h-4 w-56 rounded bg-gray-100 dark:bg-gray-800" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-2"
          >
            <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-3 w-28 rounded bg-gray-100 dark:bg-gray-800" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Not-found state for a missing lead (HTTP 404). */
function DetailNotFound({ id }: { id: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h3 className="font-bold text-gray-900 dark:text-white text-lg">Lead not found</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-sm leading-relaxed">
        We could not find lead{" "}
        <span className="font-mono text-gray-700 dark:text-gray-300">{id}</span>. It may have been
        removed.
      </p>
      <Link
        href="/leads"
        className="mt-6 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
        style={{ backgroundColor: "#0F6E56" }}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Leads
      </Link>
    </div>
  );
}

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();

  const [lead, setLead] = useState<Lead | null>(null);
  const [loadedForId, setLoadedForId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Fetch whenever the id or a retry changes. All state updates happen in the
  // async callbacks (never synchronously in the effect body).
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();

    getLead(id, controller.signal)
      .then((data) => {
        setLead(data);
        setLoadedForId(id);
        setNotFound(false);
        setError(null);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setLead(null);
        setLoadedForId(id);
        setNotFound(e instanceof LeadNotFoundError);
        setError(
          e instanceof LeadNotFoundError
            ? null
            : e instanceof Error
              ? e.message
              : "Failed to load lead"
        );
        setLoading(false);
      });

    return () => controller.abort();
  }, [id, reloadKey]);

  const retry = useCallback(() => {
    setLoading(true);
    setNotFound(false);
    setError(null);
    setReloadKey((k) => k + 1);
  }, []);

  const showSkeleton =
    loading || (lead !== null && lead !== undefined && loadedForId !== id);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
      <AppSidebar activeTab="Manage Leads" onTabChange={() => {}} />

      <main className="ml-60 flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-8 pb-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/leads")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Lead Details</h1>
          </div>
          <ThemeToggle />
        </div>

        <div className="px-8 flex-1">
          {showSkeleton ? (
            <DetailSkeleton />
          ) : notFound ? (
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
              <DetailNotFound id={id} />
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
              <LeadsErrorState message={error} onRetry={retry} />
            </div>
          ) : lead ? (
            <LeadDetail lead={lead} />
          ) : (
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
              <DetailNotFound id={id} />
            </div>
          )}
        </div>

        <div className="h-8" />
      </main>
    </div>
  );
}
