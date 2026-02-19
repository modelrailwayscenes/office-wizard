// components/UnifiedBadge.tsx
import React from "react";

// Badge configurations matching sentiment badge style but with appropriate colors
const BADGE_CONFIGS = {
  // Priority badges
  urgent: {
    bg: "#7f1d1d",  // red-900
    text: "#ffffff",
  },
  high: {
    bg: "#7c2d12",  // orange-900
    text: "#ffffff",
  },
  medium: {
    bg: "#115e59",  // teal-900
    text: "#ffffff",
  },
  low: {
    bg: "#14532d",  // green-900
    text: "#ffffff",
  },
  
  // Status badges
  new: {
    bg: "#1e3a8a",  // blue-900
    text: "#ffffff",
  },
  in_progress: {
    bg: "#581c87",  // purple-900
    text: "#ffffff",
  },
  waiting_customer: {
    bg: "#78350f",  // amber-900
    text: "#ffffff",
  },
  waiting_internal: {
    bg: "#312e81",  // indigo-900
    text: "#ffffff",
  },
  resolved: {
    bg: "#14532d",  // green-900
    text: "#ffffff",
  },
  archived: {
    bg: "#1e293b",  // slate-800
    text: "#ffffff",
  },
  
  // Classification badges
  delivery_issue: {
    bg: "#7c2d12",  // orange-900
    text: "#ffffff",
  },
  damaged_item: {
    bg: "#7f1d1d",  // red-900
    text: "#ffffff",
  },
  refund_request: {
    bg: "#78350f",  // amber-900
    text: "#ffffff",
  },
  returns: {
    bg: "#1e3a8a",  // blue-900
    text: "#ffffff",
  },
  general_enquiry: {
    bg: "#334155",  // slate-700
    text: "#ffffff",
  },
  unclassified: {
    bg: "#1e293b",  // slate-800
    text: "#94a3b8",  // slate-400
  },
  
  // Connection status badges
  connected: {
    bg: "#14532d",  // green-900
    text: "#ffffff",
  },
  disconnected: {
    bg: "#1e293b",  // slate-800
    text: "#94a3b8",  // slate-400
  },
  error: {
    bg: "#7f1d1d",  // red-900
    text: "#ffffff",
  },
  coming_soon: {
    bg: "#1e293b",  // slate-800
    text: "#64748b",  // slate-500
  },

  // Default fallback
  default: {
    bg: "#1e293b",  // slate-800
    text: "#94a3b8",  // slate-400
  },
};

type BadgeType = keyof typeof BADGE_CONFIGS;

interface UnifiedBadgeProps {
  type?: string | null;
  label: string;
  className?: string;
}

export function UnifiedBadge({ type, label, className = "" }: UnifiedBadgeProps) {
  const normalizedType = type?.toLowerCase().replace(/\s+/g, "_") as BadgeType;
  const config = BADGE_CONFIGS[normalizedType] || BADGE_CONFIGS.default;

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${className}`}
      style={{ backgroundColor: config.bg, color: config.text }}
    >
      {label}
    </span>
  );
}