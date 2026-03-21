# London House Hunt

A daily Rightmove rental tracker for Islington, London. Automatically scrapes new listings priced between £2,000–£2,700/month and displays them in a clean dashboard.

## What it does

1. **Python scraper** (`scraper/`) — runs daily, fetches rental listings from Rightmove for Islington and upserts them into a Supabase database.
2. **Next.js dashboard** (`app/dashboard`) — displays all current listings with price, bedrooms, property type, and highlights newly added properties.

## Tech stack

| Layer       | Technology                  |
|-------------|-----------------------------|
| Frontend    | Next.js 14 (App Router)     |
| Styling     | Tailwind CSS                |
| Language    | TypeScript                  |
| Database    | Supabase (Postgres)         |
| Scraper     | Python + BeautifulSoup      |

## Project structure

```
london-house-hunt/
├── app/
│   ├── dashboard/          # Property listings dashboard
│   ├── api/properties/     # API route (reads from Supabase)
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── properties/         # PropertyCard, PropertyGrid
│   └── ui/                 # DashboardHeader, StatsBar
├── lib/
│   └── supabase.ts         # Supabase client
├── types/
│   └── property.ts         # Shared TypeScript types
├── supabase/
│   └── schema.sql          # Database schema
└── scraper/
    ├── scraper.py          # Main scraper script
    ├── requirements.txt
    └── .env.example
```

## Getting started

### 1. Supabase

Create a project at [supabase.com](https://supabase.com), then run `supabase/schema.sql` in the SQL editor to create the `properties` table.

### 2. Next.js frontend

```bash
cp .env.local.example .env.local
# Fill in your Supabase URL and anon key

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 3. Python scraper

```bash
cd scraper
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Fill in your Supabase URL and service role key

python scraper.py
```

Schedule it daily with cron or GitHub Actions.

## Search criteria

| Parameter | Value             |
|-----------|-------------------|
| Location  | Islington, London |
| Min price | £2,000/month      |
| Max price | £2,700/month      |
| Type      | Rent              |
