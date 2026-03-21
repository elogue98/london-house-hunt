"""
Rightmove source module.
Fetches rental listings by scraping the embedded JSON from Rightmove search pages.
"""

import json
import re
import time
from datetime import datetime, timezone

import httpx

BASE_URL = "https://www.rightmove.co.uk"
SEARCH_URL = BASE_URL + "/property-to-rent/find.html"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-GB,en;q=0.9",
}

SEARCH_PARAMS = {
    "locationIdentifier": "REGION^93965",
    "minPrice": "2000",
    "maxPrice": "2700",
    "numberOfPropertiesPerPage": "24",
    "channel": "RENT",
    "currencyCode": "GBP",
    "sortType": "6",
    "maxDaysSinceAdded": "3",
}

MAX_PAGES = 42
PAGE_SIZE = 24
DELAY_SECONDS = 2

_EMBEDDED_JSON_RE = re.compile(
    r'<script[^>]*type="application/json"[^>]*>(.*?)</script>', re.DOTALL
)


def _fetch_page(client: httpx.Client, index: int) -> tuple[list[dict], int]:
    """
    Fetch one page of search results.
    Extracts property data from the embedded JSON in the HTML response.
    Returns (raw property list, total result count).
    """
    params = {**SEARCH_PARAMS, "index": str(index)}
    response = client.get(SEARCH_URL, params=params, timeout=15)
    response.raise_for_status()

    match = _EMBEDDED_JSON_RE.search(response.text)
    if not match:
        raise ValueError(f"No embedded JSON found in Rightmove response (index={index})")

    data = json.loads(match.group(1))
    search_results = data["props"]["pageProps"]["searchResults"]

    properties = search_results.get("properties", [])
    total = search_results.get("resultCount", 0)
    if isinstance(total, str):
        total = int(total.replace(",", ""))

    return properties, total


def _get_monthly_price(price_data: dict) -> int:
    """Extract the monthly price, converting from weekly if needed."""
    display_prices = price_data.get("displayPrices", [])
    for dp in display_prices:
        text = dp.get("displayPrice", "")
        if "pcm" in text:
            # Extract number from e.g. "£2,600 pcm"
            num = re.sub(r"[^\d]", "", text)
            if num:
                return int(num)

    # Fallback: use the raw amount and convert weekly to monthly if needed
    amount = price_data.get("amount", 0)
    freq = price_data.get("frequency", "").lower()
    if freq == "weekly":
        return int(amount * 52 / 12)
    return amount


def _parse_property(prop: dict, now: str) -> dict:
    """Map a single Rightmove property object to the generic DB schema."""
    # First image from the images list
    images = prop.get("images", [])
    first_image = None
    for img in images:
        if img.get("srcUrl"):
            first_image = img["srcUrl"]
            break

    # Fall back to propertyImages if images list didn't have srcUrl
    if not first_image:
        pi_images = prop.get("propertyImages", {}).get("images", [])
        for img in pi_images:
            if img.get("srcUrl"):
                first_image = img["srcUrl"]
                break

    raw_url = prop.get("propertyUrl", "")
    listing_url = BASE_URL + raw_url if raw_url.startswith("/") else raw_url

    first_visible = prop.get("firstVisibleDate") or (
        prop.get("listingUpdate", {}).get("listingUpdateDate")
    )

    price = _get_monthly_price(prop.get("price", {}))

    return {
        "source": "rightmove",
        "source_id": str(prop["id"]),
        "address": prop.get("displayAddress", ""),
        "price": price,
        "bedrooms": prop.get("bedrooms") or 0,
        "bathrooms": prop.get("bathrooms"),
        "property_type": prop.get("propertySubType") or "",
        "description": prop.get("summary"),
        "image_url": first_image,
        "listing_url": listing_url,
        "agent_name": prop.get("customer", {}).get("branchDisplayName"),
        "first_visible_date": first_visible,
        "last_seen_at": now,
    }


def scrape() -> list[dict]:
    """
    Paginate through all Rightmove results for the Islington search.
    Returns a list of property dicts matching the DB schema.
    """
    now = datetime.now(timezone.utc).isoformat()
    all_raw: list[dict] = []

    with httpx.Client(headers=HEADERS, follow_redirects=True) as client:
        raw_props, total = _fetch_page(client, 0)
        all_raw.extend(raw_props)

        total_pages = min((total + PAGE_SIZE - 1) // PAGE_SIZE, MAX_PAGES)
        print(f"  Rightmove: {total} results across {total_pages} page(s)")

        for page in range(1, total_pages):
            time.sleep(DELAY_SECONDS)
            index = page * PAGE_SIZE
            raw_props, _ = _fetch_page(client, index)
            if not raw_props:
                break
            all_raw.extend(raw_props)
            print(f"  Fetched page {page + 1}/{total_pages} ({len(all_raw)} so far)")

    return [_parse_property(p, now) for p in all_raw]
