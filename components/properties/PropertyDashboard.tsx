"use client";

import { useState, useCallback } from "react";
import { Property, PropertyCategory } from "@/types/property";
import TabBar, { TabId } from "@/components/ui/TabBar";
import StatsBar from "@/components/ui/StatsBar";
import PropertyGrid from "./PropertyGrid";

interface PropertyDashboardProps {
  initialNew: Property[];
  initialWishlist: Property[];
  initialCalled: Property[];
  lastScraped: string | null;
}

export default function PropertyDashboard({
  initialNew,
  initialWishlist,
  initialCalled,
  lastScraped,
}: PropertyDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>("new");
  const [newProperties, setNewProperties] = useState(initialNew);
  const [wishlistProperties, setWishlistProperties] = useState(initialWishlist);
  const [calledProperties, setCalledProperties] = useState(initialCalled);

  const allArrays = { new: newProperties, wishlist: wishlistProperties, called: calledProperties };
  const setters = {
    new: setNewProperties,
    wishlist: setWishlistProperties,
    called: setCalledProperties,
  };

  const findProperty = (id: string): { property: Property; tab: TabId } | null => {
    for (const tab of ["new", "wishlist", "called"] as TabId[]) {
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

      // Optimistic: remove from current tab
      setters[fromTab]((prev) => prev.filter((p) => p.id !== id));

      // Add to target tab (unless binned — binned disappear entirely)
      if (category === null) {
        setters.new((prev) => [updated, ...prev]);
      } else if (category === "wishlist") {
        setters.wishlist((prev) => [updated, ...prev]);
      } else if (category === "called") {
        setters.called((prev) => [updated, ...prev]);
      }
      // "bin" — don't add to any tab

      try {
        const res = await fetch(`/api/properties/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category }),
        });

        if (!res.ok) throw new Error("Failed to update");
      } catch {
        // Rollback: put it back where it was
        if (category !== null && category !== "bin") {
          const targetTab = category === "wishlist" ? "wishlist" : "called";
          setters[targetTab]((prev) => prev.filter((p) => p.id !== id));
        }
        setters[fromTab]((prev) => [prop, ...prev]);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [newProperties, wishlistProperties, calledProperties]
  );

  const updateNotes = useCallback(
    async (id: string, notes: string | null) => {
      // Optimistic update in whichever tab it's in
      for (const tab of ["new", "wishlist", "called"] as TabId[]) {
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
        // Silent fail — note is still in local state
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const tabs = [
    { id: "new" as TabId, label: "New", count: newProperties.length },
    { id: "wishlist" as TabId, label: "Wish List", count: wishlistProperties.length },
    { id: "called" as TabId, label: "Called", count: calledProperties.length },
  ];

  const emptyMessages: Record<TabId, { msg: string; sub?: string }> = {
    new: {
      msg: "No new listings in the last 3 days",
      sub: "The scraper runs every 4 hours — check back later.",
    },
    wishlist: { msg: "Your wish list is empty", sub: "Star a property to save it here." },
    called: { msg: "No called properties yet", sub: "Mark a property as called after contacting the agent." },
  };

  return (
    <div className="space-y-6">
      <StatsBar
        newCount={newProperties.length}
        wishlistCount={wishlistProperties.length}
        calledCount={calledProperties.length}
        lastScraped={lastScraped}
      />

      <TabBar activeTab={activeTab} onTabChange={setActiveTab} tabs={tabs} />

      <PropertyGrid
        properties={allArrays[activeTab]}
        onCategoryChange={updateCategory}
        onNotesChange={updateNotes}
        emptyMessage={emptyMessages[activeTab].msg}
        emptySubtext={emptyMessages[activeTab].sub}
      />
    </div>
  );
}
