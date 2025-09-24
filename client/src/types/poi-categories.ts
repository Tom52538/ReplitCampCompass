export type POICategory = 'leisure' | 'services' | 'parking' | 'accommodation' | 'beach_houses' | 'bungalows' | 'chalets' | 'campgrounds' | 'lodge' | 'bungalows_water' | 'accommodations_rolling' | 'food-drink' | 'toilets' | 'facilities' | 'religious' | 'shopping' | 'healthcare' | 'other';

export interface POICategoryConfig {
  name: string;
  icon: string;
  color: string;
  subcategories: string[];
}

// Category mappings for POI filtering and display
export interface POICategoryDefinition {
  id: string;
  name: string;
  icon: string;
  color: string;
  subcategories?: string[];
}

// Main category definitions
export const POI_CATEGORIES: Record<string, POICategoryDefinition> = {
  accommodation: {
    id: 'accommodation',
    name: 'Accommodation',
    icon: '🏠',
    color: 'bg-blue-500',
    subcategories: ['hotel', 'camping', 'cabin', 'beach_houses']
  },
  'food-drink': {
    id: 'food-drink',
    name: 'Food & Drink',
    icon: '🍽️',
    color: 'bg-orange-500',
    subcategories: ['restaurant', 'cafe', 'bar']
  },
  leisure: {
    id: 'leisure',
    name: 'Leisure',
    icon: '🏊',
    color: 'bg-green-500',
    subcategories: ['sports', 'swimming', 'playground']
  },
  services: {
    id: 'services',
    name: 'Services',
    icon: 'ℹ️',
    color: 'bg-purple-500',
    subcategories: ['reception', 'shop', 'medical']
  },
  parking: {
    id: 'parking',
    name: 'Parking',
    icon: '🚗',
    color: 'bg-gray-500',
    subcategories: ['car_park', 'parking_space']
  },
  beach_houses: {
    id: 'beach_houses',
    name: 'Beach Houses',
    icon: '🏖️',
    color: 'bg-cyan-500',
    subcategories: ['beach', 'house']
  },
  bungalows: {
    id: 'bungalows',
    name: 'Bungalows',
    icon: '🏘️',
    color: 'bg-green-600',
    subcategories: ['bungalow']
  },
  chalets: {
    id: 'chalets',
    name: 'Chalets',
    icon: '🏔️',
    color: 'bg-amber-600',
    subcategories: ['chalet']
  },
  campgrounds: {
    id: 'campgrounds',
    name: 'Campgrounds',
    icon: '⛺',
    color: 'bg-emerald-600',
    subcategories: ['caravan', 'camping']
  },
  lodge: {
    id: 'lodge',
    name: 'Lodges',
    icon: '🏠',
    color: '#2563eb',
    subcategories: []
  },
  bungalows_water: {
    id: 'bungalows_water',
    name: 'Water Bungalows',
    icon: '🏝️',
    color: 'bg-teal-600',
    subcategories: ['bungalow', 'water']
  },
  religious: {
    id: 'religious',
    name: 'Religion & Culture',
    icon: '⛪',
    color: 'bg-amber-800',
    subcategories: ['church', 'chapel', 'place_of_worship']
  },
  shopping: {
    id: 'shopping',
    name: 'Shopping',
    icon: '🛒',
    color: 'bg-yellow-500',
    subcategories: ['supermarket', 'shop', 'bakery']
  },
  healthcare: {
    id: 'healthcare',
    name: 'Healthcare & Education',
    icon: '🏥',
    color: 'bg-teal-600',
    subcategories: ['hospital', 'doctor', 'pharmacy', 'school']
  }
};

// Additional category definitions
export const POI_CATEGORY_CONFIG = POI_CATEGORIES;