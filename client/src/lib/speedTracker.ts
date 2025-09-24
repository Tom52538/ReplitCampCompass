import { Coordinates } from '../types/navigation';
import { calculateDistance } from './mapUtils';

export interface SpeedData {
  currentSpeed: number; // km/h
  averageSpeed: number; // km/h
  maxSpeed: number; // km/h
  isMoving: boolean;
}

export interface ETAUpdate {
  estimatedTimeRemaining: number; // seconds
  estimatedArrival: Date;
  speedBasedETA: number; // seconds
  distanceRemaining: number; // km
}

export class SpeedTracker {
  private positions: Array<{ position: Coordinates; timestamp: number }> = [];
  private readonly maxHistorySize = 20; // Keep last 20 positions
  private readonly minMovementThreshold = 0.001; // 1 meter minimum movement
  private readonly speedSmoothingWindow = 5; // Use last 5 readings for current speed
  
  private totalDistance = 0;
  private startTime = Date.now();
  private maxRecordedSpeed = 0;

  addPosition(position: Coordinates) {
    const timestamp = Date.now();
    
    // Only add if position has changed significantly
    if (this.positions.length > 0) {
      const lastPosition = this.positions[this.positions.length - 1];
      const distance = calculateDistance(lastPosition.position, position);
      
      if (distance < this.minMovementThreshold) {
        return; // Skip insignificant movements
      }
      
      this.totalDistance += distance;
    }

    this.positions.push({ position, timestamp });
    
    // Maintain history size
    if (this.positions.length > this.maxHistorySize) {
      this.positions.shift();
    }

    // Update max speed
    const currentSpeed = this.getCurrentSpeed();
    if (currentSpeed > this.maxRecordedSpeed) {
      this.maxRecordedSpeed = currentSpeed;
    }
  }

  getCurrentSpeed(): number {
    if (this.positions.length < 2) return 0;

    // Use recent positions for current speed calculation
    const recentPositions = this.positions.slice(-this.speedSmoothingWindow);
    if (recentPositions.length < 2) return 0;

    let totalDistance = 0;
    let totalTime = 0;

    for (let i = 1; i < recentPositions.length; i++) {
      const distance = calculateDistance(
        recentPositions[i-1].position, 
        recentPositions[i].position
      );
      const time = (recentPositions[i].timestamp - recentPositions[i-1].timestamp) / 1000; // seconds
      
      totalDistance += distance;
      totalTime += time;
    }

    if (totalTime === 0) return 0;
    
    // Convert to km/h
    const speedKmh = (totalDistance / totalTime) * 3600;
    
    // Cap unrealistic speeds (max 50 km/h for safety)
    return Math.min(speedKmh, 50);
  }

  getAverageSpeed(): number {
    if (this.positions.length < 2) return 0;
    
    const elapsedTime = (Date.now() - this.startTime) / 1000 / 3600; // hours
    if (elapsedTime === 0) return 0;
    
    return this.totalDistance / elapsedTime; // km/h
  }

  getSpeedData(): SpeedData {
    const currentSpeed = this.getCurrentSpeed();
    const averageSpeed = this.getAverageSpeed();
    
    return {
      currentSpeed,
      averageSpeed,
      maxSpeed: this.maxRecordedSpeed,
      isMoving: currentSpeed > 0.5 // Moving if speed > 0.5 km/h
    };
  }

