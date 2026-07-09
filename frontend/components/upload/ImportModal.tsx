"use client";

import { useState, useCallback, useRef, Fragment } from "react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import { X, Upload, Download, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { StatusBadge } from "../tables/StatusBadge";

export interface CrmRecord {
  created_at: string;
  name: string;
  email: string;
  country_code: string;
  mobile_without_country_code: string;
  company: string;
  city: string;
  state: string;
  country: string;
  lead_owner: string;
  crm_status: string;
  crm_note: string;
  data_source: string;
  possession_time: string;
  description: string;
}

export interface SkippedRecord {
  rowIndex: number;
  raw: Record<string, string>;
  reason: string;
}

export interface ImportResponse {
  success: boolean;
  totalRows: number;
  totalImported: number;
  totalSkipped: number;
  imported: CrmRecord[];
  skipped: SkippedRecord[];
}

interface ImportModalProps {
  onImportSuccess: (importedLeads: CrmRecord[], skippedLeads: SkippedRecord[]) => void;
}

export function ImportModal({ onImportSuccess }: ImportModalProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [results, setResults] = useState<ImportResponse | null>(null);
  const [resultTab, setResultTab] = useState<"imported" | "skipped">("imported");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [expandedResultRow, setExpandedResultRow] = useState<number | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Reset modal state — also closes any open SSE connection
  const resetState = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setFile(null);
    setHeaders([]);
    setRows([]);
    setError(null);
    setIsImporting(false);
    setResults(null);
    setResultTab("imported");
    setProgress(null);
    setExpandedResultRow(null);
  }, []);

  // Handle dropzone file drop
  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      setError(null);

      // Check if any rejected file exists (due to wrong type or limit)
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection.errors[0]?.code === "file-invalid-type") {
          setError("Invalid file type. Please upload a valid .csv file.");
        } else if (rejection.errors[0]?.code === "file-too-large") {
          setError("File too large. Maximum size allowed is 5MB.");
        } else {
          setError(rejection.errors[0]?.message || "Failed to load file.");
        }
        return;
      }

      if (acceptedFiles.length === 0) return;

      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);

      // Parse the CSV locally for previewing
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: "greedy",
        preview: 6, // Parse only first few rows for modal preview performance
        complete: (results) => {
          if (results.errors.length > 0 && results.data.length === 0) {
            setError("Error parsing CSV file. Please make sure the format is valid.");
            setFile(null);
            return;
          }

          if (results.data.length === 0) {
            setError("The uploaded CSV file is empty.");
            setFile(null);
            return;
          }

          const parsedHeaders = results.meta.fields || [];
          if (parsedHeaders.length === 0) {
            setError("No valid headers found in the CSV file.");
            setFile(null);
            return;
          }

          setHeaders(parsedHeaders);
          setRows(results.data as Record<string, string>[]);
        },
        error: (err) => {
          setError(`Parsing error: ${err.message}`);
          setFile(null);
        },
      });
    },
    []
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
    },
    maxSize: 5 * 1024 * 1024, // 5MB limit
    multiple: false,
  });

  const handleConfirmImport = async () => {
    if (!file) return;
    setIsImporting(true);
    setError(null);
    setProgress(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

      // Step 1: POST file → backend returns jobId immediately (202)
      const response = await fetch(`${apiUrl}/api/leads/import`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to start import job.");

      const { jobId } = data as { jobId: string; totalRows: number };

      // Step 2: Open SSE stream to track progress
      const es = new EventSource(`${apiUrl}/api/leads/import/${jobId}/progress`);
      eventSourceRef.current = es;

      es.addEventListener("progress", (e: MessageEvent) => {
        const { batchesDone, batchesTotal } = JSON.parse(e.data);
        setProgress({ done: batchesDone, total: batchesTotal });
      });

      es.addEventListener("done", (e: MessageEvent) => {
        const { result } = JSON.parse(e.data) as { result: ImportResponse };
        setResults(result);
        onImportSuccess(result.imported, result.skipped);
        es.close();
        eventSourceRef.current = null;
        setIsImporting(false);
      });

      es.addEventListener("error", (e: MessageEvent) => {
        const errData = e.data ? JSON.parse(e.data) : null;
        setError(errData?.error || "Import processing failed. Please try again.");
        es.close();
        eventSourceRef.current = null;
        setIsImporting(false);
      });

      // SSE connection-level error (network drop, server unreachable)
      es.onerror = () => {
        if (es.readyState === EventSource.CLOSED) {
          setError("Connection to server was lost. Please try again.");
          eventSourceRef.current = null;
          setIsImporting(false);
        }
      };
    } catch (err: any) {
      setError(err.message || "Failed to import leads.");
      setIsImporting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const downloadSampleCsv = (e: React.MouseEvent) => {
    e.stopPropagation();
    const csvContent = [
      // Headers — intentionally uses "messy" real-world column names to show AI mapping
      ["Lead ID", "Full Name", "Email Address", "Phone Number", "Company Name", "City", "State", "Country", "Lead Status", "Campaign Source", "Remarks", "Created Date"].join(","),
      // Clean row — all fields present
      ["1001", "John Doe", "john.doe@example.com", "+91 9876543210", "GrowEasy", "Mumbai", "Maharashtra", "India", "Good Lead Follow Up", "Google Ads", "Interested in 2BHK. Call on weekdays.", "2026-05-13 14:20:48"].join(","),
      // Messy row — multiple phones, unfamiliar status wording
      ["1002", "Sarah Johnson", "sarah.j@techcorp.com", "+91 9876543211 / 9876543212", "Tech Solutions", "Bangalore", "Karnataka", "India", "Did Not Pick Up", "Facebook Lead Form", "Tried calling twice. Follow up next week.", "13/05/2026"].join(","),
      // Row that will be skipped — no email or phone
      ["1003", "Anonymous Lead", "", "", "", "Delhi", "", "India", "", "Organic", "Only clicked the ad. No contact details.", "May 13 2026"].join(","),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "groweasy_sample_leads.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        id="import-csv-btn"
        onClick={() => {
          resetState();
          setOpen(true);
        }}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors shadow-sm cursor-pointer"
        style={{ backgroundColor: "#D85A30" }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#C04E25")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#D85A30")}
      >
        <Upload className="w-4 h-4" />
        Import Leads via CSV
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && !isImporting && setOpen(false)}
        >
          {/* Modal */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-[700px] max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800 flex flex-col">
            
            {/* Header */}
            <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  {results ? "Import Summary" : "Import Leads via CSV"}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {results 
                    ? "Verify the success stats and review skipped entries below." 
                    : "Upload any CSV format — AI will map your columns to CRM fields."
                  }
                </p>
              </div>
              <button
                disabled={isImporting}
                onClick={() => setOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-white transition-colors ml-4 flex-shrink-0 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto p-6 min-h-0">
              {isImporting ? (
                /* SSE-driven progress state */
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="relative flex items-center justify-center mb-5">
                    <Loader2 className="w-12 h-12 animate-spin" style={{ color: "#0F6E56" }} />
                    <Upload className="w-5 h-5 absolute" style={{ color: "#0F6E56" }} />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">AI is Processing Leads...</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 max-w-xs leading-relaxed">
                    Analyzing headers, mapping messy columns, filtering empty rows, and generating CRM-ready leads.
                  </p>

                  {/* Progress bar */}
                  <div className="w-full max-w-xs mt-6">
                    {progress && progress.total > 0 ? (
                      <>
                        <div className="flex justify-between text-[11px] text-gray-500 dark:text-gray-400 mb-1.5 font-medium">
                          <span>Batch {progress.done} of {progress.total} complete</span>
                          <span>{Math.round((progress.done / progress.total) * 100)}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${(progress.done / progress.total) * 100}%`, backgroundColor: "#0F6E56" }}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-[11px] text-gray-400 dark:text-gray-500 mb-1.5 text-left">Connecting to AI engine...</div>
                        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full w-1/3 animate-pulse" style={{ backgroundColor: "#0F6E56" }} />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : error ? (
                /* Error state */
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-xl flex gap-3 text-red-800 dark:text-red-300">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold">Import Failed</h4>
                    <p className="text-xs mt-1 leading-normal">{error}</p>
                    <button
                      onClick={resetState}
                      className="text-xs font-semibold underline mt-2 hover:opacity-85 cursor-pointer block"
                    >
                      Try uploading another file
                    </button>
                  </div>
                </div>
              ) : results ? (
                /* Results Dashboard View (Phase 6) */
                <div className="flex flex-col gap-5 h-full">
                  
                  {/* Results Metrics Row */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 rounded-xl shadow-sm">
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider">Total Rows</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{results.totalRows}</p>
                    </div>
                    <div className="p-4 bg-green-50/50 dark:bg-green-950/10 border border-green-100/50 dark:border-green-950/30 rounded-xl shadow-sm">
                      <p className="text-[10px] text-green-600 dark:text-green-400 font-semibold uppercase tracking-wider">Imported</p>
                      <p className="text-xl font-bold text-green-700 dark:text-green-300 mt-0.5">{results.totalImported}</p>
                    </div>
                    <div className="p-4 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100/50 dark:border-amber-950/30 rounded-xl shadow-sm">
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider">Skipped</p>
                      <p className="text-xl font-bold text-amber-700 dark:text-amber-300 mt-0.5">{results.totalSkipped}</p>
                    </div>
                  </div>

                  {/* Tabs toggle */}
                  <div className="flex border-b border-gray-150 dark:border-gray-800">
                    <button
                      onClick={() => setResultTab("imported")}
                      className={`pb-2.5 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                        resultTab === "imported"
                          ? "border-brand text-brand dark:text-emerald-400"
                          : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-white"
                      }`}
                      style={resultTab === "imported" ? { borderColor: "#0F6E56", color: "#0F6E56" } : {}}
                    >
                      Imported Leads ({results.totalImported})
                    </button>
                    <button
                      onClick={() => setResultTab("skipped")}
                      className={`pb-2.5 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                        resultTab === "skipped"
                          ? "border-brand text-brand dark:text-emerald-400"
                          : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-white"
                      }`}
                      style={resultTab === "skipped" ? { borderColor: "#0F6E56", color: "#0F6E56" } : {}}
                    >
                      Skipped Leads ({results.totalSkipped})
                    </button>
                  </div>

                  {/* Results Tables content */}
                  <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-gray-900 flex-1 min-h-[220px] flex flex-col">
                    <div className="overflow-x-auto overflow-y-auto max-h-[260px] flex-1">
                      {resultTab === "imported" ? (
                        /* Imported Leads Table */
                        results.imported.length > 0 ? (
                          <table className="w-full text-left border-collapse min-w-[600px]">
                            <thead>
                              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/50 sticky top-0 z-10">
                                <th className="text-[9px] font-bold text-gray-450 dark:text-gray-550 uppercase tracking-wider px-4 py-3 bg-gray-50/50 dark:bg-gray-950/50">Name</th>
                                <th className="text-[9px] font-bold text-gray-450 dark:text-gray-550 uppercase tracking-wider px-4 py-3 bg-gray-50/50 dark:bg-gray-950/50">Email</th>
                                <th className="text-[9px] font-bold text-gray-450 dark:text-gray-550 uppercase tracking-wider px-4 py-3 bg-gray-50/50 dark:bg-gray-950/50">Phone</th>
                                <th className="text-[9px] font-bold text-gray-450 dark:text-gray-550 uppercase tracking-wider px-4 py-3 bg-gray-50/50 dark:bg-gray-950/50">Status</th>
                                <th className="text-[9px] font-bold text-gray-450 dark:text-gray-550 uppercase tracking-wider px-4 py-3 bg-gray-50/50 dark:bg-gray-950/50 text-right">Details</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                              {results.imported.map((lead, rIdx) => {
                                const isExpanded = expandedResultRow === rIdx;
                                const hasExtraContacts = lead.crm_note && (
                                  lead.crm_note.toLowerCase().includes("email") ||
                                  lead.crm_note.toLowerCase().includes("phone") ||
                                  lead.crm_note.toLowerCase().includes("mobile")
                                );
                                return (
                                  <Fragment key={rIdx}>
                                    <tr className="hover:bg-gray-50/30 dark:hover:bg-gray-800/10 transition-colors">
                                      <td className="px-4 py-3 text-xs font-semibold text-gray-900 dark:text-white whitespace-nowrap">{lead.name || "—"}</td>
                                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{lead.email || "—"}</td>
                                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                        {lead.country_code} {lead.mobile_without_country_code || "—"}
                                      </td>
                                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                                        <StatusBadge status={lead.crm_status} />
                                      </td>
                                      <td className="px-4 py-3 text-xs text-right whitespace-nowrap">
                                        {hasExtraContacts && (
                                          <span className="mr-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50 uppercase tracking-wide">+contacts</span>
                                        )}
                                        <button
                                          onClick={() => setExpandedResultRow(isExpanded ? null : rIdx)}
                                          className="text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                                        >
                                          {isExpanded ? "Hide" : "Details"}
                                        </button>
                                      </td>
                                    </tr>
                                    {isExpanded && (
                                      <tr className="bg-gray-50/60 dark:bg-gray-950/30">
                                        <td colSpan={5} className="px-4 py-4 border-b border-gray-100 dark:border-gray-800">
                                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                            {[
                                              ["Created At", lead.created_at],
                                              ["Company", lead.company],
                                              ["City", lead.city],
                                              ["State", lead.state],
                                              ["Country", lead.country],
                                              ["Lead Owner", lead.lead_owner],
                                              ["Data Source", lead.data_source],
                                              ["Possession Time", lead.possession_time],
                                              ["Description", lead.description],
                                            ].map(([label, val]) => (
                                              <div key={label} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg p-2 shadow-xs">
                                                <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">{label}</span>
                                                <span className="text-[11px] text-gray-700 dark:text-gray-300 mt-0.5 block break-words font-medium">{val || "—"}</span>
                                              </div>
                                            ))}
                                            {/* crm_note gets its own highlighted full-width cell */}
                                            <div className={`col-span-2 sm:col-span-3 rounded-lg p-2 border shadow-xs ${lead.crm_note ? "bg-amber-50/50 dark:bg-amber-950/10 border-amber-100 dark:border-amber-900/40" : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"}`}>
                                              <span className="text-[9px] font-bold text-amber-500 dark:text-amber-400 uppercase tracking-wider block">CRM Note (extra contacts, remarks)</span>
                                              <span className="text-[11px] text-gray-700 dark:text-gray-300 mt-0.5 block break-words font-medium">{lead.crm_note || "—"}</span>
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </Fragment>
                                );
                              })}
                            </tbody>
                          </table>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-10 text-center text-gray-400 dark:text-gray-500">
                            <AlertCircle className="w-8 h-8 mb-2 opacity-60" />
                            <p className="text-xs">No leads were successfully imported.</p>
                          </div>
                        )
                      ) : (
                        /* Skipped Leads Table */
                        results.skipped.length > 0 ? (
                          <table className="w-full text-left border-collapse min-w-[600px]">
                            <thead>
                              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/50 sticky top-0 z-10">
                                <th className="text-[9px] font-bold text-gray-450 dark:text-gray-550 uppercase tracking-wider px-4 py-3 bg-gray-50/50 dark:bg-gray-950/50 w-16">Row #</th>
                                <th className="text-[9px] font-bold text-gray-450 dark:text-gray-550 uppercase tracking-wider px-4 py-3 bg-gray-50/50 dark:bg-gray-950/50">Lead Identifier</th>
                                <th className="text-[9px] font-bold text-gray-450 dark:text-gray-550 uppercase tracking-wider px-4 py-3 bg-gray-50/50 dark:bg-gray-950/50">Reason for Skipping</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                              {results.skipped.map((skip, rIdx) => {
                                // Extract a readable title from the raw columns (e.g. name or email)
                                const nameVal = skip.raw["name"] || skip.raw["Lead Name"] || skip.raw["Full Name"] || skip.raw["Email"] || Object.values(skip.raw)[0] || "Unknown Row";
                                return (
                                  <tr key={rIdx} className="hover:bg-gray-550/5 dark:hover:bg-gray-800/10">
                                    <td className="px-4 py-3 text-xs font-semibold text-gray-550 dark:text-gray-500 whitespace-nowrap">{skip.rowIndex}</td>
                                    <td className="px-4 py-3 text-xs font-semibold text-gray-900 dark:text-white whitespace-nowrap">{nameVal}</td>
                                    <td className="px-4 py-3 text-xs text-red-600 dark:text-red-400 font-medium whitespace-nowrap">{skip.reason}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-10 text-center text-gray-400 dark:text-gray-550">
                            <CheckCircle2 className="w-8 h-8 mb-2 text-green-500 opacity-80 animate-bounce" />
                            <p className="text-xs">No records were skipped. Perfect import! 🚀</p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ) : !file ? (
                /* Drag & Drop State */
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center text-center transition-all cursor-pointer ${
                    isDragActive
                      ? "border-brand bg-brand-bg/20 dark:bg-brand-bg/5"
                      : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-gray-50/50 dark:bg-gray-800/10"
                  }`}
                >
                  <input {...getInputProps()} />

                  {/* Upload icon badge */}
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-transform hover:scale-105"
                    style={{ backgroundColor: "#E1F5EE" }}
                  >
                    <Upload className="w-5 h-5" style={{ color: "#0F6E56" }} />
                  </div>

                  <p className="font-semibold text-gray-900 dark:text-white text-sm">
                    {isDragActive ? "Drop the file here..." : "Drop your CSV file here"}
                  </p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">or click to browse files</p>

                  {/* Format pill */}
                  <div className="flex items-center gap-1.5 mt-4 px-3 py-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-full text-xs text-gray-500 dark:text-gray-400 shadow-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Supported file: .csv (max 5MB)
                  </div>

                  {/* Download template */}
                  <button
                    onClick={downloadSampleCsv}
                    className="flex items-center gap-1.5 mt-5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 text-[11px] text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-semibold"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Sample CSV Template
                  </button>
                </div>
              ) : (
                /* File Loaded / Preview State */
                <div className="flex flex-col gap-4">
                  {/* File chip */}
                  <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-900 dark:text-white truncate max-w-[320px]">
                          {file.name}
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-550">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button
                      onClick={resetState}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Preview Table Section */}
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5">
                      CSV File Preview (First 5 Rows)
                    </h3>
                    <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-gray-900">
                      <div className="overflow-x-auto max-h-[250px] overflow-y-auto">
                        <table className="w-full text-left border-collapse min-w-[500px]">
                          <thead>
                            <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/50 sticky top-0 z-10">
                              {headers.map((h, i) => (
                                <th
                                  key={i}
                                  className="text-[9px] font-bold text-gray-450 dark:text-gray-550 uppercase tracking-wider px-4 py-3 bg-gray-50/50 dark:bg-gray-950/50"
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {rows.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-gray-55/30 dark:hover:bg-gray-850/10">
                                {headers.map((h, cIdx) => (
                                  <td key={cIdx} className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                    {row[h] || "—"}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 flex-shrink-0">
              <button
                disabled={isImporting}
                onClick={() => setOpen(false)}
                className="px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {results ? "Close" : "Cancel"}
              </button>
              {results ? (
                /* Done / Close CTA post import */
                <button
                  onClick={() => setOpen(false)}
                  className="px-5 py-2.5 rounded-lg text-xs font-bold text-white transition-all shadow-sm cursor-pointer hover:bg-brand-hover"
                  style={{ backgroundColor: "#0F6E56" }}
                >
                  Done & Close
                </button>
              ) : (
                /* Upload CTA */
                <button
                  onClick={handleConfirmImport}
                  disabled={!file || isImporting}
                  className="px-5 py-2.5 rounded-lg text-xs font-bold text-white transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: !file ? "#F0997B" : "#D85A30",
                  }}
                  onMouseEnter={(e) => {
                    if (file && !isImporting) e.currentTarget.style.backgroundColor = "#C04E25";
                  }}
                  onMouseLeave={(e) => {
                    if (file && !isImporting) e.currentTarget.style.backgroundColor = "#D85A30";
                  }}
                >
                  {isImporting ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Mapping leads...
                    </span>
                  ) : (
                    "Confirm Import"
                  )}
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
}
