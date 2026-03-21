import { supabase } from "@/lib/supabase";
import { deduplicateProperties, normalizeAddress } from "@/lib/dedup";
import DashboardHeader from "@/components/ui/DashboardHeader";
import PropertyDashboard from "@/components/properties/PropertyDashboard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard | London House Hunt",
};

export default async function DashboardPage() {
  const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();

  const [newRes, wishlistRes, calledRes, binRes, lastScrapedRes, allAddressesRes] = await Promise.all([
    supabase
      .from("properties")
      .select("*")
      .eq("is_active", true)
      .is("category", null)
      .gte("first_seen_at", oneDayAgo)
      .order("last_activity_date", { ascending: false, nullsFirst: false }),
    supabase
      .from("properties")
      .select("*")
      .eq("is_active", true)
      .eq("category", "wishlist")
      .order("last_activity_date", { ascending: false, nullsFirst: false }),
    supabase
      .from("properties")
      .select("*")
      .eq("is_active", true)
      .eq("category", "called")
      .order("last_activity_date", { ascending: false, nullsFirst: false }),
    supabase
      .from("properties")
      .select("*")
      .eq("is_active", true)
      .eq("category", "bin")
      .order("last_activity_date", { ascending: false, nullsFirst: false }),
    supabase
      .from("properties")
      .select("last_seen_at")
      .order("last_seen_at", { ascending: false })
      .limit(1),
    // Fetch all categorised property addresses to filter cross-source duplicates
    supabase
      .from("properties")
      .select("address")
      .eq("is_active", true)
      .not("category", "is", null),
  ]);

  const lastScraped = lastScrapedRes.data?.[0]?.last_seen_at ?? null;

  // Build a set of normalized addresses for all categorised properties
  // so we can exclude OTM/Zoopla dupes of already-seen Rightmove listings
  const categorisedAddresses = new Set(
    (allAddressesRes.data ?? []).map((p: { address: string }) => normalizeAddress(p.address))
  );

  return (
    <div className="min-h-screen relative z-10">
      <DashboardHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PropertyDashboard
          initialNew={deduplicateProperties(
            (newRes.data ?? []).filter(
              (p) => !categorisedAddresses.has(normalizeAddress(p.address))
            )
          )}
          initialWishlist={wishlistRes.data ?? []}
          initialCalled={calledRes.data ?? []}
          initialBin={binRes.data ?? []}
          lastScraped={lastScraped}
        />
      </main>
    </div>
  );
}
