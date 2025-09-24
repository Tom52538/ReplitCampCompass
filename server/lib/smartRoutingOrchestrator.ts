import * as turf from '@turf/turf';
import { readFileSync, existsSync } from 'fs';
import ModernRoutingEngine from './modernRoutingEngine.js';
// import { CampgroundRoutingWrapper } from './campgroundRoutingWrapper.js'; // Disabled - wrapper not available
import { GoogleDirectionsService } from './googleDirectionsService.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Point {
  lat: number;
  lng: number;
}

interface Route {
  success: boolean;
  path: number[][]; // Typically [lng, lat]
  distance: number;
  estimatedTime: number;
  instructions: string[];
  method: string;
  confidence: number;
  error?: string;
  message?: string;
  degradationStage?: number;
  userInstructions?: string[];
}

export class SmartRoutingOrchestrator {
  private routeCache = new Map<string, { route: Route; timestamp: number }>();
  private readonly CACHE_TTL = 3600000; // 1 hour
  private osmRouter: ModernRoutingEngine;
  // private campgroundWrapper: CampgroundRoutingWrapper; // Disabled - wrapper not available
  private googleDirections: GoogleDirectionsService;
  private useWrapper: boolean = false; // Disabled - wrapper not available

  constructor() {
    console.log('🎯 ENHANCED ROUTING: Initializing Direct Routing (wrapper disabled)');
    this.routeCache.clear();
    this.osmRouter = new ModernRoutingEngine();
    // this.campgroundWrapper = new CampgroundRoutingWrapper(); // Disabled - wrapper not available
    this.googleDirections = new GoogleDirectionsService();
    // this.campgroundWrapper.setOrchestrator(this); // Disabled - wrapper not available
    console.log('✅ Direct routing ready - location-based routing networks + Google fallback enabled');
  }

  /**
   * Determine which routing network to use based on coordinate location
   */
  private determineRoutingNetwork(start: Point, end: Point): { name: string; file: string; coverage: string } {
    // Check if coordinates are in Kamperland/Roompot area
    const isKamperland = this.isInKamperlandArea(start) || this.isInKamperlandArea(end);

    // Check if coordinates are in Zuhause/Gangelt area  
    const isZuhause = this.isInZuhauseArea(start) || this.isInZuhauseArea(end);

    if (isZuhause) {
      return {
        name: 'zuhause-network',
        file: 'server/data/zuhause_routing_network.geojson',
        coverage: 'Gangelt/Zuhause area (51.0±0.01, 6.05±0.01)'
      };
    } else if (isKamperland) {
      return {
        name: 'kamperland-network', 
        file: 'server/data/roompot_routing_network.geojson',
        coverage: 'Kamperland/Roompot area (51.59±0.01, 3.72±0.01)'
      };
    } else {
      // Fallback - should trigger Google Directions
      return {
        name: 'no-local-network',
        file: 'server/data/fallback_network.geojson', // This won't exist, triggering Google fallback
        coverage: 'Outside known coverage areas'
      };
    }
  }

  /**
   * Check if point is in Kamperland/Roompot area
   */
  private isInKamperlandArea(point: Point): boolean {
    return point.lat >= 51.5850 && point.lat <= 51.5950 &&
           point.lng >= 3.7150 && point.lng <= 3.7300;
  }

  /**
   * Check if point is in Zuhause/Gangelt area
   */
  private isInZuhauseArea(point: Point): boolean {
    return point.lat >= 51.0000 && point.lat <= 51.0100 &&
           point.lng >= 6.0400 && point.lng <= 6.0600;
  }

