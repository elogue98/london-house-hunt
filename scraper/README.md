# Rightmove Scraper

Python scraper that fetches new rental listings from Rightmove for Islington, London and upserts them into Supabase.

## Setup

```bash
cd scraper
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Configuration

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

## Usage

```bash
python scraper.py
```

Run daily via cron or a scheduler (e.g. GitHub Actions, cron job).

## Files

- `scraper.py` — main entry point
- `requirements.txt` — Python dependencies
- `.env.example` — environment variable template
