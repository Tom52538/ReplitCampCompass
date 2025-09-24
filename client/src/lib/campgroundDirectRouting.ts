import { haversineDistance } from './utils';
import { calculateDistance } from '../../../shared/utils';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface DirectRoute {
  totalDistance: string;
  estimatedTime: string;
  durationSeconds: number;
  instructions: Array<{
    instruction: string;
    distance: string;
    duration: string;
    maneuverType: string;
    stepIndex: number;
  }>;
  geometry: Array<[number, number]>; // [lng, lat] format
  nextInstruction: any;
  arrivalTime: string;
  routingService: string;
}

// Define campground boundaries for Roompot Kamperland
export const ROOMPOT_CAMPGROUND_BOUNDS = {
  north: 51.5950,
  south: 51.5850,
  east: 3.7300,
  west: 3.7150
};

// Campground Direct Router class
export class CampgroundDirectRouter {
  private bounds: typeof ROOMPOT_CAMPGROUND_BOUNDS;

  constructor(bounds: typeof ROOMPOT_CAMPGROUND_BOUNDS) {
    this.bounds = bounds;
  }

  async getOptimalRoute(start: [number, number], end: [number, number]) {
    const distance = this.calculateDistance(start, end);

    // Campingplatz-spezifische Routing-Logik für dichte Bebauung
    let duration = distance * 1.8; // Langsamere Geschwindigkeit wegen Hindernissen
    let routeType = 'campground_direct';

    // Spezielle Behandlung für sehr kurze Distanzen zwischen Objekten
    if (distance < 100) {
      // Bei sehr kurzen Strecken: Direkte Linie, langsame Geschwindigkeit
      duration = Math.max(30, distance * 2.5); // Mindestens 30 Sekunden für Orientierung
      routeType = 'campground_close_proximity';
      
      console.log(`🏕️ Sehr kurze Campingplatz-Route: ${distance.toFixed(0)}m zwischen Objekten`);
      
      return {
        coordinates: [start, end],
        distance: distance,
        duration: duration,
        routeType: routeType,
        campgroundOptimized: true
      };
    }

    // Für mittlere Distanzen: Versuche intelligentes Routing mit Fallback
    if (distance < 800) { // Erhöht von 500m auf 800m für Campingplätze
      try {
        const response = await fetch('/api/route/directions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: { lat: start[0], lng: start[1] },
            to: { lat: end[0], lng: end[1] },
            profile: 'walking',
            campground_mode: true // Signalisiert Campingplatz-Modus
          }),
        });

        if (response.ok) {
          const astarResult = await response.json();
          if (astarResult.success) {
            console.log('🎯 Campingplatz-optimiertes Routing via A* erfolgreich');
            
            // Erhöhe Zeitschätzung für Campingplatz-Hindernisse
            const adjustedDuration = astarResult.durationSeconds * 1.4;
            
            return {
              coordinates: astarResult.geometry || [start, end],
              distance: parseFloat(astarResult.totalDistance) || distance,
              duration: adjustedDuration,
              pathTypes: astarResult.pathTypes || [],
              routeType: 'campground_enhanced',
              campgroundOptimized: true
            };
          }
        }
      } catch (error) {
        console.warn('🏕️ Campingplatz-Enhancement fehlgeschlagen, nutze Direkt-Route:', error.message);
      }
    }

    // Fallback to direct routing with campground-specific adjustments
    if (distance < 100) {
      duration = distance * 1.0; // Faster for very short walks
      routeType = 'direct_short';
    } else if (distance > 1000) {
      duration = distance * 1.4; // Slower for longer campground walks (obstacles, winding paths)
      routeType = 'direct_long';
    }

    console.log(`🏕️ Direct campground route: ${distance.toFixed(0)}m, ${(duration/60).toFixed(1)}min (${routeType})`);

    return {
      coordinates: [start, end],
      distance: distance,
      duration: duration,
      routeType: routeType
    };
  }

  private calculateDistance(coord1: [number, number], coord2: [number, number]): number {
    // Note: coord format is [lng, lat], need to swap for utility function
    return calculateDistance(coord1[1], coord1[0], coord2[1], coord2[0]);
  }
}

