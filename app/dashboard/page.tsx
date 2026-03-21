import { supabase } from "@/lib/supabase";
import DashboardHeader from "@/components/ui/DashboardHeader";
import PropertyDashboard from "@/components/properties/PropertyDashboard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard | London House Hunt",
};

export default async function DashboardPage() {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  const [newRes, wishlistRes, calledRes, binRes, lastScrapedRes] = await Promise.all([
    supabase
      .from("properties")
      .select("*")
      .eq("is_active", true)
      .is("category", null)
      .gte("first_seen_at", threeDaysAgo)
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
  ]);

  const lastScraped = lastScrapedRes.data?.[0]?.last_seen_at ?? null;

  return (
    <div className="min-h-screen relative z-10">
      <DashboardHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PropertyDashboard
          initialNew={newRes.data ?? []}
          initialWishlist={wishlistRes.data ?? []}
          initialCalled={calledRes.data ?? []}
          initialBin={binRes.data ?? []}
          lastScraped={lastScraped}
        />
      </main>
    </div>
  );
}