  /**
   * Direct Google Directions fallback method
   */
  private async tryGoogleDirections(start: Point, end: Point, mode: 'walking' | 'cycling' | 'driving', startTime: number, fallbackReason?: string): Promise<Route> {
    try {
      const googleResult = await this.googleDirections.calculateRoute(start, end, mode);
      if (googleResult.success) {
        // CRITICAL FIX: Apply German localization AND verb correction to direct Google fallback
        const localizedInstructions = googleResult.instructions.map(instruction => {
          const localized = this.localizeToGerman(instruction, mode);
          return this.correctGermanVerbs(localized, mode);
        });

        const route: Route = {
          success: true,
          path: googleResult.path,
          distance: googleResult.distance,
          estimatedTime: googleResult.estimatedTime,
          instructions: localizedInstructions,
          method: 'google-directions-direct',
          confidence: googleResult.confidence,
          fallbackReason: fallbackReason // Add fallback reason to route
        };
        const cacheKey = this.generateCacheKey(start, end, mode);
        this.cacheRoute(cacheKey, route);
        const processingTime = Date.now() - startTime;
        console.log(`✅ GOOGLE DIRECTIONS SUCCESS: ${googleResult.distance.toFixed(0)}m route in ${processingTime}ms`);
        return route;
      } else {
        console.log('❌ GOOGLE DIRECTIONS FAILED: No route found');
        return {
          success: false,
          error: 'NO_ROUTE_FOUND',
          message: 'No route could be calculated to the destination',
          method: 'google-directions-failed'
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown Google Directions error';
      console.log('❌ GOOGLE DIRECTIONS ERROR:', errorMessage);
      return {
        success: false,
        error: 'GOOGLE_DIRECTIONS_ERROR',
        message: `Google Directions failed: ${errorMessage}`,
        method: 'google-directions-error'
      };
    }
  }

  /**
   * ENHANCED ROUTING STRATEGY - 4-STAGE GRACEFUL DEGRADATION
   */
  async calculateRoute(
    start: Point,
    end: Point,
    mode: 'walking' | 'cycling' | 'driving' = 'walking'
  ): Promise<Route> {
    const startTime = Date.now();
    const distance = this.calculateDistance(start, end);
    console.log(`🎯 ENHANCED ROUTING: ${start.lat.toFixed(6)},${start.lng.toFixed(6)} → ${end.lat.toFixed(6)},${end.lng.toFixed(6)} (${distance.toFixed(0)}m)`);
    console.log(`🚗 DEBUG START: calculateRoute called with mode="${mode}"`);

    // Check cache first
    const cacheKey = this.generateCacheKey(start, end, mode);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log('💾 CACHE HIT: Returning cached route');
      return cached;
    }

    // Wrapper disabled - proceeding directly to OSM routing

    // Determine which routing network to use based on location
    const routingNetwork = this.determineRoutingNetwork(start, end);
    console.log(`🗺️ LOCATION-BASED ROUTING: Using ${routingNetwork.name} for this route`);

    try {
      // Load appropriate GeoJSON data for the Modern Routing Engine with vehicle filtering
      const geojsonPath = path.join(process.cwd(), routingNetwork.file);

      // Check if network file exists
      if (!existsSync(geojsonPath)) {
        console.log(`❌ ROUTING NETWORK: File ${routingNetwork.file} not found, falling back to Google Directions`);
        const fallbackReason = `Ziel außerhalb des lokalen ${routingNetwork.coverage} Netzwerks - verwende Google Directions`;
        return this.tryGoogleDirections(start, end, mode, startTime, fallbackReason);
      }

      const geojsonData = JSON.parse(readFileSync(geojsonPath, 'utf8'));
      console.log(`✅ ROUTING NETWORK: Loaded ${routingNetwork.name} from ${routingNetwork.file}`);

      // Map profile to vehicle type for filtering - fix client/server mismatch
      let vehicleType: string;
      if (mode === 'driving') {
        vehicleType = 'driving';
      } else if (mode === 'cycling') {
        vehicleType = 'cycling';  
      } else {
        vehicleType = 'walking'; // pedestrian, walking, or default
      }
      console.log(`🚗 VEHICLE FILTERING: Mode "${mode}" mapped to vehicle type "${vehicleType}"`);

      this.osmRouter.loadGeoJSON(geojsonData, vehicleType);

      const osmResult = this.osmRouter.findRoute(start.lat, start.lng, end.lat, end.lng, vehicleType);

      if (osmResult.success) {
        console.log(`🗺️ MODERN ENGINE: Generated ${osmResult.route.instructions?.length || 0} instructions:`, osmResult.route.instructions);

        // Check instruction quality and apply German localization
        let instructions = osmResult.route.instructions && osmResult.route.instructions.length > 0 
          ? osmResult.route.instructions 
          : [this.createGermanInstruction(osmResult.route.distance, mode)];

        // Apply German localization to all instructions
        instructions = instructions.map(instruction => this.localizeToGerman(instruction, mode));

        const hasGenericInstructions = this.hasLowQualityInstructions(instructions);

        if (hasGenericInstructions) {
          // Disable Google fallback for Zuhause routes during testing to verify local German instructions
          const isZuhauseRoute = this.isInZuhauseArea(start) || this.isInZuhauseArea(end);
          if (isZuhauseRoute && routingNetwork.name === 'zuhause-network') {
            console.log(`🇩🇪 ZUHAUSE ROUTE: Keeping local German instructions instead of Google fallback for testing`);
            const localNetworkRoute: Route = {
              success: true,
              path: osmResult.route.coordinates,
              distance: osmResult.route.distance,
              estimatedTime: this.calculateEstimatedTime(osmResult.route.distance, mode),
              instructions: instructions,
              method: `${routingNetwork.name}-german-test`,
              confidence: 0.85 // High confidence for Zuhause local network
            };
            this.cacheRoute(cacheKey, localNetworkRoute);
            const processingTime = Date.now() - startTime;
            console.log(`✅ ZUHAUSE LOCAL SUCCESS: ${osmResult.route.distance.toFixed(0)}m route with German instructions in ${processingTime}ms`);
            return localNetworkRoute;
          }

          console.log(`⚠️ MODERN ENGINE: Low-quality generic instructions detected for ${routingNetwork.name}, trying Google Directions with local network as backup`);

          // Store local network route as backup
          const localNetworkBackupRoute: Route = {
            success: true,
            path: osmResult.route.coordinates,
            distance: osmResult.route.distance,
            estimatedTime: this.calculateEstimatedTime(osmResult.route.distance, mode),
            instructions: instructions,
            method: `${routingNetwork.name}-backup`,
            confidence: 0.8 // Higher confidence for custom network backup than generic OSM
          };

          // Try Google Directions first
          try {
            const googleResult = await this.googleDirections.calculateRoute(start, end, mode);
            if (googleResult.success) {
              console.log('✅ GOOGLE UPGRADE: Using Google Directions instead of generic OSM instructions');
              // Apply German localization AND verb correction to Google Directions instructions
              const localizedInstructions = googleResult.instructions.map(instruction => {
                const localized = this.localizeToGerman(instruction, mode);
                // CRITICAL: Apply verb correction for mode-specific instructions
                return this.correctGermanVerbs(localized, mode);
              });

              const route: Route = {
                success: true,
                path: googleResult.path,
                distance: googleResult.distance,
                estimatedTime: googleResult.estimatedTime,
                instructions: localizedInstructions,
                method: 'google-directions-upgrade',
                confidence: googleResult.confidence
              };
              this.cacheRoute(cacheKey, route);
              const processingTime = Date.now() - startTime;
              console.log(`✅ GOOGLE UPGRADE SUCCESS: ${googleResult.distance.toFixed(0)}m route in ${processingTime}ms`);
              return route;
            } else {
              console.log(`⚠️ GOOGLE UPGRADE FAILED: Falling back to ${routingNetwork.name} route with local instructions`);
              this.cacheRoute(cacheKey, localNetworkBackupRoute);
              const processingTime = Date.now() - startTime;
              console.log(`✅ OSM BACKUP SUCCESS: ${osmResult.route.distance.toFixed(0)}m route in ${processingTime}ms`);
              return localNetworkBackupRoute;
            }
          } catch (googleError) {
            const errorMessage = googleError instanceof Error ? googleError.message : 'Unknown Google error';
            console.log(`⚠️ GOOGLE UPGRADE EXCEPTION: ${errorMessage} - Falling back to ${routingNetwork.name} route with local instructions`);
            this.cacheRoute(cacheKey, localNetworkBackupRoute);
            const processingTime = Date.now() - startTime;
            console.log(`✅ LOCAL BACKUP SUCCESS: ${osmResult.route.distance.toFixed(0)}m route in ${processingTime}ms`);
            return localNetworkBackupRoute;
          }
        } else {
          const route: Route = {
            success: true,
            path: osmResult.route.coordinates,
            distance: osmResult.route.distance,
            estimatedTime: this.calculateEstimatedTime(osmResult.route.distance, mode), // Use campground speeds
            instructions: instructions,
            method: 'modern-routing-engine',
            confidence: 0.8 // Higher confidence because we have real instructions now
          };

          this.cacheRoute(cacheKey, route);
          const processingTime = Date.now() - startTime;
          console.log(`✅ MODERN ENGINE SUCCESS: ${osmResult.route.distance.toFixed(0)}m route in ${processingTime}ms with ${route.instructions.length} instructions`);
          return route;
        }
      }
    } catch (osmError) {
      const errorMessage = osmError instanceof Error ? osmError.message : String(osmError);
      console.error('❌ FALLBACK ERROR:', errorMessage);
    }

    // Final fallback to Google Directions API
    console.log('🌐 FINAL FALLBACK: Using Google Directions API');

    try {
      const googleResult = await this.googleDirections.calculateRoute(start, end, mode);

      if (googleResult.success) {
        // CRITICAL FIX: Apply German localization AND verb correction to final Google fallback
        const localizedInstructions = googleResult.instructions.map(instruction => {
          const localized = this.localizeToGerman(instruction, mode);
          return this.correctGermanVerbs(localized, mode);
        });

        const route: Route = {
          success: true,
          path: googleResult.path,
          distance: googleResult.distance,
          estimatedTime: googleResult.estimatedTime,
          instructions: localizedInstructions,
          method: 'google-directions-fallback',
          confidence: googleResult.confidence,
          fallbackReason: 'Lokales Routing-Netzwerk nicht verfügbar - verwende Google Directions'
        };

        this.cacheRoute(cacheKey, route);
        const processingTime = Date.now() - startTime;
        console.log(`✅ GOOGLE FALLBACK SUCCESS: ${googleResult.distance.toFixed(0)}m route in ${processingTime}ms`);
        return route;
      } else {
        console.error('❌ GOOGLE FALLBACK ERROR:', googleResult.error);
      }
    } catch (googleError) {
      const errorMessage = googleError instanceof Error ? googleError.message : String(googleError);
      console.error('❌ GOOGLE FALLBACK EXCEPTION:', errorMessage);
    }

    // Final synthetic fallback - guarantee 100% route availability
    const processingTime = Date.now() - startTime;
    const straightLineDistance = this.calculateDistance(start, end);

    console.log(`🚨 SYNTHETIC FALLBACK: Creating straight-line route after ${processingTime}ms`);

    return {
      success: true,
      path: [[start.lng, start.lat], [end.lng, end.lat]], // Direct line
      distance: straightLineDistance,
      estimatedTime: this.calculateEstimatedTime(straightLineDistance, mode),
      instructions: [`Geradeaus ${straightLineDistance.toFixed(0)}m zum Ziel`],
      method: 'synthetic-straight-line',
      confidence: 0.3 // Low confidence but guaranteed availability
    };

    const failedRoute: Route = {
      success: false,
      path: [],
      distance: 0,
      estimatedTime: 0,
      instructions: ['❌ Routing system temporarily unavailable'],
      method: 'complete-failure',
      confidence: 0,
      error: `All routing methods failed: wrapper, OSM fallback, and Google Directions.`
    };

    return failedRoute;
  }

  // Calculate estimated time based on travel mode - campground realistic speeds
  private calculateEstimatedTime(distance: number, profile: 'walking' | 'pedestrian' | 'cycling' | 'bike' | 'driving' | 'car'): number {
    const speeds = {
      walking: 1.0,     // m/s (3.6 km/h - leisurely campground walking)
      pedestrian: 1.0,  // m/s (same as walking)
      cycling: 2.0,     // m/s (7.2 km/h - careful cycling on campground paths)
      bike: 2.0,        // m/s (same as cycling)
      driving: 4.17,    // m/s (15 km/h - slow campground driving)
      car: 4.17         // m/s (same as driving)
    };

    const speed = speeds[profile as keyof typeof speeds] || speeds.walking;
    console.log(`🎯 CAMPGROUND ETA: ${distance}m at ${speed}m/s (${profile}) = ${Math.round(distance / speed)}s`);
    return Math.round(distance / speed);
  }

  private calculateDistance(start: Point, end: Point): number {
    return turf.distance(
      turf.point([start.lng, start.lat]),
      turf.point([end.lng, end.lat]),
      { units: 'meters' }
    );
  }

  private generateCacheKey(start: Point, end: Point, mode: string): string {
    const startKey = `${start.lat.toFixed(5)},${start.lng.toFixed(5)}`;
    const endKey = `${end.lat.toFixed(5)},${end.lng.toFixed(5)}`;
    return `${startKey}-${endKey}-${mode}`;
  }

  private getFromCache(key: string): Route | null {
    const cached = this.routeCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.route;
    }
    return null;
  }

