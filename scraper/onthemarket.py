"""
OnTheMarket source module.
Fetches rental listings by extracting the embedded Redux state from search pages.
"""

import json
import re
import time
from datetime import datetime, timezone

import httpx

BASE_URL = "https://www.onthemarket.com"
SEARCH_URL = BASE_URL + "/to-rent/property/islington/"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/131.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-GB,en;q=0.9",
}

SEARCH_PARAMS = {
    "min-price": "2000",
    "max-price": "2700",
}

MAX_PAGES = 10
DELAY_SECONDS = 2

_REDUX_RE = re.compile(
    r'"initialReduxState"\s*:\s*(\{.*\})\s*,\s*"initialProps"', re.DOTALL
)


def _fetch_page(client: httpx.Client, page: int) -> tuple[list[dict], int]:
    """
    Fetch one page of search results.
    Extracts property data from the embedded Redux state in the HTML response.
    Returns (raw property list, total result count).
    """
    params = {**SEARCH_PARAMS}
    if page > 1:
        params["page"] = str(page)

    response = client.get(SEARCH_URL, params=params, timeout=15)
    response.raise_for_status()

    # The Redux state is inside a large <script> tag containing initialReduxState
    # It's part of a JSON object: {"props":{"pageProps":{},"initialReduxState":{...},...}}
    scripts = re.findall(r"<script[^>]*>(.*?)</script>", response.text, re.DOTALL)

    results_list = []
    total = 0

    for script in scripts:
        if "initialReduxState" not in script:
            continue

        # Parse the full JSON blob
        json_match = re.search(r'(\{"props".*\})', script)
        if not json_match:
            continue

        data = json.loads(json_match.group(1))
        redux = data.get("props", {}).get("initialReduxState", {})
        results = redux.get("results", {})

        results_list = results.get("list", [])
        total_str = results.get("totalResults", "0")
        if isinstance(total_str, str):
            total = int(total_str.replace(",", ""))
        else:
            total = int(total_str)
        break

    return results_list, total


def _get_monthly_price(price_str: str) -> int:
    """Extract the monthly price from OTM price string like '£2,500 pcm (£577 pw)'."""
    # Try pcm first
    pcm_match = re.search(r"£([\d,]+)\s*pcm", price_str)
    if pcm_match:
        return int(pcm_match.group(1).replace(",", ""))

    # Fall back to pw and convert
    pw_match = re.search(r"£([\d,]+)\s*pw", price_str)
    if pw_match:
        weekly = int(pw_match.group(1).replace(",", ""))
        return int(weekly * 52 / 12)

    # Last resort: any number
    num = re.sub(r"[^\d]", "", price_str)
    return int(num) if num else 0


def _parse_property(prop: dict, now: str) -> dict:
    """Map a single OnTheMarket property object to the generic DB schema."""
    # Image
    images = prop.get("images", [])
    first_image = None
    if images:
        first_image = images[0].get("default") or images[0].get("webp")

    # URL
    details_url = prop.get("details-url", "")
    listing_url = BASE_URL + details_url if details_url.startswith("/") else details_url

    # Price
    price = _get_monthly_price(prop.get("price", ""))

    # Agent
    agent = prop.get("agent", {})
    agent_name = agent.get("name")

    # Listing update info from "days-since-added-reduced" field
    days_info = prop.get("days-since-added-reduced", "")
    is_reduced = prop.get("reduced?", False)
    listing_update_reason = "price_reduced" if is_reduced else None

    return {
        "source": "onthemarket",
        "source_id": str(prop.get("id", "")),
        "address": prop.get("address", ""),
        "price": price,
        "bedrooms": prop.get("bedrooms"),
        "bathrooms": prop.get("bathrooms"),
        "property_type": prop.get("humanised-property-type") or "",
        "description": ", ".join(prop.get("features", [])) if prop.get("features") else None,
        "image_url": first_image,
        "listing_url": listing_url,
        "agent_name": agent_name,
        "first_visible_date": None,  # OTM doesn't provide exact dates in search results
        "listing_update_date": None,
        "listing_update_reason": listing_update_reason,
        "last_seen_at": now,
    }


def scrape() -> list[dict]:
    """
    Paginate through all OnTheMarket results for the Islington search.
    Returns a list of property dicts matching the DB schema.
    """
    now = datetime.now(timezone.utc).isoformat()
    all_raw: list[dict] = []

    with httpx.Client(headers=HEADERS, follow_redirects=True) as client:
        raw_props, total = _fetch_page(client, 1)
        all_raw.extend(raw_props)

        page_size = len(raw_props) or 30
        total_pages = min((total + page_size - 1) // page_size, MAX_PAGES)
        print(f"  OnTheMarket: {total} results across {total_pages} page(s)")

        for page in range(2, total_pages + 1):
            time.sleep(DELAY_SECONDS)
            raw_props, _ = _fetch_page(client, page)
            if not raw_props:
                break
            all_raw.extend(raw_props)
            print(f"  Fetched page {page}/{total_pages} ({len(all_raw)} so far)")

    return [_parse_property(p, now) for p in all_raw]