// Enhanced Roompot Beach Resort Kamperland bounds based on actual POI distribution
const CAMPGROUND_BOUNDS = {
  // Main campground area - expanded to cover all POI locations
  north: 51.598,   // Covers northern facilities
  south: 51.582,   // Covers southern beach areas
  east: 3.750,     // Covers eastern parking and facilities
  west: 3.710      // Covers western accommodation areas
};

// Known internal paths and obstacles for better routing
const INTERNAL_AREAS = {
  // Main accommodation zones
  beachHouseZone: {
    north: 51.592, south: 51.584, east: 3.735, west: 3.720
  },
  chaletZone: {
    north: 51.596, south: 51.588, east: 3.745, west: 3.730
  },
  centralFacilities: {
    north: 51.594, south: 51.587, east: 3.725, west: 3.715
  }
};

export function isWithinCampground(coords: Coordinates): boolean {
  const inBounds = coords.lat >= CAMPGROUND_BOUNDS.south &&
                   coords.lat <= CAMPGROUND_BOUNDS.north &&
                   coords.lng >= CAMPGROUND_BOUNDS.west &&
                   coords.lng <= CAMPGROUND_BOUNDS.east;

  console.log('🏕️ BOUNDS CHECK:', {
    coords: { lat: coords.lat.toFixed(6), lng: coords.lng.toFixed(6) },
    bounds: CAMPGROUND_BOUNDS,
    inBounds
  });

  return inBounds;
}

export function shouldUseDirectRouting(from: Coordinates, to: Coordinates, maxDistance = 500): boolean {
  const distance = haversineDistance(from, to);
  const fromInCampground = isWithinCampground(from);
  const toInCampground = isWithinCampground(to);
  const bothInCampground = fromInCampground && toInCampground;

  // Use direct routing only for very short distances now that we have enhanced routing
  const shouldUseDirect = distance <= 100; // Reduced threshold - use enhanced routing for longer paths

  console.log('🏕️ ROUTING DECISION:', {
    distance: Math.round(distance) + 'm',
    maxDistance: maxDistance + 'm',
    fromInCampground,
    toInCampground,
    bothInCampground,
    shouldUseDirect,
    reason: shouldUseDirect ?
      'Very short distance - direct routing' :
      bothInCampground ? 'Campground route - use enhanced routing' : 'External route - use enhanced routing'
  });

  return shouldUseDirect;
}

export async function getEnhancedRoute(from: Coordinates, to: Coordinates, mode = 'walking'): Promise<DirectRoute | null> {
  try {
    console.log('🗺️ ENHANCED ROUTING REQUEST:', { from, to, mode });

    const response = await fetch('/api/route/enhanced', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: { lat: from.lat, lng: from.lng },
        to: { lat: to.lat, lng: to.lng },
        profile: mode
      }),
    });

    if (!response.ok) {
      console.warn('⚠️ Enhanced routing failed, response not ok');
      return null;
    }

    const data = await response.json();

    if (!data.success) {
      console.warn('⚠️ Enhanced routing failed:', data.error);
      return null;
    }

    console.log('✅ ENHANCED ROUTING SUCCESS:', {
      method: data.method,
      distance: data.totalDistance,
      time: data.estimatedTime,
      confidence: data.confidence
    });

    return {
      totalDistance: data.totalDistance,
      estimatedTime: data.estimatedTime,
      durationSeconds: data.durationSeconds,
      instructions: data.instructions,
      geometry: data.geometry,
      nextInstruction: data.instructions[0],
      arrivalTime: new Date(Date.now() + data.durationSeconds * 1000).toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      routingService: data.routingService
    };

  } catch (error) {
    console.error('💥 Enhanced routing error:', error);
    return null;
  }
}

