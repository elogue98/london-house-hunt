"""
London House Hunt — scraper orchestrator.
Runs all source modules (Rightmove, etc.), upserts results into Supabase,
and reports new listings.
"""

import os
import httpx
from datetime import datetime, timezone

from dotenv import load_dotenv
from supabase import create_client, Client

import rightmove
import onthemarket

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


def send_email_notification(new_listings: list[dict]) -> None:
    api_key = os.environ.get("RESEND_API_KEY")
    to_email = os.environ.get("NOTIFY_EMAIL")
    if not api_key or not to_email:
        print("  No RESEND_API_KEY or NOTIFY_EMAIL set — skipping email.")
        return

    rows = ""
    for p in new_listings:
        beds = f"{p['bedrooms']}bed · " if p.get("bedrooms") else ""
        price = f"£{p['price']:,}/mo"
        rows += f"""
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #e5e0da;">
            <a href="{p['listing_url']}" style="font-size:15px;font-weight:600;color:#1a1715;text-decoration:none;">
              {p['address']}
            </a><br>
            <span style="font-size:13px;color:#5a534e;">{beds}{price} · {p.get('agent_name') or p['source']}</span>
          </td>
        </tr>"""

    count = len(new_listings)
    html = f"""
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1715;">
      <h2 style="font-size:20px;margin-bottom:4px;">
        {count} new listing{'s' if count != 1 else ''} on London House Hunt
      </h2>
      <p style="font-size:13px;color:#9a928c;margin-top:0;">
        Islington · £2,000–£2,700/mo
      </p>
      <table style="width:100%;border-collapse:collapse;">{rows}</table>
      <p style="margin-top:24px;">
        <a href="https://london-house-hunt.vercel.app/dashboard"
           style="background:#c45a3c;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;">
          View dashboard
        </a>
      </p>
    </div>"""

    resp = httpx.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={
            "from": "London House Hunt <onboarding@resend.dev>",
            "to": [to_email],
            "subject": f"{count} new listing{'s' if count != 1 else ''} — London House Hunt",
            "html": html,
        },
        timeout=15,
    )
    if resp.status_code == 200:
        print(f"  Email sent to {to_email}")
    else:
        print(f"  Email failed: {resp.status_code} {resp.text}")


if __name__ == "__main__":
    print(f"[{datetime.now(timezone.utc).isoformat()}] Starting scrape...")

    supabase = build_supabase_client()

    # Run all source scrapers
    all_listings: list[dict] = []

    print("Fetching from Rightmove...")
    try:
        all_listings.extend(rightmove.scrape())
    except Exception as e:
        print(f"  Rightmove failed: {e}")

    print("Fetching from OnTheMarket...")
    try:
        all_listings.extend(onthemarket.scrape())
    except Exception as e:
        print(f"  OnTheMarket failed: {e}")

    print(f"Upserting {len(all_listings)} listings into Supabase...")
    new_listings = upsert_properties(supabase, all_listings)

    print(f"\nFound {len(all_listings)} total, {len(new_listings)} new listings")
    if new_listings:
        print("New listings:")
        for p in new_listings:
            print(f"  {p['listing_url']}")
        print("Sending email notification...")
        send_email_notification(new_listings)
