import { Coordinates, RouteInstruction } from '../types/navigation';
import { calculateDistance } from './mapUtils';

export interface ManeuverType {
  type: 'straight' | 'turn-left' | 'turn-right' | 'slight-left' | 'slight-right' | 
        'sharp-left' | 'sharp-right' | 'u-turn' | 'arrive';
  angle: number;
}

export class LocalInstructionGenerator {
  private readonly MIN_SEGMENT_DISTANCE = 5; // Minimum 5m between maneuvers
  private readonly ANGLE_THRESHOLD_SLIGHT = 15; // Degrees
  private readonly ANGLE_THRESHOLD_NORMAL = 45; // Degrees
  private readonly ANGLE_THRESHOLD_SHARP = 120; // Degrees

  /**
   * Generate turn-by-turn instructions from coordinate path
   */
  generateInstructions(coordinates: number[][], language: 'de' | 'en' = 'de'): RouteInstruction[] {
    if (coordinates.length < 2) {
      return [{
        instruction: language === 'de' ? 'Ziel erreicht' : 'Arrive at destination',
        distance: '0m',
        duration: '0s',
        maneuverType: 'arrive'
      }];
    }

    const instructions: RouteInstruction[] = [];
    const significantPoints = this.findSignificantPoints(coordinates);
    
    console.log(`🔄 INSTRUCTION GENERATOR: Found ${significantPoints.length} significant points from ${coordinates.length} coordinates`);

    for (let i = 0; i < significantPoints.length - 1; i++) {
      const currentPoint = significantPoints[i];
      const nextPoint = significantPoints[i + 1];
      
      // Calculate maneuver
      let maneuverType: ManeuverType;
      if (i === significantPoints.length - 2) {
        // Last instruction - arrival
        maneuverType = { type: 'arrive', angle: 0 };
      } else {
        const prevPoint = i > 0 ? significantPoints[i - 1] : currentPoint;
        maneuverType = this.calculateManeuver(prevPoint, currentPoint, nextPoint);
      }

      // Calculate distance to next maneuver
      const distance = this.calculateDistanceBetweenPoints(currentPoint, nextPoint);
      
      // Generate instruction text and estimated duration
      const instruction = this.generateInstructionText(maneuverType, language);
      const duration = this.estimateDuration(distance, 'walking');

      instructions.push({
        instruction,
        distance: this.formatDistance(distance),
        duration: this.formatDuration(duration),
        maneuverType: maneuverType.type
      });

      console.log(`📍 INSTRUCTION ${i + 1}: ${instruction} (${this.formatDistance(distance)}, ${maneuverType.type}, ${maneuverType.angle}°)`);
    }

    return instructions;
  }

  /**
   * Find significant points where direction changes occur
   */
  private findSignificantPoints(coordinates: number[][]): Coordinates[] {
    if (coordinates.length <= 2) {
      return coordinates.map(coord => ({ lat: coord[1], lng: coord[0] }));
    }

    const significantPoints: Coordinates[] = [];
    
    // Always include start point
    significantPoints.push({ lat: coordinates[0][1], lng: coordinates[0][0] });

    for (let i = 1; i < coordinates.length - 1; i++) {
      const prevPoint = { lat: coordinates[i - 1][1], lng: coordinates[i - 1][0] };
      const currentPoint = { lat: coordinates[i][1], lng: coordinates[i][0] };
      const nextPoint = { lat: coordinates[i + 1][1], lng: coordinates[i + 1][0] };

      // Check if this is a significant direction change
      const maneuver = this.calculateManeuver(prevPoint, currentPoint, nextPoint);
      
      // Skip if it's straight or the distance is too small
      const distanceFromLast = significantPoints.length > 0 
        ? calculateDistance(significantPoints[significantPoints.length - 1], currentPoint)
        : this.MIN_SEGMENT_DISTANCE + 1;

      if (maneuver.type !== 'straight' && distanceFromLast >= this.MIN_SEGMENT_DISTANCE) {
        significantPoints.push(currentPoint);
      }
    }

    // Always include end point
    const lastCoord = coordinates[coordinates.length - 1];
    significantPoints.push({ lat: lastCoord[1], lng: lastCoord[0] });

    return significantPoints;
  }