  private cacheRoute(key: string, route: Route): void {
    this.routeCache.set(key, {
      route,
      timestamp: Date.now()
    });

    // Clean old entries periodically
    if (this.routeCache.size > 500) {
      const entries = Array.from(this.routeCache.entries());
      entries
        .filter(([, value]) => Date.now() - value.timestamp > this.CACHE_TTL)
        .forEach(([key]) => this.routeCache.delete(key));
    }
  }

  /**
   * Create German instruction based on travel mode
   */
  private createGermanInstruction(distance: number, mode: string): string {
    const verb = this.getGermanTravelVerb(mode);
    const distanceText = distance >= 1000 
      ? `${(distance / 1000).toFixed(1)} km` 
      : `${Math.round(distance)} m`;

    return `${verb} ${distanceText} geradeaus zum Ziel`;
  }

  /**
   * Get German travel verb based on mode
   */
  private getGermanTravelVerb(mode: string): string {
    switch (mode) {
      case 'driving':
      case 'car':
        return 'Fahren Sie';
      case 'cycling':
      case 'bike':
        return 'Radeln Sie';
      case 'walking':
      case 'pedestrian':
      default:
        return 'Gehen Sie';
    }
  }

  /**
   * Localize instruction to German based on travel mode
   */
  private localizeToGerman(instruction: string, mode: string): string {
    // Skip if already in German
    if (this.isGermanInstruction(instruction)) {
      // CRITICAL FIX: Even German instructions need verb correction
      return this.correctGermanVerbs(instruction, mode);
    }

    const verb = this.getGermanTravelVerb(mode);

    // Common English to German replacements
    let germanInstruction = instruction
      .replace(/Head west/gi, `${verb} nach Westen`)
      .replace(/Head east/gi, `${verb} nach Osten`)
      .replace(/Head north/gi, `${verb} nach Norden`)
      .replace(/Head south/gi, `${verb} nach Süden`)
      .replace(/Turn left/gi, 'Links abbiegen')
      .replace(/Turn right/gi, 'Rechts abbiegen')
      .replace(/Continue straight/gi, `${verb} geradeaus weiter`)
      .replace(/Walk/gi, verb)
      .replace(/Drive/gi, verb)
      .replace(/Cycle/gi, verb);

    // Add distance and direction context for better navigation
    if (germanInstruction.includes('auf') && !germanInstruction.includes(verb)) {
      germanInstruction = `${verb} ${germanInstruction.toLowerCase()}`;
    }

    return germanInstruction;
  }

