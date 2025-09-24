import { POI as DatabasePOI } from '../../shared/schema';
import { Coordinates, POICategory, POI } from '../../client/src/types/navigation';
import * as turf from '@turf/turf';

export interface GeoJSONFeature {
  type: 'Feature';
  properties: {
    [key: string]: any;
    name?: string;
    amenity?: string;
    leisure?: string;
    tourism?: string;
    shop?: string;
    sport?: string;
    cuisine?: string;
    phone?: string;
    website?: string;
    opening_hours?: string;
    'addr:street'?: string;
    'addr:housenumber'?: string;
    'addr:city'?: string;
  };
  geometry: {
    type: 'Point' | 'Polygon' | 'LineString';
    coordinates: number[] | number[][] | number[][][];
  };
  id?: string;
}

export interface GeoJSONCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

// Optimierte Kategorisierung basierend auf echter Datenanalyse
function categorizeFeatureOptimized(properties: GeoJSONFeature['properties']): POICategory {
  // 1. GASTRONOMIE - Höchste Priorität für Restaurants/Cafes
  const gastroAmenities = ['restaurant', 'cafe', 'bar', 'pub', 'fast_food', 'biergarten', 'ice_cream'];
  if (properties.amenity && gastroAmenities.includes(properties.amenity)) {
    return 'gastronomie';
  }
  if (properties.cuisine) return 'gastronomie';
  if (properties.cafe === 'yes') return 'gastronomie';
  if (properties.brewery) return 'gastronomie';
  if (properties.takeaway === 'yes' && (properties.amenity === 'restaurant' || properties.shop === 'bakery')) {
    return 'gastronomie';
  }

  // 2. SHOPPING - Alle shop-Properties + Brands
  if (properties.shop) return 'services'; // Shopping wird als services kategorisiert
  const shoppingAmenities = ['marketplace', 'vending_machine'];
  if (properties.amenity && shoppingAmenities.includes(properties.amenity)) {
    return 'services';
  }
  if (properties.brand) return 'services';

  // 3. SERVICES - Bank, Post, Gesundheit, Handwerk
  const serviceAmenities = [
    'bank', 'atm', 'post_office', 'pharmacy', 'hospital', 'clinic',
    'dentist', 'veterinary', 'fuel', 'car_wash', 'car_repair'
  ];
  if (properties.amenity && serviceAmenities.includes(properties.amenity)) {
    return 'services';
  }
  if (properties.office) return 'services';
  if (properties.government) return 'services';
  if (properties.healthcare) return 'services';
  if (properties.craft) return 'services';

  // 4. LEISURE - Freizeit, Sport, Kultur
  if (properties.leisure) return 'leisure';
  if (properties.sport) return 'leisure';
  const tourismLeisure = ['attraction', 'viewpoint', 'museum', 'monument', 'artwork'];
  if (properties.tourism && tourismLeisure.includes(properties.tourism)) {
    return 'leisure';
  }
  const leisureAmenities = ['cinema', 'theatre', 'community_centre', 'library'];
  if (properties.amenity && leisureAmenities.includes(properties.amenity)) {
    return 'leisure';
  }
  if (properties.historic) return 'leisure';

  // 5. RELIGION - Kirchen, Friedhöfe
  if (properties.religion) return 'other'; // Neue Kategorie 'religion' falls verfügbar
  const religiousAmenities = ['place_of_worship', 'monastery', 'grave_yard'];
  if (properties.amenity && religiousAmenities.includes(properties.amenity)) {
    return 'other'; // oder neue Kategorie 'religion'
  }
  if (properties.denomination) return 'other';
  if (properties.service_times) return 'other';

  // 6. PARKING - Auto und Fahrrad
  if (properties.amenity === 'parking') return 'parking';
  if (properties.parking) return 'parking';
  if (properties.bicycle_parking) return 'facilities';
  if (properties.amenity === 'bicycle_parking') return 'facilities';

  // 7. EDUCATION - Schulen, Kindergarten
  const educationAmenities = ['school', 'kindergarten', 'university', 'college', 'library'];
  if (properties.amenity && educationAmenities.includes(properties.amenity)) {
    return 'other'; // oder neue Kategorie 'education'
  }
  if (properties.school_type) return 'other';
  if (properties['isced:level']) return 'other';

  // 8. INFRASTRUCTURE - Toiletten, Recycling, Utilities
  const utilityAmenities = ['toilets', 'drinking_water', 'waste_disposal', 'recycling', 'charging_station'];
  if (properties.amenity && utilityAmenities.includes(properties.amenity)) {
    if (properties.amenity === 'toilets') return 'toilets';
    return 'facilities';
  }
  if (properties.recycling_type) return 'facilities';
  
  // Check for recycling properties
  const recyclingProps = [
    'recycling:glass', 'recycling:paper', 'recycling:clothes', 'recycling:cardboard',
    'recycling:cans', 'recycling:electrical_items', 'recycling:garden_waste'
  ];
  if (recyclingProps.some(prop => properties[prop])) return 'facilities';
  
  if (properties.man_made) return 'facilities';
  if (properties.barrier) return 'facilities';
  const emergencyAmenities = ['fire_station', 'police'];
  if (properties.amenity && emergencyAmenities.includes(properties.amenity)) {
    return 'services';
  }

  // Legacy Roompot-Kategorien (für Kompatibilität)
  if (properties.roompot_category) {
    const roompotCategory = properties.roompot_category.toLowerCase();
    
    if (roompotCategory.includes('lodge')) return 'lodge';
    if (roompotCategory.includes('beach house') || roompotCategory.includes('strandhaus')) return 'beach_houses';
    if (roompotCategory.includes('bungalow')) {
      return properties.park_id === 'water-village' || roompotCategory.includes('water') ? 'bungalows_water' : 'bungalows';
    }
    if (roompotCategory.includes('chalet')) return 'chalets';
    if (roompotCategory.includes('caravan') || roompotCategory.includes('camping')) return 'campgrounds';
    
    switch (properties.roompot_category) {
      case 'Food & Drinks': return 'gastronomie';
      case 'Shopping':
      case 'Necessities': return 'services';
      case 'Leisure & Entertainment': return 'leisure';
      default: return 'accommodation';
    }
  }

  // Tourism accommodations
  const accommodationTourism = ['hotel', 'guest_house', 'camp_site', 'caravan_site'];
  if (properties.tourism && accommodationTourism.includes(properties.tourism)) {
    return 'accommodation';
  }

  // Building types
  if (properties.building_type) {
    const buildingType = properties.building_type.toLowerCase();
    if (['house', 'detached', 'semidetached_house'].includes(buildingType)) return 'houses';
    if (buildingType === 'bungalow') return 'bungalows';
    if (['cabin', 'chalet'].includes(buildingType)) return 'chalets';
    if (buildingType === 'beach_house' || buildingType === 'strandhaus') return 'beach_houses';
  }

  return 'other';
}

