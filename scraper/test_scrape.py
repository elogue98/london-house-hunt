"""
Dry-run scrape test. Fetches page 1 from Rightmove and OnTheMarket for the
areas in your active search profile, prints all addresses, and does NOT write
anything to the database.

Usage:
    cd scraper
    python test_scrape.py

Or test a specific area code directly:
    python test_scrape.py --rm-code "REGION^93965" --otm-slug "islington"
"""

import argparse
import json
import os
import re
import sys

import httpx
from dotenv import load_dotenv

load_dotenv()

# ── Rightmove ──────────────────────────────────────────────────────────────

RM_SEARCH_URL = "https://www.rightmove.co.uk/property-to-rent/find.html"
RM_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-GB,en;q=0.9",
}
_RM_JSON_RE = re.compile(
    r'<script[^>]*type="application/json"[^>]*>(.*?)</script>', re.DOTALL
)


def test_rightmove(location_code: str, min_price: int, max_price: int) -> None:
    print(f"\n{'='*60}")
    print(f"RIGHTMOVE  locationIdentifier={location_code}")
    print(f"           price £{min_price:,}–£{max_price:,}/mo  (page 1 only)")
    print(f"{'='*60}")

    params = {
        "numberOfPropertiesPerPage": "24",
        "channel": "RENT",
        "currencyCode": "GBP",
        "sortType": "6",
        "maxDaysSinceAdded": "1",
        "locationIdentifier": location_code,
        "minPrice": str(min_price),
        "maxPrice": str(max_price),
        "index": "0",
    }
    url = RM_SEARCH_URL + "?" + "&".join(f"{k}={v}" for k, v in params.items())
    print(f"URL: {url}\n")

    try:
        with httpx.Client(headers=RM_HEADERS, follow_redirects=True) as client:
            resp = client.get(RM_SEARCH_URL, params=params, timeout=15)
            resp.raise_for_status()

        match = _RM_JSON_RE.search(resp.text)
        if not match:
            print("ERROR: No embedded JSON found in Rightmove response.")
            print("       The page structure may have changed.")
            return

        data = json.loads(match.group(1))
        search_results = data["props"]["pageProps"]["searchResults"]
        props = search_results.get("properties", [])
        total = search_results.get("resultCount", 0)
        if isinstance(total, str):
            total = int(total.replace(",", ""))

        print(f"Total results reported by Rightmove: {total}")
        print(f"Properties on page 1: {len(props)}\n")

        if not props:
            print("No properties returned.")
            return

        print(f"{'#':<4} {'Address':<50} {'Price':>10}  {'Type'}")
        print("-" * 80)
        for i, p in enumerate(props, 1):
            addr = p.get("displayAddress", "?")
            price_data = p.get("price", {})
            display_prices = price_data.get("displayPrices", [])
            price_str = display_prices[0].get("displayPrice", "?") if display_prices else "?"
            prop_type = p.get("propertySubType") or p.get("propertyType") or ""
            print(f"{i:<4} {addr:<50} {price_str:>10}  {prop_type}")

    except httpx.HTTPError as e:
        print(f"HTTP error: {e}")
    except Exception as e:
        print(f"Error: {e}")
        raise


# ── OnTheMarket ────────────────────────────────────────────────────────────

OTM_BASE_URL = "https://www.onthemarket.com"
OTM_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/131.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-GB,en;q=0.9",
}


def test_onthemarket(otm_slug: str, min_price: int, max_price: int) -> None:
    print(f"\n{'='*60}")
    print(f"ONTHEMARKET  slug={otm_slug}")
    print(f"             price £{min_price:,}–£{max_price:,}/mo  (page 1 only)")
    print(f"{'='*60}")

    search_url = OTM_BASE_URL + f"/to-rent/property/{otm_slug}/"
    params = {
        "min-price": str(min_price),
        "max-price": str(max_price),
        "recently-added": "24-hours",
    }
    full_url = search_url + "?" + "&".join(f"{k}={v}" for k, v in params.items())
    print(f"URL: {full_url}\n")

    try:
        with httpx.Client(headers=OTM_HEADERS, follow_redirects=True) as client:
            resp = client.get(search_url, params=params, timeout=15)
            resp.raise_for_status()

        scripts = re.findall(r"<script[^>]*>(.*?)</script>", resp.text, re.DOTALL)
        results_list = []
        total = 0

        for script in scripts:
            if "initialReduxState" not in script:
                continue
            json_match = re.search(r'(\{"props".*\})', script)
            if not json_match:
                continue
            data = json.loads(json_match.group(1))
            redux = data.get("props", {}).get("initialReduxState", {})
            results = redux.get("results", {})
            results_list = results.get("list", [])
            total_str = results.get("totalResults", "0")
            total = int(str(total_str).replace(",", "")) if total_str else 0
            break

        print(f"Total results reported by OnTheMarket: {total}")
        print(f"Properties on page 1: {len(results_list)}\n")

        if not results_list:
            print("No properties returned.")
            return

        print(f"{'#':<4} {'Address':<50} {'Price':>16}  {'Type'}")
        print("-" * 84)
        for i, p in enumerate(results_list, 1):
            addr = p.get("address", "?")
            price = p.get("price", "?")
            prop_type = p.get("humanised-property-type") or ""
            print(f"{i:<4} {addr:<50} {price:>16}  {prop_type}")

    except httpx.HTTPError as e:
        print(f"HTTP error: {e}")
    except Exception as e:
        print(f"Error: {e}")
        raise


# ── Main ───────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Dry-run scrape test (no DB writes)")
    parser.add_argument("--rm-code", default=None, help="Rightmove locationIdentifier, e.g. REGION^93965")
    parser.add_argument("--otm-slug", default=None, help="OnTheMarket URL slug, e.g. islington")
    parser.add_argument("--min-price", type=int, default=2200)
    parser.add_argument("--max-price", type=int, default=2700)
    args = parser.parse_args()

    # If explicit codes provided, test those
    if args.rm_code or args.otm_slug:
        if args.rm_code:
            test_rightmove(args.rm_code, args.min_price, args.max_price)
        if args.otm_slug:
            test_onthemarket(args.otm_slug, args.min_price, args.max_price)
        return

    # Otherwise, load from the active search profile in Supabase
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_KEY")

    if not supabase_url or not supabase_key:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")
        print("Or pass --rm-code and --otm-slug directly.")
        sys.exit(1)

    try:
        from supabase import create_client
        sb = create_client(supabase_url, supabase_key)
        res = sb.table("search_profiles").select("*").eq("is_active", True).execute()
        profiles = res.data or []
    except Exception as e:
        print(f"ERROR fetching profiles from Supabase: {e}")
        sys.exit(1)

    if not profiles:
        print("No active search profiles found.")
        sys.exit(1)

    print(f"Found {len(profiles)} active profile(s). Testing each area...\n")

    for profile in profiles:
        print(f"\n{'#'*60}")
        print(f"Profile: {profile['name']}  (£{profile['min_price']:,}–£{profile['max_price']:,}/mo)")
        print(f"{'#'*60}")
        for area in profile.get("areas", []):
            print(f"\n>>> Area: {area['name']}")
            test_rightmove(area["rightmove_code"], profile["min_price"], profile["max_price"])
            test_onthemarket(area["otm_slug"], profile["min_price"], profile["max_price"])


if __name__ == "__main__":
    main()
