import { Coordinates, RouteResponse } from '@/types/navigation';

export interface CampgroundReroutingConfig {
  // Distance threshold for considering "off-route" in campgrounds (much smaller than city)
  offRouteThreshold: number; // meters - default 8m for campgrounds vs 50m for cities

  // Minimum distance moved before checking for rerouting
  minimumMovementThreshold: number; // meters - default 3m for walking in campgrounds

  // Time threshold before considering rerouting
  rerouteConsiderationTime: number; // milliseconds - default 5 seconds

  // Distance threshold for automatic rerouting
  autoRerouteThreshold: number; // meters - default 15m off-route in campground

  // Maximum reroute attempts to prevent loops
  maxRerouteAttempts: number; // default 3
}

export const CAMPGROUND_REROUTING_CONFIG: CampgroundReroutingConfig = {
  offRouteThreshold: 35, // Erhöht für dichte Campingplatz-Bebauung
  minimumMovementThreshold: 12, // Mehr Toleranz zwischen Mobilheimen/Chalets
  rerouteConsiderationTime: 20000, // 20s - Zeit zum manuellen Navigieren um Hindernisse
  autoRerouteThreshold: 60, // Nur bei wirklich großer Abweichung neu routen
  maxRerouteAttempts: 2 // Verhindert Ping-Pong zwischen dicht stehenden Objekten
};

export class CampgroundRerouteDetector {
  private config: CampgroundReroutingConfig;
  private lastPosition: Coordinates | null = null;
  private offRouteStartTime: number | null = null;
  private rerouteAttempts: number = 0;
  private lastRerouteTime: number = 0;

  // These constants are from the changes snippet and are assumed to be part of the RerouteDecision interface
  // and used within the shouldReroute method as per the provided snippet.
  private readonly OFF_ROUTE_THRESHOLD = 0.015; // Corresponds to 15m, using the original autoRerouteThreshold as a baseline for "off-route"
  private readonly IMMEDIATE_REROUTE_DISTANCE = 0.050; // Corresponds to 50m, a more significant deviation
  private offRouteCount: number = 0; // Counter for consecutive off-route detections

  constructor(config: CampgroundReroutingConfig = CAMPGROUND_REROUTING_CONFIG) {
    this.config = config;
  }

  /**
   * Calculate distance from current position to nearest point on route
   */
  private distanceToRoute(position: Coordinates, route: RouteResponse): number {
    if (!route.geometry || route.geometry.length === 0) return 0;

    let minDistance = Infinity;

    for (const point of route.geometry) {
      if (Array.isArray(point) && point.length >= 2) {
        const routePoint = { lat: point[1], lng: point[0] };
        const distance = this.calculateDistance(position, routePoint);
        minDistance = Math.min(minDistance, distance);
      }
    }

    return minDistance;
  }

  /**
   * Haversine distance calculation optimized for short campground distances
   */
  private calculateDistance(pos1: Coordinates, pos2: Coordinates): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (pos2.lat - pos1.lat) * Math.PI / 180;
    const dLng = (pos2.lng - pos1.lng) * Math.PI / 180;

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(pos1.lat * Math.PI / 180) * Math.cos(pos2.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // This is a placeholder for the calculateDistanceFromRoute method that is called in the changes snippet.
  // Based on the original code's distanceToRoute, it's highly probable that calculateDistanceFromRoute
  // is a direct call to distanceToRoute.
  private calculateDistanceFromRoute(currentPosition: Coordinates, route: RouteResponse): number {
      return this.distanceToRoute(currentPosition, route);
  }

  /**
   * Check if rerouting is needed based on campground-specific criteria
   */
  shouldReroute(
    currentPosition: Coordinates,
    route: RouteResponse,
    isNavigating: boolean
  ): { shouldReroute: boolean; reason?: string; distance?: number } {
    const now = Date.now();

    // REDUCED minimum reroute interval to be more responsive
    const MIN_RESPONSIVE_INTERVAL = 5000; // 5 seconds instead of 15

    // Don't reroute too frequently, but be more responsive
    if (now - this.lastRerouteTime < MIN_RESPONSIVE_INTERVAL) {
      return {
        shouldReroute: false,
        reason: `Too soon since last reroute (${Math.round((now - this.lastRerouteTime) / 1000)}s ago)`,
        distance: 0
      };
    }

    // Calculate distance from route
    const distanceFromRoute = this.calculateDistanceFromRoute(currentPosition, route);

    // Count consecutive off-route detections
    if (distanceFromRoute > this.OFF_ROUTE_THRESHOLD) {
      this.offRouteCount++;
    } else {
      this.offRouteCount = 0;
      return {
        shouldReroute: false,
        reason: 'On route',
        distance: distanceFromRoute
      };
    }

    // ENHANCED: More aggressive rerouting conditions for campground navigation
    const shouldReroute = 
      distanceFromRoute > this.IMMEDIATE_REROUTE_DISTANCE || // Very far off route (50m)
      (distanceFromRoute > this.OFF_ROUTE_THRESHOLD && this.offRouteCount >= 2) || // 2 consecutive detections instead of 3
      (distanceFromRoute > 0.025 && this.offRouteCount >= 3); // Even 25m if consistently detected

    if (shouldReroute) {
      this.lastRerouteTime = now;
      console.log('🏕️ CAMPGROUND REROUTING TRIGGERED:', {
        distance: Math.round(distanceFromRoute * 1000) + 'm',
        offRouteCount: this.offRouteCount,
        thresholds: {
          immediate: Math.round(this.IMMEDIATE_REROUTE_DISTANCE * 1000) + 'm',
          normal: Math.round(this.OFF_ROUTE_THRESHOLD * 1000) + 'm'
        }
      });

      return {
        shouldReroute: true,
        reason: distanceFromRoute > this.IMMEDIATE_REROUTE_DISTANCE 
          ? `Far off route (${Math.round(distanceFromRoute * 1000)}m)`
          : `Consistently off route (${this.offRouteCount} times, ${Math.round(distanceFromRoute * 1000)}m)`,
        distance: distanceFromRoute
      };
    }

    return {
      shouldReroute: false,
      reason: `Off route but within tolerance (${Math.round(distanceFromRoute * 1000)}m, count: ${this.offRouteCount})`,
      distance: distanceFromRoute
    };
  }

  /**
   * Reset reroute state (call when starting new navigation)
   */
  reset(): void {
    this.lastPosition = null;
    this.offRouteStartTime = null;
    this.rerouteAttempts = 0;
    this.lastRerouteTime = 0;
    this.offRouteCount = 0; // Resetting the new counter
    console.log('🏕️ Campground reroute detector reset');
  }

  /**
   * Get current reroute statistics
   */
  getStats(): {
    rerouteAttempts: number;
    maxAttempts: number;
    isOffRoute: boolean;
    offRouteDuration?: number;
  } {
    return {
      rerouteAttempts: this.rerouteAttempts,
      maxAttempts: this.config.maxRerouteAttempts,
      isOffRoute: this.offRouteStartTime !== null,
      offRouteDuration: this.offRouteStartTime ? Date.now() - this.offRouteStartTime : undefined
    };
  }
}