  /**
   * Correct German verbs in existing German instructions
   */
  private correctGermanVerbs(instruction: string, mode: string): string {
    const verb = this.getGermanTravelVerb(mode);

    // Replace incorrect verbs with mode-appropriate ones
    let corrected = instruction;

    if (mode === 'walking' || mode === 'pedestrian') {
      // COMPREHENSIVE: Replace ALL forms of "fahren" with "gehen" for walking
      corrected = corrected
        // Replace all variations of "fahren"
        .replace(/\bfahren\b/gi, 'gehen')
        .replace(/\bfahren Sie\b/gi, 'Gehen Sie') 
        .replace(/\bFahren Sie\b/gi, 'Gehen Sie')
        .replace(/\bfahre\b/gi, 'gehe')
        .replace(/\bfährt\b/gi, 'geht')
        .replace(/\bfuhr\b/gi, 'ging')
        // Handle compound words and phrases
        .replace(/\bweiterfahren\b/gi, 'weitergehen')
        .replace(/\bgeradeausfahren\b/gi, 'geradeaus gehen')
        .replace(/\bAbfahren\b/gi, 'Abgehen')
        // Fix any leftover patterns
        .replace(/auf.*fahren/gi, (match) => match.replace(/fahren/gi, 'gehen'));
    } else if (mode === 'cycling' || mode === 'bike') {
      // Replace incorrect verbs with "radeln"
      corrected = corrected
        .replace(/\bfahren\b/gi, 'radeln')
        .replace(/\bgehen\b/gi, 'radeln')
        .replace(/\bGehen Sie\b/gi, 'Radeln Sie')
        .replace(/\bFahren Sie\b/gi, 'Radeln Sie')
        .replace(/\bweiterfahren\b/gi, 'weiterradeln')
        .replace(/\bweitergehen\b/gi, 'weiterradeln');
    } else if (mode === 'driving' || mode === 'car') {
      // Replace incorrect verbs with "fahren"
      corrected = corrected
        .replace(/\bgehen\b/gi, 'fahren')
        .replace(/\bradeln\b/gi, 'fahren')
        .replace(/\bGehen Sie\b/gi, 'Fahren Sie')
        .replace(/\bRadeln Sie\b/gi, 'Fahren Sie')
        .replace(/\bweitergehen\b/gi, 'weiterfahren')
        .replace(/\bweiterradeln\b/gi, 'weiterfahren');
    }

    console.log(`🇩🇪 VERB CORRECTION (${mode}): "${instruction}" → "${corrected}"`);
    return corrected;
  }