// Optimierte Name-Generierung
function generateOptimizedName(properties: GeoJSONFeature['properties']): string | null {
  // Priorisiere echte Namen
  const realName = properties['name:de'] || properties.name || properties['name:en'] || properties['name:nl'];
  if (realName && realName.trim()) return realName.trim();

  // Generiere Namen basierend auf Properties
  if (properties.amenity) {
    const amenityNames: Record<string, string> = {
      'restaurant': 'Restaurant',
      'cafe': 'Café',
      'bar': 'Bar',
      'pub': 'Gasthaus',
      'fast_food': 'Imbiss',
      'biergarten': 'Biergarten',
      'bank': 'Bank',
      'atm': 'Geldautomat',
      'post_office': 'Post',
      'pharmacy': 'Apotheke',
      'hospital': 'Krankenhaus',
      'clinic': 'Klinik',
      'fuel': 'Tankstelle',
      'parking': 'Parkplatz',
      'toilets': 'WC',
      'place_of_worship': 'Kirche',
      'school': 'Schule',
      'kindergarten': 'Kindergarten',
      'library': 'Bibliothek',
      'community_centre': 'Gemeindezentrum'
    };
    
    if (amenityNames[properties.amenity]) {
      return amenityNames[properties.amenity];
    }
    // Fallback: Kapitalisiere amenity
    return properties.amenity.charAt(0).toUpperCase() + properties.amenity.slice(1).replace(/_/g, ' ');
  }

  if (properties.shop) {
    const shopNames: Record<string, string> = {
      'supermarket': 'Supermarkt',
      'convenience': 'Kiosk',
      'bakery': 'Bäckerei',
      'butcher': 'Metzgerei',
      'clothes': 'Bekleidungsgeschäft',
      'bicycle': 'Fahrradladen'
    };
    
    if (shopNames[properties.shop]) {
      return shopNames[properties.shop];
    }
    return properties.shop.charAt(0).toUpperCase() + properties.shop.slice(1).replace(/_/g, ' ');
  }

  if (properties.leisure) {
    const leisureNames: Record<string, string> = {
      'playground': 'Spielplatz',
      'swimming_pool': 'Schwimmbad',
      'sports_centre': 'Sportzentrum',
      'park': 'Park',
      'garden': 'Garten'
    };
    
    if (leisureNames[properties.leisure]) {
      return leisureNames[properties.leisure];
    }
    return properties.leisure.charAt(0).toUpperCase() + properties.leisure.slice(1).replace(/_/g, ' ');
  }

  if (properties.office) {
    return properties.office.charAt(0).toUpperCase() + properties.office.slice(1).replace(/_/g, ' ');
  }

  if (properties.craft) {
    return properties.craft.charAt(0).toUpperCase() + properties.craft.slice(1).replace(/_/g, ' ');
  }

  // Kein Name generierbar
  return null;
}

