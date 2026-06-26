import {
  Activity,
  Ban,
  CheckCircle,
  Clock,
  FileText,
  Pause,
  XCircle,
} from "lucide-react";

export const CAMPAIGN_STATUS_CONFIG = {
  RUNNING: {
    icon: Activity,
    label: "In Progress",
    tooltip: "Campaign is actively sending emails right now.",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    isTerminal: false,
    canCancel: true,
    canDuplicate: false,
  },
  PAUSED: {
    icon: Pause,
    label: "Paused",
    tooltip: "Campaign is on hold. Resume it to continue sending.",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    isTerminal: false,
    canCancel: true,
    canDuplicate: false,
  },
  COMPLETED: {
    icon: CheckCircle,
    label: "Completed",
    tooltip: "All emails were processed and sent.",
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    isTerminal: true,
    canCancel: false,
    canDuplicate: true,
  },
  FAILED: {
    icon: XCircle,
    label: "Failed",
    tooltip: "Campaign encountered an error and could not complete.",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    isTerminal: true,
    canCancel: false,
    canDuplicate: true,
  },
  CANCELLED: {
    icon: Ban,
    label: "Cancelled",
    tooltip: "Campaign was stopped by the user.",
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-400",
    isTerminal: true,
    canCancel: false,
    canDuplicate: true,
  },
  PENDING: {
    icon: Clock,
    label: "Queued",
    tooltip: "Campaign is waiting to start. It will begin shortly.",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
    isTerminal: false,
    canCancel: true,
    canDuplicate: false,
  },
  DRAFT: {
    icon: FileText,
    label: "Draft",
    tooltip: "Campaign has not been submitted yet.",
    color: "bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400",
    isTerminal: false,
    canCancel: false,
    canDuplicate: false,
  },
};

export function getStatusConfig(status) {
  return CAMPAIGN_STATUS_CONFIG[status] ?? CAMPAIGN_STATUS_CONFIG.PENDING;
}