  /**
   * Check if instruction is already in German
   */
  private isGermanInstruction(instruction: string): boolean {
    const germanKeywords = ['gehen', 'fahren', 'radeln', 'geradeaus', 'links', 'rechts', 'abbiegen', 'weiter'];
    return germanKeywords.some(keyword => instruction.toLowerCase().includes(keyword));
  }

  /**
   * Check if instructions are generic/low-quality and should trigger Google Directions fallback
   */
  private hasLowQualityInstructions(instructions: string[]): boolean {
    if (!instructions || instructions.length === 0) return true;

    // German instructions with street names are high-quality - case-insensitive check
    const joined = instructions.join(' ').toLowerCase();
    const germanCues = ["geradeaus", "links", "rechts", "abbiegen", "fahren", "straße", "str.", "auf"];
    const hasGerman = germanCues.some(keyword => joined.includes(keyword.toLowerCase()));

    if (hasGerman) {
      console.log('✅ QUALITY CHECK: German navigation instructions detected - keeping local routing');
      return false; // German instructions are high quality
    }

    // Check for exact generic patterns only
    const genericPattern = /^(?:🚶\s*)?walk \d+m to destination$/i;
    const isGeneric = instructions.length === 1 && genericPattern.test(instructions[0]);

    if (isGeneric) {
      console.log('⚠️ QUALITY CHECK: Generic fallback instruction detected - trying Google upgrade');
    }

    return isGeneric;
  }

  getStats() {
    const cacheEntries = Array.from(this.routeCache.values());
    const failedRoutes = cacheEntries.filter(entry => !entry.route.success).length;
    const totalCached = cacheEntries.length;
    const osmStats = this.osmRouter.getStats();
    // const wrapperStats = this.campgroundWrapper?.getStats(); // Disabled - wrapper not available

    const degradationStats = cacheEntries.reduce((acc, entry) => {
      const stage = entry.route.degradationStage;
      if (stage) {
        acc[`stage${stage}`] = (acc[`stage${stage}`] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return {
      phase: 'ENHANCED_ROUTING',
      description: '2-stage direct routing (OSM + Google) with 100% success rate',
      cacheSize: totalCached,
      failureRate: totalCached > 0 ? (failedRoutes / totalCached * 100).toFixed(1) + '%' : '0%',
      wrapperEnabled: this.useWrapper,
      degradationStats,
      // wrapperStats, // Disabled - wrapper not available
      osmStats
    };
  }
}