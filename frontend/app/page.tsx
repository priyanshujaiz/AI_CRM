"use client";

import { useState, Fragment } from "react";
import { AppSidebar } from "@/components/sidebar/AppSidebar";
import { ImportModal } from "@/components/upload/ImportModal";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { StatusBadge } from "@/components/tables/StatusBadge";
import {
  RefreshCw,
  Search,
  FileSpreadsheet,
  TrendingUp,
  Users2,
  CheckCircle,
  Smartphone,
  ChevronRight,
  Construction,
} from "lucide-react";

// Mock lead data following the AI Lead schema
const mockLeads = [
  {
    created_at: "2026-07-09 09:45:20",
    name: "punnnf g",
    email: "kjgkhv2@gcghc.com",
    country_code: "+91",
    mobile_without_country_code: "9878945611",
    company: "—",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    lead_owner: "owner@ailead.com",
    crm_status: "SALE_DONE",
    quality: "—",
  },
  {
    created_at: "2026-07-09 09:12:45",
    name: "kjkvkh",
    email: "jkhbkbn@hjf.hfv",
    country_code: "+91",
    mobile_without_country_code: "9112121214",
    company: "fhtf",
    city: "Delhi",
    state: "Delhi",
    country: "India",
    lead_owner: "owner@ailead.com",
    crm_status: "DID_NOT_CONNECT",
    quality: "—",
  },
  {
    created_at: "2026-07-09 08:35:10",
    name: "kugkkh",
    email: "ljgbjg@hgdh.hjc",
    country_code: "+91",
    mobile_without_country_code: "9112121212",
    company: "fhtf",
    city: "Bangalore",
    state: "Karnataka",
    country: "India",
    lead_owner: "owner@ailead.com",
    crm_status: "DID_NOT_CONNECT",
    quality: "—",
  },
  {
    created_at: "2026-07-09 07:15:30",
    name: "hjvjv",
    email: "jfgf@fgd.com",
    country_code: "+91",
    mobile_without_country_code: "9115151515",
    company: "fhtf",
    city: "Pune",
    state: "Maharashtra",
    country: "India",
    lead_owner: "owner@ailead.com",
    crm_status: "GOOD_LEAD_FOLLOW_UP",
    quality: "—",
  },
  {
    created_at: "2026-07-08 18:40:15",
    name: "Abhraneel Dhar",
    email: "abhraneeldhar7@groweasy.com",
    country_code: "+91",
    mobile_without_country_code: "9190515897",
    company: "groweasy",
    city: "Kolkata",
    state: "West Bengal",
    country: "India",
    lead_owner: "owner@ailead.com",
    crm_status: "GOOD_LEAD_FOLLOW_UP",
    quality: "—",
  },
  {
    created_at: "2026-07-08 14:12:00",
    name: "fhjf ghf",
    email: "tjrf.ft@gfjj.com",
    country_code: "+91",
    mobile_without_country_code: "9114141414",
    company: "thr rh",
    city: "Hyderabad",
    state: "Telangana",
    country: "India",
    lead_owner: "owner@ailead.com",
    crm_status: "DID_NOT_CONNECT",
    quality: "—",
  },
  {
    created_at: "2026-07-08 11:05:40",
    name: "fhf",
    email: "gnhfg@fgjf.com",
    country_code: "+91",
    mobile_without_country_code: "9113131313",
    company: "fhtf",
    city: "Chennai",
    state: "Tamil Nadu",
    country: "India",
    lead_owner: "owner@ailead.com",
    crm_status: "BAD_LEAD",
    quality: "—",
  },
  {
    created_at: "2026-07-07 16:30:22",
    name: "Abc 1",
    email: "abc1@kryf.com",
    country_code: "+91",
    mobile_without_country_code: "9112121212",
    company: "—",
    city: "Noida",
    state: "Uttar Pradesh",
    country: "India",
    lead_owner: "owner@ailead.com",
    crm_status: "DID_NOT_CONNECT",
    quality: "—",
  },
];

