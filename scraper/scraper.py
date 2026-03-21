"""
London House Hunt — scraper orchestrator.
Runs all source modules (Rightmove, etc.), upserts results into Supabase,
and reports new listings.
"""

import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from supabase import create_client, Client

import rightmove

load_dotenv()


def build_supabase_client() -> Client:
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"],
    )


def upsert_properties(supabase: Client, properties: list[dict]) -> list[dict]:
    """
    Upsert properties into Supabase.
    Returns only the newly inserted rows (not previously seen).
    """
    if not properties:
        return []

    # Deduplicate within the batch (Rightmove can return the same listing on multiple pages)
    seen: dict[tuple[str, str], dict] = {}
    for p in properties:
        key = (p["source"], p["source_id"])
        seen[key] = p  # last occurrence wins (most up-to-date)
    properties = list(seen.values())

    # Get existing (source, source_id) pairs so we can diff after upsert
    existing = supabase.table("properties").select("source, source_id").execute()
    existing_keys: set[tuple[str, str]] = set()
    if existing.data:
        existing_keys = {(r["source"], r["source_id"]) for r in existing.data}

    supabase.table("properties").upsert(
        properties,
        on_conflict="source,source_id",
    ).execute()

    new = [
        p for p in properties
        if (p["source"], p["source_id"]) not in existing_keys
    ]
    return new


if __name__ == "__main__":
    print(f"[{datetime.now(timezone.utc).isoformat()}] Starting scrape...")

    supabase = build_supabase_client()

    # Run all source scrapers
    all_listings: list[dict] = []

    print("Fetching from Rightmove...")
    all_listings.extend(rightmove.scrape())

    # Future sources:
    # print("Fetching from Zoopla...")
    # all_listings.extend(zoopla.scrape())

    print(f"Upserting {len(all_listings)} listings into Supabase...")
    new_listings = upsert_properties(supabase, all_listings)

    print(f"\nFound {len(all_listings)} total, {len(new_listings)} new listings")
    if new_listings:
        print("New listings:")
        for p in new_listings:
            print(f"  {p['listing_url']}")
