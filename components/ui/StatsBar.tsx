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

  const stats = [
    { label: "New", value: newCount, color: "text-accent-green" },
    { label: "Wish List", value: wishlistCount, color: "text-accent-gold" },
    { label: "Called", value: calledCount, color: "text-accent-blue" },
    { label: "Last Scraped", value: lastScrapedStr, color: "text-text-secondary" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-bg-card rounded-lg border border-border p-4 text-center"
        >
          <p className={`text-2xl font-display ${stat.color}`}>{stat.value}</p>
          <p className="text-text-muted text-xs mt-1 uppercase tracking-wider font-body">
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  );
}
