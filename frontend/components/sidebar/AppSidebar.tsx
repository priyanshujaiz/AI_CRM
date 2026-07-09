"use client";

import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Sparkles,
  Users,
  MessageSquare,
  Users2,
  Link2,
  Megaphone,
  MessageCircle,
  Phone,
  SlidersHorizontal,
  Code2,
  Building2,
  ChevronRight,
  BrainCircuit,
} from "lucide-react";

const mainNav = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: Sparkles, label: "Generate Leads" },
  { icon: Users, label: "Manage Leads" },
  { icon: MessageSquare, label: "Engage Leads" },
];

const controlNav = [
  { icon: Users2, label: "Team Members" },
  { icon: Link2, label: "Lead Sources", active: true },
  { icon: Megaphone, label: "Ad Accounts" },
  { icon: MessageCircle, label: "WhatsApp Account" },
  { icon: Phone, label: "Tele Calling" },
  { icon: SlidersHorizontal, label: "CRM Fields" },
  { icon: Code2, label: "API Center" },
];

export function AppSidebar({
  activeTab,
  onTabChange,
}: {
  activeTab: string;
  onTabChange: (tab: string) => void;
}) {
  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col z-30 shadow-sm">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-gray-100 dark:border-gray-800">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#0F6E56" }}>
          <BrainCircuit className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-gray-900 dark:text-white text-[15px] tracking-tight">AI Lead</span>
      </div>

      {/* Workspace Chip */}
      <div className="px-3 pt-3">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <div className="w-7 h-7 rounded-lg bg-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            T
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-900 dark:text-white truncate leading-tight">Test Corp</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-tight">Owner</p>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5">
        {/* MAIN */}
        <div>
          <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-2 mb-1.5">Main</p>
          <ul className="space-y-0.5">
            {mainNav.map((item) => {
              const isActive = activeTab === item.label;
              return (
                <li key={item.label}>
                  <button
                    onClick={() => onTabChange(item.label)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left font-medium",
                      isActive
                        ? "text-brand bg-brand-bg font-semibold"
                        : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:text-gray-800 dark:hover:text-white"
                    )}
                    style={isActive ? { backgroundColor: "#E1F5EE", color: "#0F6E56" } : {}}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* CONTROL CENTER */}
        <div>
          <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-2 mb-1.5">Control Center</p>
          <ul className="space-y-0.5">
            {controlNav.map((item) => {
              const isActive = activeTab === item.label;
              return (
                <li key={item.label}>
                  <button
                    onClick={() => onTabChange(item.label)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left font-medium",
                      isActive
                        ? "text-brand bg-brand-bg font-semibold"
                        : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:text-gray-800 dark:hover:text-white"
                    )}
                    style={isActive ? { backgroundColor: "#E1F5EE", color: "#0F6E56" } : {}}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-800">
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-white transition-colors">
          <Building2 className="w-4 h-4" />
          <span>Business Center</span>
        </button>
      </div>
    </aside>
  );
}
