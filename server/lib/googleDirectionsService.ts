interface Point {
  lat: number;
  lng: number;
}

interface GoogleDirectionsResponse {
  success: boolean;
  path: number[][];
  distance: number;
  estimatedTime: number;
  instructions: string[];
  method: string;
  confidence: number;
  error?: string;
}

export class GoogleDirectionsService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_DIRECTIONS_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ Google Directions API key not found - external routing unavailable');
    }
  }

  async calculateRoute(
    start: Point, 
    end: Point, 
    mode: 'walking' | 'cycling' | 'driving' = 'walking'
  ): Promise<GoogleDirectionsResponse> {
    if (!this.apiKey) {
      return {
        success: false,
        path: [],
        distance: 0,
        estimatedTime: 0,
        instructions: [],
        method: 'google-directions-no-key',
        confidence: 0,
        error: 'Google Directions API key not configured'
      };
    }

    try {
      console.log(`🌐 GOOGLE DIRECTIONS: Requesting ${mode} route from ${start.lat},${start.lng} to ${end.lat},${end.lng}`);

      // Map our travel modes to Google's
      const googleMode = mode === 'cycling' ? 'bicycling' : mode;
      
      const url = `https://maps.googleapis.com/maps/api/directions/json?` +
        `origin=${start.lat},${start.lng}&` +
        `destination=${end.lat},${end.lng}&` +
        `mode=${googleMode}&` +
        `language=de&` +  // Force German language for instructions
        `key=${this.apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok || data.status !== 'OK') {
        console.error('❌ Google Directions API error:', data.error_message || data.status);
        return {
          success: false,
          path: [],
          distance: 0,
          estimatedTime: 0,
          instructions: [],
          method: 'google-directions-error',
          confidence: 0,
          error: data.error_message || `API returned status: ${data.status}`
        };
      }

      const route = data.routes[0];
      const leg = route.legs[0];
      
      // Decode the polyline to get the path coordinates
      const path = this.decodePolyline(route.overview_polyline.points);
      
      // Extract turn-by-turn instructions
      const instructions = leg.steps.map((step: any) => 
        this.stripHtml(step.html_instructions)
      );

      console.log(`✅ GOOGLE DIRECTIONS: Got ${path.length} points, ${leg.distance.value}m, ${leg.duration.value}s`);

      return {
        success: true,
        path: path,
        distance: leg.distance.value, // Distance in meters
        estimatedTime: leg.duration.value, // Duration in seconds
        instructions: instructions,
        method: 'google-directions',
        confidence: 0.9 // High confidence for Google's routing
      };

    } catch (error) {
      console.error('❌ Google Directions fetch error:', error);
      return {
        success: false,
        path: [],
        distance: 0,
        estimatedTime: 0,
        instructions: [],
        method: 'google-directions-fetch-error',
        confidence: 0,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  // Decode Google's polyline encoding to coordinates
  private decodePolyline(encoded: string): number[][] {
    const coordinates: number[][] = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
      let byte = 0;
      let shift = 0;
      let result = 0;

      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      const deltaLat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lat += deltaLat;

      shift = 0;
      result = 0;

      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      const deltaLng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lng += deltaLng;

      coordinates.push([lng / 1e5, lat / 1e5]); // [lng, lat] format
    }

    return coordinates;
  }

  // Strip HTML tags from Google's instructions
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
  }
}