
/**
 * Campingplatz-spezifische Optimierungen für dichte Bebauung
 * Roompot Beach Resort Kamperland - Spezialanpassungen
 */

export interface CampgroundEnvironment {
  density: 'very_high' | 'high' | 'medium' | 'low';
  objectTypes: string[];
  averageSpacing: number; // Meter zwischen Objekten
  mainPathWidth: number; // Breite der Hauptwege
  obstacleTypes: string[];
}

export const ROOMPOT_KAMPERLAND_ENV: CampgroundEnvironment = {
  density: 'very_high',
  objectTypes: [
    'beach_house', 'chalet', 'lodge', 'static_caravan', 'bungalow',
    'toilets', 'parking', 'playground', 'restaurant', 'shop'
  ],
  averageSpacing: 8, // 8 Meter durchschnittlich zwischen Unterkünften
  mainPathWidth: 4, // 4 Meter breite Hauptwege
  obstacleTypes: ['buildings', 'parked_cars', 'landscaping', 'playground_equipment']
};

/**
 * Passt Routing-Parameter basierend auf Campingplatz-Umgebung an
 */
export function adjustForCampgroundDensity(
  distance: number,
  startType?: string,
  endType?: string
): {
  speedMultiplier: number;
  detourProbability: number;
  minimumTime: number;
} {
  const env = ROOMPOT_KAMPERLAND_ENV;
  
  // Bei sehr dichter Bebauung
  if (env.density === 'very_high') {
    // Sehr kurze Strecken zwischen Unterkünften
    if (distance < env.averageSpacing * 2) {
      return {
        speedMultiplier: 0.4, // 40% der normalen Geschwindigkeit
        detourProbability: 0.8, // 80% Chance auf Umweg wegen Hindernissen
        minimumTime: 45 // Mindestens 45 Sekunden für Orientierung
      };
    }
    
    // Kurze Strecken innerhalb einer Zone
    if (distance < 100) {
      return {
        speedMultiplier: 0.6, // 60% der normalen Geschwindigkeit
        detourProbability: 0.6, // 60% Chance auf kleine Umwege
        minimumTime: 30
      };
    }
    
    // Mittlere Strecken zwischen Zonen
    if (distance < 300) {
      return {
        speedMultiplier: 0.8, // 80% der normalen Geschwindigkeit
        detourProbability: 0.3, // 30% Chance auf Umwege
        minimumTime: 20
      };
    }
  }
  
  // Standard für längere Strecken
  return {
    speedMultiplier: 1.0,
    detourProbability: 0.1,
    minimumTime: 15
  };
}

/**
 * Erkennt kritische Campingplatz-Situationen für Routing
 */
export function analyzeCampgroundRoute(
  start: [number, number],
  end: [number, number],
  nearbyPOIs: any[] = []
): {
  complexity: 'simple' | 'moderate' | 'complex' | 'very_complex';
  recommendations: string[];
  specialInstructions: string[];
} {
  const distance = calculateHaversineDistance(start, end);
  const poiDensity = nearbyPOIs.length / Math.max(distance / 100, 1); // POIs per 100m
  
  // Sehr komplexe Situation: Viele Objekte auf kurzer Strecke
  if (distance < 100 && poiDensity > 10) {
    return {
      complexity: 'very_complex',
      recommendations: [
        'Sehr langsam gehen und sorgfältig orientieren',
        'Hausnummern und Schilder beachten',
        'Bei Verwirrung: zum nächsten Hauptweg gehen'
      ],
      specialInstructions: [
        'Achtung: Sehr dichte Bebauung',
        'Orientierung an Hausnummern empfohlen',
        'Kleine Umwege normal und erwartet'
      ]
    };
  }
  
  // Komplexe Situation: Mittlere Distanz mit vielen Objekten
  if (distance < 300 && poiDensity > 5) {
    return {
      complexity: 'complex',
      recommendations: [
        'Hauptwege bevorzugen wenn möglich',
        'Auf Wegmarkierungen achten'
      ],
      specialInstructions: [
        'Route führt durch dicht bebautes Gebiet',
        'Kleine Abweichungen von der Route normal'
      ]
    };
  }
  
  // Moderate Komplexität
  if (distance < 500) {
    return {
      complexity: 'moderate',
      recommendations: ['Normale Campingplatz-Navigation'],
      specialInstructions: ['Standard Campingplatz-Route']
    };
  }
  
  // Einfache Route
  return {
    complexity: 'simple',
    recommendations: ['Normale Navigation'],
    specialInstructions: []
  };
}

function calculateHaversineDistance(start: [number, number], end: [number, number]): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (end[1] - start[1]) * Math.PI / 180;
  const dLng = (end[0] - start[0]) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(start[1] * Math.PI / 180) * Math.cos(end[1] * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Generiert campingplatz-spezifische Navigationshilfen
 */
export function generateCampgroundGuidance(
  currentStep: any,
  route: any,
  nearbyPOIs: any[]
): {
  primaryInstruction: string;
  landmarks: string[];
  warnings: string[];
} {
  const landmarks = nearbyPOIs
    .filter(poi => poi.name && (poi.building_type === 'toilets' || poi.roompot_category === 'Necessities'))
    .slice(0, 2)
    .map(poi => poi.name);
    
  const warnings = [];
  
  // Warnung bei sehr dichter Bebauung
  if (nearbyPOIs.length > 15) {
    warnings.push('Achtung: Sehr dichte Bebauung - langsam gehen und orientieren');
  }
  
  // Warnung bei vielen Unterkünften gleichen Typs
  const accommodationTypes = nearbyPOIs
    .filter(poi => ['beach_house', 'chalet', 'lodge', 'bungalow'].includes(poi.building_type))
    .map(poi => poi.building_type);
    
  if (accommodationTypes.length > 8) {
    warnings.push('Viele ähnliche Unterkünfte - auf Hausnummern achten');
  }
  
  return {
    primaryInstruction: currentStep?.instruction || 'Folgen Sie der Route',
    landmarks: landmarks.length > 0 ? landmarks : ['Hauptweg folgen'],
    warnings
  };
}
