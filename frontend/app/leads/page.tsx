"use client";

import { useCallback, useEffect, useState } from "react";
import { AppSidebar } from "@/components/sidebar/AppSidebar";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { LeadsFilters } from "@/components/leads/LeadsFilters";
import { LeadsTable } from "@/components/leads/LeadsTable";
import { LeadCard } from "@/components/leads/LeadCard";
import { Pagination } from "@/components/leads/Pagination";
import { ExportButton } from "@/components/leads/ExportButton";
import {
  LeadsLoadingSkeleton,
  LeadsEmptyState,
  LeadsErrorState,
} from "@/components/leads/LeadsStates";
import { listLeads, type LeadsListResponse } from "@/lib/leads";

const DEFAULT_LIMIT = 25;

export default function LeadsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const [data, setData] = useState<LeadsListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasFilters = appliedSearch !== "" || status !== "" || source !== "";

  // Debounce the search input before it is sent to the API. State is only
  // written inside the async setTimeout callback (never in the effect body).
  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      setPage(1);
      setAppliedSearch(searchInput.trim());
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const changeStatus = useCallback((value: string) => {
    setLoading(true);
    setPage(1);
    setStatus(value);
  }, []);

  const changeSource = useCallback((value: string) => {
    setLoading(true);
    setPage(1);
    setSource(value);
  }, []);

  const submitSearch = useCallback(() => {
    setLoading(true);
    setPage(1);
    setAppliedSearch(searchInput.trim());
  }, [searchInput]);

  const changePage = useCallback((value: number) => {
    setLoading(true);
    setPage(value);
  }, []);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  }, []);

  const clearFilters = useCallback(() => {
    setLoading(true);
    setSearchInput("");
    setAppliedSearch("");
    setStatus("");
    setSource("");
    setPage(1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    listLeads(
      {
        search: appliedSearch || undefined,
        status: status || undefined,
        source: source || undefined,
        page,
        limit: DEFAULT_LIMIT,
      },
      controller.signal
    )
      .then((res) => {
        setData(res);
        setError(null);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setData(null);
        setError(e instanceof Error ? e.message : "Failed to load leads");
        setLoading(false);
      });

    return () => controller.abort();
  }, [appliedSearch, status, source, page, reloadKey]);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
      <AppSidebar activeTab="Manage Leads" onTabChange={() => {}} />

      <main className="ml-60 flex-1 flex flex-col min-h-screen">
        {/* Page header */}
        <div className="flex items-start justify-between px-8 pt-8 pb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Leads</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Search, filter, and export your imported leads.
            </p>
          </div>
          <ThemeToggle />
        </div>

        <div className="px-8 flex-1 flex flex-col gap-4">
          {/* Filters + actions */}
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm space-y-4">
            <LeadsFilters
              search={searchInput}
              onSearchChange={setSearchInput}
              onSearchSubmit={submitSearch}
              status={status}
              onStatusChange={changeStatus}
              source={source}
              onSourceChange={changeSource}
            />

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-gray-100 dark:border-gray-800 pt-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {data ? (
                  <>
                    <span className="font-bold text-gray-900 dark:text-white">{data.total}</span>{" "}
                    {data.total === 1 ? "lead" : "leads"}
                  </>
                ) : (
                  "Loading leads…"
                )}
              </p>
              <ExportButton
                query={{
                  search: appliedSearch || undefined,
                  status: status || undefined,
                  source: source || undefined,
                }}
                disabled={loading}
              />
            </div>
          </div>

          {/* Results */}
          {loading ? (
            <LeadsLoadingSkeleton />
          ) : error ? (
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
              <LeadsErrorState message={error} onRetry={retry} />
            </div>
          ) : !data || data.leads.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
              <LeadsEmptyState hasFilters={hasFilters} onReset={clearFilters} />
            </div>
          ) : (
            <>
              {/* Cards on mobile / table on larger screens */}
              <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.leads.map((lead) => (
                  <LeadCard key={lead.id} lead={lead} />
                ))}
              </div>

              <div className="hidden lg:block rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
                <LeadsTable leads={data.leads} />
              </div>

              {/* Pagination */}
              <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4 shadow-sm">
                <Pagination
                  page={data.page}
                  limit={data.limit}
                  total={data.total}
                  onPageChange={changePage}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer spacer */}
        <div className="h-8" />
      </main>
    </div>
  );
}
