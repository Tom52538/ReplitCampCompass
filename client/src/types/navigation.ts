export interface Coordinates {
  lat: number;
  lng: number;
}

export interface POI {
  id: string;
  name: string;
  lodge_number?: string;
  category: string;
  subcategory?: string;
  subCategory?: string; // Alias for subcategory for API compatibility
  coordinates: Coordinates;
  description?: string;
  address?: string;
  phone?: string;
  website?: string;
  url?: string; // URL property for enriched POIs
  openingHours?: string;
  opening_hours?: string; // API compatibility
  hours?: string; // API compatibility
  distance?: number;
  rating?: number;
  image?: string;
  amenities?: string[];

  // OSM properties (from backend POI data)
  amenity?: string;
  leisure?: string;
  tourism?: string;
  shop?: string;
  building?: string;
  sport?: string;
  healthcare?: string;
  boundary?: string;
  natural?: string;
  parking?: string;
  [key: string]: any; // Allow additional OSM properties

  // Enrichment data properties
  enriched?: boolean;
  accommodation_id?: string;
  capacity?: {
    max_persons: number;
  };
  features?: string[];
  price_info?: string;
  images?: {
    primary?: {
      image_id: string;
      index: number;
      original_url: string;
      local_path: string;
      filename: string;
      category: string;
      alt_text: string;
      title: string;
      file_info: {
        size_bytes: number;
        format: string;
        mime_type: string;
      };
      dimensions: {
        width: number;
        height: number;
      };
      hashes: {
        md5: string;
        phash: string;
      };
      download_timestamp: string;
    };
    gallery?: Array<{
      image_id: string;
      index: number;
      original_url: string;
      local_path: string;
      filename: string;
      category: string;
      alt_text: string;
      title: string;
      file_info: {
        size_bytes: number;
        format: string;
        mime_type: string;
      };
      dimensions: {
        width: number;
        height: number;
      };
      hashes: {
        md5: string;
        phash: string;
      };
      download_timestamp: string;
    }>;
    total_count: number;
    found_count: number;
  };
  type?: string;
  enriched_at?: string;
  language?: string;
  primaryImage?: string;
  imageGallery?: Array<{
    url: string;
    category: string;
    dimensions: {
      width: number;
      height: number;
    };
  }>;
  // Additional backend POI properties
  roompot_category?: string;
  building_type?: string;
  enrichment_key?: string;
  data_source?: string;
  osm_id?: string;
  // Enrichment URL properties
  accommodationUrl?: string;
  roompot_url?: string;
}

export interface RouteInstruction {
  instruction: string;
  distance: string;
  duration: string;
  maneuverType: string;
}

export interface RouteResponse {
  success: boolean;
  totalDistance: string;
  estimatedTime: string;
  durationSeconds?: number;
  instructions: RouteInstruction[];
  geometry: [number, number][];
  nextInstruction: RouteInstruction;
  arrivalTime: string;
  eta?: string; // For compatibility with Navigation.tsx usage
  fallbackReason?: string; // Grund für Google Directions Fallback
}

export interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  location: string;
  icon: string;
}

export interface NavigationState {
  currentPosition: Coordinates | null;
  destination: POI | null;
  route: RouteResponse | null;
  isNavigating: boolean;
  selectedPOI: POI | null;
}

// Site ID type for string literals
export type Site = 'kamperland' | 'zuhause';

export interface TestSite {
  name: string;
  center: Coordinates;
  zoom: number;
  category: string;
}

export const TEST_SITES: TestSite[] = [
  {
    name: 'Main Reception',
    center: { lat: 51.589, lng: 3.716 },
    zoom: 17,
    category: 'services'
  }
];

// Re-export POI_CATEGORIES from poi-categories.ts to fix import errors
export { POI_CATEGORIES, type POICategory, type POICategoryConfig } from './poi-categories';

// Import POI_CATEGORIES first before using it
import { POI_CATEGORIES } from './poi-categories';

// Also export POI_CATEGORIES directly for backward compatibility
export const POI_CATEGORIES_COMPAT = POI_CATEGORIES;

// CategoryFilter.tsx has been removed - use LightweightPOIButtons instead