export function createDirectRoute(from: Coordinates, to: Coordinates, travelMode = 'walking'): DirectRoute {
  const distance = haversineDistance(from, to);

  console.log('🗺️ CREATING DIRECT ROUTE:', {
    from: { lat: from.lat.toFixed(6), lng: from.lng.toFixed(6) },
    to: { lat: to.lat.toFixed(6), lng: to.lng.toFixed(6) },
    distance: Math.round(distance) + 'm',
    mode: travelMode
  });

  // Calculate travel time based on mode with campground-appropriate speeds
  let speedKmh = 4; // realistic walking speed in campground
  let modeDescription = 'zu Fuß';
  let emoji = '🚶';

  if (travelMode === 'driving' || travelMode === 'car') {
    speedKmh = 10; // very slow for campground roads
    modeDescription = 'mit dem Auto';
    emoji = '🚗';
  } else if (travelMode === 'cycling' || travelMode === 'bike') {
    speedKmh = 8; // slow cycling in campground
    modeDescription = 'mit dem Fahrrad';
    emoji = '🚴';
  }

  const durationSeconds = Math.max(60, Math.ceil((distance / 1000) / speedKmh * 3600));
  const durationMinutes = Math.ceil(durationSeconds / 60);

  // Create optimized geometry - add waypoint for better path visualization
  const geometry: Array<[number, number]> = [
    [from.lng, from.lat],
    // Add a midpoint for better route visualization
    [(from.lng + to.lng) / 2, (from.lat + to.lat) / 2],
    [to.lng, to.lat]
  ];

  // Calculate bearing and create detailed instruction
  const bearing = calculateBearing(from, to);
  const direction = getDetailedDirection(bearing);

  const mainInstruction = {
    instruction: `${emoji} ${direction} zu Ihrem Ziel (${modeDescription})`,
    distance: distance >= 1000 ? `${(distance/1000).toFixed(1)}km` : `${Math.round(distance)}m`,
    duration: durationMinutes >= 60 ? `${Math.floor(durationMinutes/60)}h ${durationMinutes%60}min` : `${durationMinutes}min`,
    maneuverType: 'straight' as const,
    stepIndex: 0
  };

  // Add arrival instruction
  const arrivalInstruction = {
    instruction: `🎯 Sie haben Ihr Ziel erreicht`,
    distance: '0m',
    duration: '0min',
    maneuverType: 'arrive' as const,
    stepIndex: 1
  };

  const arrivalTime = new Date(Date.now() + durationSeconds * 1000).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const route = {
    totalDistance: distance >= 1000 ? `${(distance/1000).toFixed(1)}km` : `${Math.round(distance)}m`,
    estimatedTime: durationMinutes >= 60 ? `${Math.floor(durationMinutes/60)}h ${durationMinutes%60}min` : `${durationMinutes}min`,
    durationSeconds,
    instructions: [mainInstruction, arrivalInstruction],
    geometry,
    nextInstruction: mainInstruction,
    arrivalTime,
    routingService: 'Campground Direct ⛺'
  };

  console.log('✅ DIRECT ROUTE CREATED:', {
    service: 'Campground Direct',
    distance: route.totalDistance,
    duration: route.estimatedTime,
    instructions: route.instructions.length,
    arrivalTime: route.arrivalTime
  });

  return route;
}

function calculateBearing(from: Coordinates, to: Coordinates): number {
  const dLng = (to.lng - from.lng) * Math.PI / 180;
  const lat1 = from.lat * Math.PI / 180;
  const lat2 = to.lat * Math.PI / 180;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  let bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360;
}

function getDetailedDirection(bearing: number): string {
  if (bearing >= 337.5 || bearing < 22.5) return 'Gehen Sie geradeaus nach Norden';
  if (bearing >= 22.5 && bearing < 67.5) return 'Gehen Sie schräg nach Nordosten';
  if (bearing >= 67.5 && bearing < 112.5) return 'Gehen Sie nach rechts (Osten)';
  if (bearing >= 112.5 && bearing < 157.5) return 'Gehen Sie schräg nach Südosten';
  if (bearing >= 157.5 && bearing < 202.5) return 'Gehen Sie geradeaus nach Süden';
  if (bearing >= 202.5 && bearing < 247.5) return 'Gehen Sie schräg nach Südwesten';
  if (bearing >= 247.5 && bearing < 292.5) return 'Gehen Sie nach links (Westen)';
  return 'Gehen Sie schräg nach Nordwesten';
}