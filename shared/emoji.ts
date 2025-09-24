/**
 * Centralized emoji mapping for POI categories
 */

export const POI_CATEGORY_EMOJIS: Record<string, string> = {
  // Accommodation
  'accommodation': '🏠',
  'lodge': '🏘️',
  'beach_houses': '🏖️',
  'chalet': '🏘️',
  'apartment': '🏢',
  'hotel': '🏨',
  
  // Recreation & Entertainment  
  'recreation': '🎮',
  'playground': '🛝',
  'sports': '⚽',
  'pool': '🏊',
  'tennis': '🎾',
  'golf': '⛳',
  'fitness': '💪',
  'spa': '💆',
  
  // Food & Dining
  'restaurant': '🍽️',
  'cafe': '☕',
  'bar': '🍺',
  'fast_food': '🍔',
  'ice_cream': '🍦',
  'bakery': '🥐',
  
  // Shopping & Services
  'shop': '🛒',
  'supermarket': '🛍️',
  'pharmacy': '💊',
  'bank': '🏦',
  'atm': '💳',
  'laundry': '👕',
  'bike_rental': '🚲',
  
  // Health & Safety
  'hospital': '🏥',
  'clinic': '🩺',
  'first_aid': '🚑',
  'security': '🛡️',
  
  // Nature & Beach
  'beach': '🏖️',
  'nature': '🌲',
  'park': '🌳',
  'garden': '🌺',
  'lake': '🏞️',
  'forest': '🌲',
  
  // Transportation
  'parking': '🅿️',
  'bus_stop': '🚌',
  'taxi': '🚕',
  'charging_station': '🔌',
  'bike_parking': '🚲',
  
  // Facilities
  'toilet': '🚽',
  'shower': '🚿',
  'wifi': '📶',
  'reception': '🏢',
  'information': 'ℹ️',
  'phone': '📞',
  'post_office': '📮',
  
  // Entertainment
  'cinema': '🎬',
  'theater': '🎭',
  'library': '📚',
  'museum': '🏛️',
  'gallery': '🖼️',
  
  // Default fallbacks
  'poi': '📍',
  'other': '🔵',
  'facility': '🏢',
  'service': '⚙️'
};

/**
 * Get emoji for a POI category with fallback
 * @param category POI category string
 * @returns Emoji string
 */
export function getEmojiForCategory(category: string): string {
  // Normalize category string
  const normalizedCategory = category?.toLowerCase().trim() || '';
  
  // Direct match
  if (POI_CATEGORY_EMOJIS[normalizedCategory]) {
    return POI_CATEGORY_EMOJIS[normalizedCategory];
  }
  
  // Partial matches for common patterns
  const partialMatches: Record<string, string> = {
    'house': '🏠',
    'beach': '🏖️',
    'water': '💧',
    'sport': '⚽',
    'food': '🍽️',
    'drink': '🍺',
    'shop': '🛒',
    'park': '🌳',
    'car': '🅿️',
    'bike': '🚲',
    'pool': '🏊',
    'play': '🛝',
    'rest': '🍽️',
    'toilet': '🚽',
    'shower': '🚿'
  };
  
  // Check for partial matches
  for (const [pattern, emoji] of Object.entries(partialMatches)) {
    if (normalizedCategory.includes(pattern)) {
      return emoji;
    }
  }
  
  // Default fallback
  return POI_CATEGORY_EMOJIS.poi;
}

/**
 * Get color for POI category
 * @param category POI category string
 * @returns CSS color class
 */
export function getColorForCategory(category: string): string {
  const colorMap: Record<string, string> = {
    'accommodation': 'bg-blue-500',
    'beach_houses': 'bg-cyan-500', 
    'recreation': 'bg-green-500',
    'restaurant': 'bg-orange-500',
    'shop': 'bg-purple-500',
    'health': 'bg-red-500',
    'nature': 'bg-emerald-500',
    'transportation': 'bg-gray-500',
    'facility': 'bg-indigo-500'
  };
  
  const normalizedCategory = category?.toLowerCase().trim() || '';
  return colorMap[normalizedCategory] || 'bg-slate-500';
}