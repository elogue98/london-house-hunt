"use client";

import { useState, useCallback, useMemo } from "react";
import { Property, PropertyCategory } from "@/types/property";
import DashboardHeader from "@/components/ui/DashboardHeader";
import TabBar, { TabId } from "@/components/ui/TabBar";
import StatsBar from "@/components/ui/StatsBar";
import PropertyGrid from "./PropertyGrid";

interface PropertyDashboardProps {
  initialNew: Property[];
  initialWishlist: Property[];
  initialCalled: Property[];
  initialBin: Property[];
  lastScraped: string | null;
}

function matchesSearch(p: Property, q: string): boolean {
  const lower = q.toLowerCase();
  return [p.address, p.notes, p.agent_name, p.property_type, p.description]
    .some((field) => field?.toLowerCase().includes(lower));
}

export default function PropertyDashboard({
  initialNew,
  initialWishlist,
  initialCalled,
  initialBin,
  lastScraped,
}: PropertyDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>("new");
  const [search, setSearch] = useState("");
  const [newProperties, setNewProperties] = useState(initialNew);
  const [wishlistProperties, setWishlistProperties] = useState(initialWishlist);
  const [calledProperties, setCalledProperties] = useState(initialCalled);
  const [binProperties, setBinProperties] = useState(initialBin);

  const allArrays = {
    new: newProperties,
    wishlist: wishlistProperties,
    called: calledProperties,
    bin: binProperties,
  };
  const setters = {
    new: setNewProperties,
    wishlist: setWishlistProperties,
    called: setCalledProperties,
    bin: setBinProperties,
  };

  const findProperty = (id: string): { property: Property; tab: TabId } | null => {
    for (const tab of ["new", "wishlist", "called", "bin"] as TabId[]) {
      const p = allArrays[tab].find((p) => p.id === id);
      if (p) return { property: p, tab };
    }
    return null;
  };

  const updateCategory = useCallback(
    async (id: string, category: PropertyCategory | null) => {
      const found = findProperty(id);
      if (!found) return;

      const { property: prop, tab: fromTab } = found;
      const updated = { ...prop, category };

      setters[fromTab]((prev) => prev.filter((p) => p.id !== id));

      if (category === null) {
        setters.new((prev) => [updated, ...prev]);
      } else if (category === "wishlist") {
        setters.wishlist((prev) => [updated, ...prev]);
      } else if (category === "called") {
        setters.called((prev) => [updated, ...prev]);
      } else if (category === "bin") {
        setters.bin((prev) => [updated, ...prev]);
      }

      try {
        const res = await fetch(`/api/properties/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category }),
        });
        if (!res.ok) throw new Error("Failed to update");
      } catch {
        // Rollback
        if (category !== null) {
          const targetTab = category === "wishlist" ? "wishlist"
            : category === "called" ? "called"
            : "bin";
          setters[targetTab]((prev) => prev.filter((p) => p.id !== id));
        }
        setters[fromTab]((prev) => [prop, ...prev]);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [newProperties, wishlistProperties, calledProperties, binProperties]
  );

  const updateNotes = useCallback(
    async (id: string, notes: string | null) => {
      for (const tab of ["new", "wishlist", "called", "bin"] as TabId[]) {
        setters[tab]((prev) =>
          prev.map((p) => (p.id === id ? { ...p, notes } : p))
        );
      }
      try {
        const res = await fetch(`/api/properties/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes }),
        });
        if (!res.ok) throw new Error("Failed to save notes");
      } catch {
        // Silent fail
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const filteredProperties = useMemo(() => {
    const base = allArrays[activeTab];
    if (!search.trim()) return base;
    return base.filter((p) => matchesSearch(p, search));
  }, [activeTab, search, newProperties, wishlistProperties, calledProperties, binProperties]);

  const tabs = [
    { id: "new" as TabId, label: "New", count: newProperties.length },
    { id: "wishlist" as TabId, label: "Wish List", count: wishlistProperties.length },
    { id: "called" as TabId, label: "Called", count: calledProperties.length },
    { id: "bin" as TabId, label: "Bin", count: binProperties.length },
  ];

  const totalForTab = allArrays[activeTab].length;

  const emptyMessages: Record<TabId, { msg: string; sub?: string }> = {
    new: {
      msg: search ? "No listings match your search" : "Nothing new right now",
      sub: search ? undefined : "You're up to date. The scraper runs every 4 hours.",
    },
    wishlist: {
      msg: search ? "No listings match your search" : "Your wish list is empty",
      sub: search ? undefined : "Star a property to save it here.",
    },
    called: {
      msg: search ? "No listings match your search" : "No called properties yet",
      sub: search ? undefined : "Mark a property as called after contacting the agent.",
    },
    bin: {
      msg: search ? "No listings match your search" : "Your bin is empty",
      sub: search ? undefined : "Binned properties appear here.",
    },
  };

  const handleImport = useCallback((property: Property) => {
    setNewProperties((prev) => [property, ...prev]);
  }, []);

  return (
    <>
    <DashboardHeader onImport={handleImport} />
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <StatsBar
        newCount={newProperties.length}
        wishlistCount={wishlistProperties.length}
        calledCount={calledProperties.length}
        lastScraped={lastScraped}
      />

      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted"
          fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by location, notes, agent..."
          className="w-full pl-8 pr-16 py-2 bg-bg-card border border-border rounded-lg text-sm font-body text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {search.trim() && (
            <span className="text-text-muted text-xs font-body">
              {filteredProperties.length}/{totalForTab}
            </span>
          )}
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-text-muted hover:text-text-secondary transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <TabBar activeTab={activeTab} onTabChange={setActiveTab} tabs={tabs} />

      <PropertyGrid
        properties={filteredProperties}
        onCategoryChange={updateCategory}
        onNotesChange={updateNotes}
        emptyMessage={emptyMessages[activeTab].msg}
        emptySubtext={emptyMessages[activeTab].sub}
      />
    </div>
    </>
  );
}
