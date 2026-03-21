-- London House Hunt
-- Rental properties scraped from estate agent sites for Islington, London (2000-2700 GBP/month).
-- MVP sources: Rightmove. Designed to support Zoopla, OnTheMarket, etc.

drop table if exists properties;

create table properties (
  id                 uuid        primary key default gen_random_uuid(),
  source             text        not null default 'rightmove',
  source_id          text        not null,
  address            text        not null,
  price              integer     not null,
  bedrooms           integer,
  bathrooms          integer,
  property_type      text,
  description        text,
  image_url          text,
  listing_url        text        not null,
  agent_name         text,
  first_visible_date timestamptz,
  first_seen_at      timestamptz not null default now(),
  last_seen_at       timestamptz not null default now(),
  is_active          boolean     not null default true,
  category           text,
  notes              text,

  unique (source, source_id)
);

comment on table properties is
  'Rental listings scraped from estate agent sites for Islington, London. Keyed on (source, source_id) for upsert deduplication across multiple sources. Category: bin/wishlist/called/null.';

create index idx_properties_first_seen on properties (first_seen_at desc);
create index idx_properties_source on properties (source);
create index idx_properties_category on properties (category);