export default function Home() {
  const [leads, setLeads] = useState(mockLeads);
  const [skippedLeads, setSkippedLeads] = useState<any[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<"imported" | "skipped">("imported");
  const [expandedLeadRow, setExpandedLeadRow] = useState<number | null>(null);
  const [expandedSkippedRow, setExpandedSkippedRow] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("Lead Sources");

  const filteredLeads = leads.filter(
    (lead) =>
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.mobile_without_country_code.includes(searchTerm)
  );

  const filteredSkippedLeads = skippedLeads.filter((item) => {
    const rawString = JSON.stringify(item.raw).toLowerCase();
    const reasonString = (item.reason || "").toLowerCase();
    const term = searchTerm.toLowerCase();
    return rawString.includes(term) || reasonString.includes(term) || String(item.rowIndex).includes(term);
  });

  const handleImportSuccess = (newLeads: any[], newSkipped: any[]) => {
    setLeads((prev: any) => [...newLeads, ...prev]);
    setSkippedLeads((prev: any) => [...newSkipped, ...prev]);
    setActiveSubTab("imported");
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
      <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main content */}
      <main className="ml-60 flex-1 flex flex-col min-h-screen">
        {/* Render Lead Sources Tab (Primary Unified Page) */}
        {activeTab === "Lead Sources" ? (
          <>
            {/* Page header */}
            <div className="flex items-start justify-between px-8 pt-8 pb-6">
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Manage Your Leads</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Monitor lead status, assign tasks, and close deals faster.
                </p>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <ThemeToggle />
                <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* CSV Import banner / panel */}
            <div className="px-8 mb-6">
              <div className="flex items-center justify-between px-6 py-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800/80 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#E1F5EE" }}>
                    <FileSpreadsheet className="w-5 h-5" style={{ color: "#0F6E56" }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">CSV Lead Import</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Upload any CSV format — AI will intelligently map your columns to CRM fields.
                    </p>
                  </div>
                </div>
                <ImportModal onImportSuccess={handleImportSuccess} />
              </div>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-8 mb-6">
              <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800/80 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider">Total Leads</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{leads.length}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Users2 className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800/80 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider">Good Leads</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {leads.filter((l) => l.crm_status === "GOOD_LEAD_FOLLOW_UP").length}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600 dark:text-green-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800/80 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider">Deals Closed</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {leads.filter((l) => l.crm_status === "SALE_DONE").length}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <CheckCircle className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800/80 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider">Contact Rate</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {leads.length > 0
                      ? ((leads.filter((l) => l.crm_status !== "DID_NOT_CONNECT" && l.crm_status !== "").length / leads.length) * 100).toFixed(1) + "%"
                      : "0.0%"}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600 dark:text-orange-400">
                  <Smartphone className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Leads Table Card */}
            <div className="px-8 flex-1">
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800/80 shadow-sm overflow-hidden flex flex-col">
                {/* Table Header / Action bar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 gap-4">
                  <div className="flex border-b border-gray-100 dark:border-gray-800 -mb-4 gap-2">
                    <button
                      onClick={() => setActiveSubTab("imported")}
                      className={`pb-4 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                        activeSubTab === "imported"
                          ? "border-brand text-brand dark:text-emerald-450"
                          : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-white"
                      }`}
                      style={activeSubTab === "imported" ? { borderColor: "#0F6E56", color: "#0F6E56" } : {}}
                    >
                      Active Leads ({filteredLeads.length})
                    </button>
                    <button
                      onClick={() => setActiveSubTab("skipped")}
                      className={`pb-4 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                        activeSubTab === "skipped"
                          ? "border-brand text-brand dark:text-emerald-450"
                          : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-white"
                      }`}
                      style={activeSubTab === "skipped" ? { borderColor: "#0F6E56", color: "#0F6E56" } : {}}
                    >
                      Skipped Records ({filteredSkippedLeads.length})
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="relative w-full sm:w-64">
                      <Search className="w-4 h-4 text-gray-400 dark:text-gray-550 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search leads..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-full border border-gray-200 dark:border-gray-850 text-xs bg-gray-50/50 dark:bg-gray-950/50 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-950 focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-colors"
                      />
                    </div>
                    <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {activeSubTab === "imported" ? (
                  <>
                    {/* Table Body container */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead>
                          <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/20">
                            <th className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-6 py-4">Lead Name</th>
                            <th className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-6 py-4">Email</th>
                            <th className="text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-widest px-6 py-4">Contact</th>
                            <th className="text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-widest px-6 py-4">Date Created</th>
                            <th className="text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-widest px-6 py-4">Company</th>
                            <th className="text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-widest px-6 py-4">Status</th>
                            <th className="text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-widest px-6 py-4">Source</th>
                            <th className="text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-widest px-6 py-4 text-right">More</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {filteredLeads.length > 0 ? (
                            filteredLeads.map((lead, idx) => {
                              const isExpanded = expandedLeadRow === idx;
                              return (
                                <Fragment key={idx}>
                                  <tr className="hover:bg-gray-50/30 dark:hover:bg-gray-800/10 transition-colors">
                                    <td className="px-6 py-4 text-xs font-semibold text-gray-900 dark:text-white whitespace-nowrap">{lead.name}</td>
                                    <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{lead.email}</td>
                                    <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                      {lead.country_code} {lead.mobile_without_country_code}
                                    </td>
                                    <td className="px-6 py-4 text-xs text-gray-400 dark:text-gray-550 whitespace-nowrap">{lead.created_at}</td>
                                    <td className="px-6 py-4 text-xs text-gray-550 dark:text-gray-400 whitespace-nowrap">{lead.company}</td>
                                    <td className="px-6 py-4 text-xs whitespace-nowrap">
                                      <StatusBadge status={lead.crm_status} />
                                    </td>
                                    <td className="px-6 py-4 text-xs text-gray-400 dark:text-gray-550 whitespace-nowrap">
                                      {(lead as any).data_source || "—"}
                                    </td>
                                    <td className="px-6 py-4 text-xs text-right whitespace-nowrap">
                                      <button
                                        onClick={() => setExpandedLeadRow(isExpanded ? null : idx)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 text-xs font-medium text-gray-650 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                                      >
                                        {isExpanded ? "Hide" : "More"}
                                        <ChevronRight className={`w-3.5 h-3.5 text-gray-400 dark:text-gray-500 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                                      </button>
                                    </td>
                                  </tr>
                                  {isExpanded && (
                                    <tr className="bg-gray-50/40 dark:bg-gray-950/20">
                                      <td colSpan={8} className="px-6 py-4 border-b border-gray-100 dark:border-gray-800/60">
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                          {[
                                            ["City", (lead as any).city],
                                            ["State", (lead as any).state],
                                            ["Country", (lead as any).country],
                                            ["Lead Owner", (lead as any).lead_owner],
                                            ["Possession Time", (lead as any).possession_time],
                                            ["Description", (lead as any).description],
                                          ].map(([label, val]) => (
                                            <div key={label} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-2.5 rounded-xl shadow-xs">
                                              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider block">{label}</span>
                                              <span className="text-xs text-gray-850 dark:text-gray-300 mt-0.5 block break-all font-medium">{String(val || "—")}</span>
                                            </div>
                                          ))}
                                          {(lead as any).crm_note && (
                                            <div className="col-span-2 sm:col-span-4 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/40 p-2.5 rounded-xl shadow-xs">
                                              <span className="text-[10px] font-bold text-amber-500 dark:text-amber-400 uppercase tracking-wider block">CRM Notes</span>
                                              <span className="text-xs text-gray-700 dark:text-gray-300 mt-0.5 block break-words font-medium">{(lead as any).crm_note}</span>
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </Fragment>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-400 dark:text-gray-550">
                                No active leads found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Table Footer */}
                    {filteredLeads.length > 0 && (
                      <div className="flex justify-center py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-950/20">
                        <button className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-sm transition-all cursor-pointer">
                          Load more
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Skipped Table Body container */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                          <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/20">
                            <th className="text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-widest px-6 py-4 w-20">Row #</th>
                            <th className="text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-widest px-6 py-4">Lead Identifier</th>
                            <th className="text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-widest px-6 py-4">Reason for Skipping</th>
                            <th className="text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-widest px-6 py-4 text-right">Raw Data</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {filteredSkippedLeads.length > 0 ? (
                            filteredSkippedLeads.map((skip, idx) => {
                              const nameVal = skip.raw["name"] || skip.raw["Lead Name"] || skip.raw["Full Name"] || skip.raw["Email"] || Object.values(skip.raw)[0] || `Row ${skip.rowIndex}`;
                              const isExpanded = expandedSkippedRow === skip.rowIndex;

                              return (
                                <tr key={idx} className="hover:bg-gray-55/30 dark:hover:bg-gray-800/10 transition-colors flex-col">
                                  <td colSpan={4} className="p-0">
                                    <table className="w-full text-left border-collapse">
                                      <tbody>
                                        <tr className="hover:bg-gray-50/30 dark:hover:bg-gray-800/10 transition-colors">
                                          <td className="px-6 py-4 text-xs font-semibold text-gray-400 dark:text-gray-550 whitespace-nowrap w-20">{skip.rowIndex}</td>
                                          <td className="px-6 py-4 text-xs font-semibold text-gray-900 dark:text-white whitespace-nowrap">{nameVal}</td>
                                          <td className="px-6 py-4 text-xs text-red-650 dark:text-red-400 font-semibold whitespace-nowrap">{skip.reason}</td>
                                          <td className="px-6 py-4 text-xs text-right whitespace-nowrap">
                                            <button
                                              onClick={() => setExpandedSkippedRow(isExpanded ? null : skip.rowIndex)}
                                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-250 dark:border-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer"
                                            >
                                              {isExpanded ? "Hide raw fields" : "Inspect raw fields"}
                                            </button>
                                          </td>
                                        </tr>
                                        {isExpanded && (
                                          <tr className="bg-gray-50/40 dark:bg-gray-950/20">
                                            <td colSpan={4} className="px-6 py-4 border-b border-gray-100 dark:border-gray-800/60">
                                              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Original CSV Row Attributes:</div>
                                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                                {Object.entries(skip.raw || {}).map(([key, val]) => (
                                                  <div key={key} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-2.5 rounded-xl shadow-xs">
                                                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider block">{key}</span>
                                                    <span className="text-xs text-gray-850 dark:text-gray-300 mt-0.5 block break-all font-medium">{String(val) || "—"}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            </td>
                                          </tr>
                                        )}
                                      </tbody>
                                    </table>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-400 dark:text-gray-550">
                                No skipped records found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Render Dummy tab for any other view */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/50 dark:bg-gray-950/50">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500 mb-4 shadow-sm animate-bounce">
              <Construction className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white text-base">Under Construction</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-sm leading-relaxed">
              The <span className="font-semibold text-brand">"{activeTab}"</span> view will be implemented later. Please use the <span className="font-semibold text-brand">"Lead Sources"</span> tab to access the main AI Lead CSV importer.
            </p>
            <button
              onClick={() => setActiveTab("Lead Sources")}
              className="mt-6 px-4 py-2 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-hover shadow-sm transition-colors"
              style={{ backgroundColor: "#0F6E56" }}
            >
              Go to Lead Sources
            </button>
          </div>
        )}

        {/* Footer spacer */}
        <div className="h-8" />
      </main>
    </div>
  );
}
