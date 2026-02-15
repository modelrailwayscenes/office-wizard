// components/SentimentBadge.tsx
import React from "react";

const SENTIMENT_CONFIG = {
  very_negative: {
    label: "VERY NEGATIVE",
    bg: "#6e1111",
    text: "#ffffff",
  },
  negative: {
    label: "NEGATIVE",
    bg: "#5e2800",
    text: "#ffffff",
  },
  neutral: {
    label: "NEUTRAL",
    bg: "#4a3600",
    text: "#ffffff",
  },
  positive: {
    label: "POSITIVE",
    bg: "#333f00",
    text: "#ffffff",
  },
  very_positive: {
    label: "VERY POSITIVE",
    bg: "#17440c",
    text: "#ffffff",
  },
};

type SentimentType = keyof typeof SENTIMENT_CONFIG;

export function SentimentBadge({ sentiment }: { sentiment: string | null | undefined }) {
  if (!sentiment) {
    return (
      <span
        className="inline-flex items-center px-2 py-1 rounded text-xs font-medium"
        style={{ backgroundColor: SENTIMENT_CONFIG.neutral.bg, color: SENTIMENT_CONFIG.neutral.text }}
      >
        NEUTRAL
      </span>
    );
  }

  const normalizedSentiment = sentiment.toLowerCase().replace(/\s+/g, "_") as SentimentType;
  const config = SENTIMENT_CONFIG[normalizedSentiment] || SENTIMENT_CONFIG.neutral;

  return (
    <span
      className="inline-flex items-center px-2 py-1 rounded text-xs font-medium"
      style={{ backgroundColor: config.bg, color: config.text }}
    >
      {config.label}
    </span>
  );
}
