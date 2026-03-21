export type PropertyCategory = 'bin' | 'wishlist' | 'called';

export interface Property {
  id: string;
  source: string;
  source_id: string;
  address: string;
  price: number;
  bedrooms: number | null;
  bathrooms: number | null;
  property_type: string | null;
  description: string | null;
  image_url: string | null;
  listing_url: string;
  agent_name: string | null;
  first_visible_date: string | null;
  first_seen_at: string;
  last_seen_at: string;
  is_active: boolean;
  category: PropertyCategory | null;
  notes: string | null;
}

export interface PropertyFilters {
  min_price?: number;
  max_price?: number;
  min_bedrooms?: number;
  max_bedrooms?: number;
  property_type?: string;
  source?: string;
}
