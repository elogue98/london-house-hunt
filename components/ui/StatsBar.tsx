"use client";

import { useEffect, useState } from "react";

interface StatsBarProps {
  newCount: number;
  wishlistCount: number;
  calledCount: number;
  lastScraped: string | null;
}

export default function StatsBar({
  newCount,
  wishlistCount,
  calledCount,
  lastScraped,
}: StatsBarProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const lastScrapedStr = mounted && lastScraped
    ? new Date(lastScraped).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : lastScraped
    ? "..."
    : "Never";

  return (
    <div className="flex items-center gap-5 px-4 py-2.5 bg-bg-card rounded-lg border border-border text-sm font-body">
      <span>
        <span className="font-semibold text-accent-green">{newCount}</span>
        <span className="text-text-muted ml-1.5">new</span>
      </span>
      <span className="text-border select-none">·</span>
      <span>
        <span className="font-semibold text-accent-gold">{wishlistCount}</span>
        <span className="text-text-muted ml-1.5">wish list</span>
      </span>
      <span className="text-border select-none">·</span>
      <span>
        <span className="font-semibold text-accent-blue">{calledCount}</span>
        <span className="text-text-muted ml-1.5">called</span>
      </span>
      <span className="ml-auto text-text-muted text-xs hidden sm:block">
        Scraped {lastScrapedStr}
      </span>
    </div>
  );
}