  calculateUpdatedETA(remainingDistance: number, travelMode?: 'car' | 'bike' | 'pedestrian'): ETAUpdate {
    const speedData = this.getSpeedData();
    
    // Choose appropriate speed for ETA calculation based on travel mode
    let estimatedSpeed: number;
    
    if (travelMode) {
      // Use travel mode specific speeds matching server-side campground calculations
      const modeToSpeed = {
        'car': 15,      // 15 km/h for campground driving (4.17 m/s)
        'bike': 7.2,    // 7.2 km/h for campground cycling (2.0 m/s)
        'pedestrian': 3.6 // 3.6 km/h for campground walking (1.0 m/s)
      };
      estimatedSpeed = modeToSpeed[travelMode];
      
      console.log(`🚗 ETA CALCULATION: Using ${travelMode} mode at ${estimatedSpeed} km/h for ${remainingDistance.toFixed(0)}m`);
    } else if (speedData.isMoving && speedData.currentSpeed > 1) {
      // Use current speed if actively moving
      estimatedSpeed = speedData.currentSpeed;
    } else if (speedData.averageSpeed > 1) {
      // Fall back to average speed
      estimatedSpeed = speedData.averageSpeed;
    } else {
      // Default walking speed for camping navigation
      estimatedSpeed = 4; // 4 km/h typical walking speed
    }

    // Calculate time remaining in seconds
    const timeHours = remainingDistance / estimatedSpeed;
    const timeSeconds = timeHours * 3600;
    
    // Create estimated arrival time
    const estimatedArrival = new Date(Date.now() + timeSeconds * 1000);

    console.log(`⏱️ ETA UPDATE: ${remainingDistance.toFixed(0)}m at ${estimatedSpeed} km/h = ${Math.ceil(timeSeconds/60)} min`);

    return {
      estimatedTimeRemaining: timeSeconds,
      estimatedArrival,
      speedBasedETA: timeSeconds,
      distanceRemaining: remainingDistance
    };
  }

  // Get movement statistics for debugging/analytics
  getMovementStats() {
    return {
      totalPositions: this.positions.length,
      totalDistance: this.totalDistance,
      elapsedTime: (Date.now() - this.startTime) / 1000,
      averageSpeed: this.getAverageSpeed(),
      currentSpeed: this.getCurrentSpeed(),
      maxSpeed: this.maxRecordedSpeed,
      isTracking: this.positions.length > 0
    };
  }

  // Reset tracker (for new navigation session)
  reset() {
    this.positions = [];
    this.totalDistance = 0;
    this.startTime = Date.now();
    this.maxRecordedSpeed = 0;
  }

  // Check if user has been stationary for too long
  isStationary(thresholdSeconds: number = 300): boolean {
    if (this.positions.length < 2) return false;
    
    const lastPosition = this.positions[this.positions.length - 1];
    const timeSinceLastMovement = (Date.now() - lastPosition.timestamp) / 1000;
    
    return timeSinceLastMovement > thresholdSeconds && !this.getSpeedData().isMoving;
  }

  // Estimate time to destination with different scenarios
  getETAScenarios(remainingDistance: number, currentTravelMode?: 'car' | 'bike' | 'pedestrian') {
    return {
      atCurrentSpeed: this.calculateUpdatedETA(remainingDistance),
      atCurrentMode: currentTravelMode ? this.calculateUpdatedETA(remainingDistance, currentTravelMode) : this.calculateUpdatedETA(remainingDistance),
      atCarSpeed: this.calculateUpdatedETA(remainingDistance, 'car'),
      atBikeSpeed: this.calculateUpdatedETA(remainingDistance, 'bike'),
      atWalkingSpeed: this.calculateUpdatedETA(remainingDistance, 'pedestrian'),
      allModes: {
        car: this.calculateUpdatedETA(remainingDistance, 'car'),
        bike: this.calculateUpdatedETA(remainingDistance, 'bike'),
        pedestrian: this.calculateUpdatedETA(remainingDistance, 'pedestrian')
      }
    };
  }

  // Quick method to get ETA for a specific travel mode with German verb
  getETAForMode(remainingDistance: number, travelMode: 'car' | 'bike' | 'pedestrian'): ETAUpdate {
    const eta = this.calculateUpdatedETA(remainingDistance, travelMode);
    
    // Add German travel context
    const verb = this.getGermanTravelVerb(travelMode);
    
    return {
      ...eta,
      travelContext: {
        mode: travelMode,
        verb: verb,
        speedText: this.getSpeedDescription(travelMode)
      }
    };
  }

  private getGermanTravelVerb(mode: 'car' | 'bike' | 'pedestrian'): string {
    switch (mode) {
      case 'car':
        return 'Fahren';
      case 'bike': 
        return 'Radfahren';
      case 'pedestrian':
      default:
        return 'Gehen';
    }
  }

  private getSpeedDescription(mode: 'car' | 'bike' | 'pedestrian'): string {
    switch (mode) {
      case 'car':
        return '15 km/h (Campingplatz)';
      case 'bike':
        return '7.2 km/h (vorsichtig)';
      case 'pedestrian':
      default:
        return '3.6 km/h (gemütlich)';
    }
  }
}