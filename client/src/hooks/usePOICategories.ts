
import { useMemo } from 'react';

export interface POICategoryInfo {
  category: string;
  count: number;
  icon: string;
  label: string;
  color: string;
  subcategories: string[];
}

export const usePOICategories = (pois: any[], site: string) => {
  return useMemo(() => {
    if (!pois || pois.length === 0) return [];

    // Analyze actual POI data to determine most frequent categories
    const categoryCount: Record<string, { count: number; examples: string[] }> = {};
    
    pois.forEach(poi => {
      // Check various category fields
      const categories = [
        poi.amenity,
        poi.leisure,
        poi.shop,
        poi.tourism,
        poi.building,
        poi.sport,
        poi.healthcare
      ].filter(Boolean);

      categories.forEach(cat => {
        if (!categoryCount[cat]) {
          categoryCount[cat] = { count: 0, examples: [] };
        }
        categoryCount[cat].count++;
        if (categoryCount[cat].examples.length < 3) {
          categoryCount[cat].examples.push(poi.name);
        }
      });
    });

    // Sort by frequency and create button config
    const sortedCategories = Object.entries(categoryCount)
      .sort(([,a], [,b]) => b.count - a.count)
      .slice(0, 6); // Top 6 most frequent

    // Map to button configuration
    return sortedCategories.map(([category, data]) => ({
      category: getButtonCategory(category),
      count: data.count,
      icon: getCategoryIcon(category),
      label: getCategoryLabel(category),
      color: getCategoryColor(category),
      subcategories: [category],
      examples: data.examples
    }));
  }, [pois, site]);
};

function getButtonCategory(osmCategory: string): string {
  // Map OSM categories to our button categories
  const categoryMap: Record<string, string> = {
    'parking': 'parking',
    'playground': 'leisure',
    'pitch': 'leisure', 
    'sports_centre': 'leisure',
    'place_of_worship': 'amenity',
    'fire_station': 'amenity',
    'school': 'amenity',
    'townhall': 'amenity',
    'community_centre': 'amenity',
    'supermarket': 'shop',
    'bakery': 'shop',
    'bicycle': 'shop',
    'restaurant': 'food-drink',
    'cafe': 'food-drink',
    'pub': 'food-drink',
    'hotel': 'tourism',
    'guest_house': 'tourism',
    'apartment': 'tourism',
    'chalet': 'tourism',
    'doctor': 'amenity',
    'dentist': 'amenity',
    'bank': 'amenity'
  };
  
  return categoryMap[osmCategory] || 'other';
}

function getCategoryIcon(category: string): string {
  const iconMap: Record<string, string> = {
    'parking': '🅿️',
    'playground': '🎪',
    'pitch': '⚽',
    'sports_centre': '🏟️',
    'place_of_worship': '⛪',
    'fire_station': '🚒',
    'school': '🏫',
    'townhall': '🏛️',
    'community_centre': '🏢',
    'supermarket': '🛒',
    'bakery': '🥖',
    'bicycle': '🚲',
    'restaurant': '🍽️',
    'cafe': '☕',
    'pub': '🍺',
    'hotel': '🏨',
    'guest_house': '🏠',
    'apartment': '🏠',
    'chalet': '🏔️',
    'doctor': '👨‍⚕️',
    'dentist': '🦷',
    'bank': '🏦'
  };
  
  return iconMap[category] || '📍';
}

function getCategoryLabel(category: string): string {
  const labelMap: Record<string, string> = {
    'parking': 'Parkplätze',
    'playground': 'Spielplätze',
    'pitch': 'Sportplätze',
    'sports_centre': 'Sporthallen',
    'place_of_worship': 'Kirchen',
    'fire_station': 'Feuerwehr',
    'school': 'Schulen',
    'townhall': 'Rathaus',
    'community_centre': 'Gemeindezentren',
    'supermarket': 'Supermärkte',
    'bakery': 'Bäckereien',
    'bicycle': 'Fahrradläden',
    'restaurant': 'Restaurants',
    'cafe': 'Cafés',
    'pub': 'Kneipen',
    'hotel': 'Hotels',
    'guest_house': 'Pensionen',
    'apartment': 'Ferienwohnungen',
    'chalet': 'Chalets',
    'doctor': 'Ärzte',
    'dentist': 'Zahnärzte',
    'bank': 'Banken'
  };
  
  return labelMap[category] || category;
}

function getCategoryColor(category: string): string {
  const colorMap: Record<string, string> = {
    'parking': 'bg-gray-500',
    'playground': 'bg-pink-500',
    'pitch': 'bg-green-500',
    'sports_centre': 'bg-green-600',
    'place_of_worship': 'bg-purple-500',
    'fire_station': 'bg-red-500',
    'school': 'bg-blue-500',
    'townhall': 'bg-indigo-500',
    'community_centre': 'bg-indigo-400',
    'supermarket': 'bg-orange-500',
    'bakery': 'bg-yellow-500',
    'bicycle': 'bg-cyan-500',
    'restaurant': 'bg-orange-600',
    'cafe': 'bg-amber-500',
    'pub': 'bg-amber-600',
    'hotel': 'bg-blue-600',
    'guest_house': 'bg-blue-400',
    'apartment': 'bg-teal-500',
    'chalet': 'bg-green-700',
    'doctor': 'bg-red-400',
    'dentist': 'bg-red-300',
    'bank': 'bg-green-800'
  };
  
  return colorMap[category] || 'bg-gray-400';
}