function isValidCoordinate(lat: number, lng: number): boolean {
  return !isNaN(lat) &&
         !isNaN(lng) &&
         Math.abs(lat) <= 90 &&
         Math.abs(lng) <= 180;
}

function getPoiCoordinates(geometry: GeoJSONFeature['geometry'], poiName: string = 'Unknown'): Coordinates | null {
  try {
    if (!geometry || !geometry.coordinates) {
      console.warn(`${poiName}: Geometry or coordinates missing`);
      return null;
    }

    if (geometry.type === 'Point') {
      const coords = geometry.coordinates as number[];
      if (!Array.isArray(coords) || coords.length < 2) {
        console.warn(`${poiName}: Invalid Point coordinates structure:`, coords);
        return null;
      }

      const lng = Number(coords[0]);
      const lat = Number(coords[1]);

      if (!isValidCoordinate(lat, lng)) {
        console.warn(`${poiName}: Invalid Point coordinate values: lat=${lat}, lng=${lng}`);
        return null;
      }

      return { lat, lng };
    } else if (geometry.type === 'Polygon') {
      try {
        const centroid = turf.centroid({ type: 'Feature', geometry: geometry as any, properties: {} });
        const [lng, lat] = centroid.geometry.coordinates;

        if (!isValidCoordinate(lat, lng)) {
          console.warn(`${poiName}: Invalid Polygon centroid values: lat=${lat}, lng=${lng}`);
          return null;
        }

        console.log(`✅ Polygon POI ${poiName}: Successfully converted to centroid [${lng.toFixed(6)}, ${lat.toFixed(6)}] using Turf.js`);
        return { lat, lng };
      } catch (turfError) {
        console.error(`${poiName}: Turf.js centroid calculation failed:`, (turfError as Error).message);
        return null;
      }
    } else if (geometry.type === 'LineString') {
      const coords = geometry.coordinates as number[][];
      if (!Array.isArray(coords) || coords.length === 0) {
        console.warn(`${poiName}: Invalid LineString coordinates structure`);
        return null;
      }

      const midIndex = Math.floor(coords.length / 2);
      const midPoint = coords[midIndex];

      if (!Array.isArray(midPoint) || midPoint.length < 2) {
        console.warn(`${poiName}: Invalid LineString midpoint`);
        return null;
      }

      const lng = Number(midPoint[0]);
      const lat = Number(midPoint[1]);

      if (!isValidCoordinate(lat, lng)) {
        console.warn(`${poiName}: Invalid LineString coordinate values: lat=${lat}, lng=${lng}`);
        return null;
      }

      return { lat, lng };
    }

    throw new Error(`Unsupported geometry type: ${geometry.type}`);
  } catch (error) {
    console.error(`${poiName}: Error extracting coordinates from geometry:`, (error as Error).message);
    return null;
  }
}

function extractAmenities(properties: GeoJSONFeature['properties']): string[] {
  const amenities: string[] = [];

  if (properties.sport) {
    amenities.push(`Sport: ${properties.sport.replace(/_/g, ' ')}`);
  }

  if (properties.phone || properties['contact:phone']) {
    const phone = properties.phone || properties['contact:phone'];
    amenities.push(`Telefon: ${phone}`);
  }

  if (properties.email || properties['contact:email']) {
    const email = properties.email || properties['contact:email'];
    amenities.push(`E-Mail: ${email}`);
  }

  if (properties.website || properties['contact:website'] || properties.url) {
    const website = properties.website || properties['contact:website'] || properties.url;
    amenities.push(`Website: ${website}`);
  }

  if (properties.cuisine) {
    amenities.push(`Küche: ${properties.cuisine}`);
  }

  if (properties.opening_hours || properties['opening_hours:restaurant']) {
    const hours = properties.opening_hours || properties['opening_hours:restaurant'];
    amenities.push(`Öffnungszeiten: ${hours}`);
  }

  // Adresse zusammensetzen
  const street = properties['addr:street'];
  const houseNumber = properties['addr:housenumber'];
  const city = properties['addr:city'];
  
  if (street && houseNumber) {
    const address = `${houseNumber} ${street}`;
    if (city) {
      amenities.push(`Adresse: ${address}, ${city}`);
    } else {
      amenities.push(`Adresse: ${address}`);
    }
  } else if (street) {
    amenities.push(`Straße: ${street}`);
  }

  return amenities;
}

