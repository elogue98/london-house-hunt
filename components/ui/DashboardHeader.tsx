"use client";

import { useEffect, useState } from "react";

export default function DashboardHeader() {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      setTime(
        new Date().toLocaleString("en-GB", {
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Europe/London",
        })
      );
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-bg-primary/80 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl text-text-primary tracking-tight">
            London House Hunt
          </h1>
          <p className="text-text-secondary text-sm mt-1 font-body">
            Islington rentals&ensp;·&ensp;£2,000–£2,700/mo&ensp;·&ensp;Last 3 days
          </p>
        </div>
        {time && (
          <span suppressHydrationWarning className="text-text-muted text-xs font-body hidden sm:block">
            {time}
          </span>
        )}
      </div>
    </header>
  );
}
