"use client";

import { cn } from "@/lib/utils";

type StatusType = "GOOD_LEAD_FOLLOW_UP" | "DID_NOT_CONNECT" | "BAD_LEAD" | "SALE_DONE" | string;

export function StatusBadge({ status }: { status: StatusType }) {
  let label = status;
  let bg = "bg-gray-100";
  let text = "text-gray-500 font-semibold";

  switch (status) {
    case "GOOD_LEAD_FOLLOW_UP":
    case "Good Lead":
      label = "Good Lead";
      bg = "bg-green-50";
      text = "text-green-600 font-bold";
      break;
    case "DID_NOT_CONNECT":
    case "Not Connected":
      label = "Not Connected";
      bg = "bg-amber-50";
      text = "text-amber-600 font-bold";
      break;
    case "BAD_LEAD":
    case "Bad Lead":
      label = "Bad Lead";
      bg = "bg-red-50";
      text = "text-red-600 font-bold";
      break;
    case "SALE_DONE":
    case "Sale Done":
      label = "Sale Done";
      bg = "bg-blue-50";
      text = "text-blue-600 font-bold";
      break;
    case "Not Dialed":
    default:
      label = label || "Not Dialed";
      bg = "bg-gray-50 border border-gray-100";
      text = "text-gray-500 font-medium";
      break;
  }

  return (
    <span className={cn("text-[11px] px-2.5 py-1 rounded-full uppercase tracking-wider", bg, text)}>
      {label}
    </span>
  );
}