function generateDescription(properties: GeoJSONFeature['properties']): string {
  const parts: string[] = [];

  if (properties.description && typeof properties.description === 'string') {
    return properties.description;
  }

  if (properties['description:de']) {
    return properties['description:de'];
  }

  // Generiere Beschreibung aus Properties
  if (properties.amenity) {
    parts.push(properties.amenity.replace(/_/g, ' '));
  } else if (properties.shop) {
    parts.push(`${properties.shop.replace(/_/g, ' ')} Geschäft`);
  } else if (properties.leisure) {
    parts.push(properties.leisure.replace(/_/g, ' '));
  } else if (properties.tourism) {
    parts.push(properties.tourism.replace(/_/g, ' '));
  }

  if (properties.sport) {
    const sports = properties.sport.split(';').map(s => s.trim().replace(/_/g, ' '));
    parts.push(`Sport: ${sports.join(', ')}`);
  }

  if (properties.cuisine) {
    parts.push(`Küche: ${properties.cuisine}`);
  }

  return parts.length > 0 ? parts.join(' - ') : '';
}

export function transformGeoJSONToPOIs(
  geoJsonData: GeoJSONCollection,
  site: string
): POI[] {
  console.log(`🔍 Optimized POI Transformer: Processing ${geoJsonData.features.length} raw features for site ${site}`);

  if (!geoJsonData?.features || !Array.isArray(geoJsonData.features)) {
    console.warn('No valid features array found in GeoJSON data');
    return [];
  }

  const pois: POI[] = [];
  let processedCount = 0;
  let validCount = 0;
  let invalidCoordinatesCount = 0;
  let skippedNoNameCount = 0;

  geoJsonData.features.forEach((feature, index) => {
    try {
      processedCount++;

      if (!feature || !feature.properties || !feature.geometry) {
        console.warn(`Feature ${index} missing required properties or geometry`);
        return;
      }

      const properties = feature.properties;
      
      // Optimierte Name-Generierung
      const name = generateOptimizedName(properties);
      
      if (!name || name.trim() === '') {
        skippedNoNameCount++;
        return;
      }

      const coordinates = getPoiCoordinates(feature.geometry, name);
      if (!coordinates) {
        invalidCoordinatesCount++;
        return;
      }

      const category = categorizeFeatureOptimized(properties);
      const amenities = extractAmenities(properties);
      const description = generateDescription(properties);

      const poi: POI = {
        id: properties['@id'] || feature.id?.toString() || `poi_${index + 1}`,
        name: name.trim(),
        category: category,
        coordinates: coordinates,
        description: description || undefined,
        amenities: amenities.length > 0 ? amenities : undefined,
        openingHours: properties.opening_hours || properties['opening_hours:restaurant'] || null,

        // Preserve original properties for enrichment
        roompot_category: properties.roompot_category,
        lodge_number: properties.lodge_number,
        building_type: properties.building_type,
        enrichment_key: properties.enrichment_key,

        // Include other original properties
        ...properties
      };

      pois.push(poi);
      validCount++;

    } catch (error) {
      console.error(`❌ Failed to transform POI at index ${index}:`, (error as Error).message);
    }
  });

  console.log(`✅ Optimized POI Processing Summary:`);
  console.log(`   - Processed: ${processedCount} features`);
  console.log(`   - Valid POIs: ${validCount}`);
  console.log(`   - Invalid coordinates: ${invalidCoordinatesCount}`);
  console.log(`   - Skipped (no name): ${skippedNoNameCount}`);
  console.log(`   - Coverage: ${((validCount/processedCount)*100).toFixed(1)}%`);

  return pois;
}

export function searchPOIs(pois: POI[], query: string): POI[] {
  const searchTerm = query.toLowerCase().trim();
  if (!searchTerm) return pois;

  return pois.filter(poi => {
    if (poi.name.toLowerCase().includes(searchTerm)) return true;
    if (poi.description?.toLowerCase().includes(searchTerm)) return true;
    if (poi.amenities?.some(amenity => amenity.toLowerCase().includes(searchTerm))) return true;
    if (poi.category.toLowerCase().includes(searchTerm)) return true;
    return false;
  });
}

export function filterPOIsByCategory(
  pois: POI[],
  categories: string[]
): POI[] {
  if (categories.length === 0) return pois;
  return pois.filter(poi => categories.includes(poi.category));
}

export class POITransformer {
  transformPOIs(features: GeoJSONFeature[]): POI[] {
    return transformGeoJSONToPOIs({ type: 'FeatureCollection', features }, 'kamperland');
  }
}