  /**
   * Calculate maneuver type based on three points
   */
  private calculateManeuver(prev: Coordinates, current: Coordinates, next: Coordinates): ManeuverType {
    // Calculate bearings
    const bearing1 = this.calculateBearing(prev, current);
    const bearing2 = this.calculateBearing(current, next);
    
    // Calculate turn angle
    let angle = bearing2 - bearing1;
    
    // Normalize angle to [-180, 180]
    if (angle > 180) angle -= 360;
    if (angle < -180) angle += 360;

    const absAngle = Math.abs(angle);

    // Determine maneuver type
    if (absAngle < this.ANGLE_THRESHOLD_SLIGHT) {
      return { type: 'straight', angle };
    } else if (absAngle > this.ANGLE_THRESHOLD_SHARP) {
      return { type: 'u-turn', angle };
    } else if (angle > 0) {
      // Right turn
      if (absAngle < this.ANGLE_THRESHOLD_NORMAL) {
        return { type: 'slight-right', angle };
      } else {
        return { type: 'turn-right', angle };
      }
    } else {
      // Left turn
      if (absAngle < this.ANGLE_THRESHOLD_NORMAL) {
        return { type: 'slight-left', angle };
      } else {
        return { type: 'turn-left', angle };
      }
    }
  }

  /**
   * Calculate bearing between two points in degrees
   */
  private calculateBearing(from: Coordinates, to: Coordinates): number {
    const lat1 = from.lat * Math.PI / 180;
    const lat2 = to.lat * Math.PI / 180;
    const deltaLng = (to.lng - from.lng) * Math.PI / 180;

    const x = Math.sin(deltaLng) * Math.cos(lat2);
    const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);

    const bearing = Math.atan2(x, y) * 180 / Math.PI;
    return (bearing + 360) % 360; // Normalize to [0, 360]
  }

  /**
   * Calculate distance between two coordinate points
   */
  private calculateDistanceBetweenPoints(from: Coordinates, to: Coordinates): number {
    return calculateDistance(from, to);
  }

  /**
   * Generate instruction text for maneuver
   */
  private generateInstructionText(maneuver: ManeuverType, language: 'de' | 'en'): string {
    const germanInstructions = {
      'straight': 'Geradeaus weitergehen',
      'turn-left': 'Links abbiegen',
      'turn-right': 'Rechts abbiegen',
      'slight-left': 'Leicht links halten',
      'slight-right': 'Leicht rechts halten',
      'sharp-left': 'Scharf links abbiegen',
      'sharp-right': 'Scharf rechts abbiegen',
      'u-turn': 'Wenden',
      'arrive': 'Sie haben Ihr Ziel erreicht'
    };

    const englishInstructions = {
      'straight': 'Continue straight',
      'turn-left': 'Turn left',
      'turn-right': 'Turn right',
      'slight-left': 'Keep left',
      'slight-right': 'Keep right', 
      'sharp-left': 'Turn sharp left',
      'sharp-right': 'Turn sharp right',
      'u-turn': 'Make a U-turn',
      'arrive': 'You have arrived at your destination'
    };

    const instructions = language === 'de' ? germanInstructions : englishInstructions;
    return instructions[maneuver.type] || instructions['straight'];
  }

  /**
   * Estimate duration for a given distance and travel mode
   */
  private estimateDuration(distanceKm: number, mode: 'walking' | 'cycling' | 'driving' = 'walking'): number {
    const speedKmh = {
      walking: 5,    // 5 km/h
      cycling: 15,   // 15 km/h  
      driving: 30    // 30 km/h in campground
    };

    return (distanceKm / speedKmh[mode]) * 3600; // seconds
  }

  /**
   * Format distance in meters or kilometers
   */
  private formatDistance(distanceKm: number): string {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)} Meter`;
    } else {
      return `${(distanceKm).toFixed(1)} Kilometer`;
    }
  }

  /**
   * Format duration in seconds to readable time
   */
  private formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${Math.round(seconds)} Sekunden`;
    } else if (seconds < 3600) {
      return `${Math.round(seconds / 60)} Minuten`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.round((seconds % 3600) / 60);
      return `${hours} Stunden ${minutes} Minuten`;
    }
  }
}