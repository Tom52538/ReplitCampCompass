import { useState, useEffect, useRef } from 'react';
import { Coordinates } from '../types/navigation';
import { SpeedTracker } from '../lib/speedTracker';

interface NavigationTrackingOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  updateInterval?: number;
  adaptiveTracking?: boolean;
}

interface NavigationPosition {
  position: Coordinates;
  accuracy: number;
  speed?: number;
  heading?: number;
  timestamp: number;
}

interface NavigationMetrics {
  updateCount: number;
  averageAccuracy: number;
  lastUpdateTime: number;
  activeInterval: number;
  currentSpeed: number;
  averageSpeed: number;
  maxSpeed: number;
  isMoving: boolean;
}

export const useNavigationTracking = (
  isNavigating: boolean,
  useRealGPS: boolean,
  providedPosition: Coordinates | null,
  options: NavigationTrackingOptions = {}
) => {
  const [navigationPosition, setNavigationPosition] = useState<NavigationPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [adaptiveInterval, setAdaptiveInterval] = useState<number>(1000);
  const [metrics, setMetrics] = useState<NavigationMetrics>({
    updateCount: 0,
    averageAccuracy: 0,
    lastUpdateTime: 0,
    activeInterval: 1000,
    currentSpeed: 0,
    averageSpeed: 0,
    maxSpeed: 0,
    isMoving: false
  });
  
  // Speed tracker and GPS watch references
  const speedTrackerRef = useRef<SpeedTracker | null>(null);
  const watchIdRef = useRef<number | undefined>(undefined);
  const lastThrottleTimeRef = useRef<number>(0);
  const accuracyHistoryRef = useRef<number[]>([]);
  
  console.log(`🔍 NAV TRACKING DEBUG: useNavigationTracking initialized - isNavigating: ${isNavigating}, useRealGPS: ${useRealGPS}`);

  const {
    enableHighAccuracy = true,
    timeout = 5000,
    maximumAge = 1000,
    updateInterval = 1000,
    adaptiveTracking = true
  } = options;

  // Adaptive interval calculation based on speed and context
  const calculateAdaptiveInterval = (speed: number | undefined, accuracy: number) => {
    if (!adaptiveTracking) return updateInterval;
    
    const speedKmh = speed ? speed * 3.6 : 0; // Convert m/s to km/h
    
    // High speed (>30 km/h) - frequent updates for safety
    if (speedKmh > 30) return 500;
    
    // Medium speed (10-30 km/h) - balanced updates
    if (speedKmh > 10) return 1000;
    
    // Low speed/stationary - less frequent updates to save battery
    if (speedKmh < 1) return 3000;
    
    // Default walking speed - normal updates
    return 1500;
  };

  // Initialize speed tracker when navigation starts
  useEffect(() => {
    if (isNavigating && !speedTrackerRef.current) {
      speedTrackerRef.current = new SpeedTracker();
      console.log('🏃 Speed tracker initialized for navigation session');
    } else if (!isNavigating && speedTrackerRef.current) {
      speedTrackerRef.current = null;
      console.log('🏃 Speed tracker cleaned up - navigation ended');
    }
  }, [isNavigating]);

  // Main GPS tracking effect - creates real GPS watch for real GPS mode
  useEffect(() => {
    console.log(`🔍 NAV TRACKING DEBUG: Effect triggered - isNavigating: ${isNavigating}, useRealGPS: ${useRealGPS} (should be FALSE for testing)`);
    
    // Clear any existing watch
    if (watchIdRef.current !== undefined) {
      try {
        navigator.geolocation?.clearWatch(watchIdRef.current);
        console.log(`🛑 Cleared existing GPS watch: ${watchIdRef.current}`);
      } catch (e) {
        console.warn('Error clearing GPS watch:', e);
      }
      watchIdRef.current = undefined;
    }
    
    if (!isNavigating) {
      console.log(`🔍 NAV TRACKING DEBUG: Not navigating - stopping tracking`);
      setIsTracking(false);
      setNavigationPosition(null);
      setError(null);
      setMetrics({
        updateCount: 0,
        averageAccuracy: 0,
        lastUpdateTime: 0,
        activeInterval: 1000,
        currentSpeed: 0,
        averageSpeed: 0,
        maxSpeed: 0,
        isMoving: false
      });
      accuracyHistoryRef.current = [];
      return;
    }

    console.log(`🔍 NAV TRACKING DEBUG: Starting navigation tracking in ${useRealGPS ? 'Real GPS' : 'Mock GPS'} mode`);
    
    if (useRealGPS) {
      console.warn('⚠️ REAL GPS DETECTED - Should use Mock GPS for testing!');
    }
    setIsTracking(true);
    setError(null);

    if (useRealGPS) {
      // Real GPS mode - create our own GPS watch with high precision
      if (!navigator.geolocation) {
        setError('Geolocation not supported');
        return;
      }

      try {
        const watchId = navigator.geolocation.watchPosition(
          (position) => {
            const now = Date.now();
            
            // Apply adaptive throttling - skip update if too soon
            if (adaptiveTracking && now - lastThrottleTimeRef.current < adaptiveInterval) {
              console.log(`⏱️ Throttling GPS update (${now - lastThrottleTimeRef.current}ms < ${adaptiveInterval}ms)`);
              return;
            }
            lastThrottleTimeRef.current = now;

            const navPosition: NavigationPosition = {
              position: {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              },
              accuracy: position.coords.accuracy,
              speed: position.coords.speed || undefined,
              heading: position.coords.heading || undefined,
              timestamp: position.timestamp
            };

            console.log(`🛰️ REAL GPS UPDATE (Navigation):`, {
              position: navPosition.position,
              accuracy: navPosition.accuracy,
              speed: navPosition.speed,
              heading: navPosition.heading,
              interval: adaptiveInterval
            });

            // Update position
            setNavigationPosition(navPosition);

            // Add to speed tracker for performance metrics
            if (speedTrackerRef.current) {
              speedTrackerRef.current.addPosition(navPosition.position);
            }

            // Update accuracy history
            accuracyHistoryRef.current.push(navPosition.accuracy);
            if (accuracyHistoryRef.current.length > 20) {
              accuracyHistoryRef.current.shift();
            }

            const averageAccuracy = accuracyHistoryRef.current.reduce((a, b) => a + b, 0) / accuracyHistoryRef.current.length;
            
            // Get speed data from speed tracker
            const speedData = speedTrackerRef.current?.getSpeedData() || {
              currentSpeed: 0,
              averageSpeed: 0,
              maxSpeed: 0,
              isMoving: false
            };
            
            setMetrics(prev => ({
              updateCount: prev.updateCount + 1,
              averageAccuracy,
              lastUpdateTime: now,
              activeInterval: adaptiveInterval,
              currentSpeed: speedData.currentSpeed,
              averageSpeed: speedData.averageSpeed,
              maxSpeed: speedData.maxSpeed,
              isMoving: speedData.isMoving
            }));

            // Recalculate adaptive interval based on real GPS speed
            if (adaptiveTracking) {
              const newInterval = calculateAdaptiveInterval(navPosition.speed, navPosition.accuracy);
              if (newInterval !== adaptiveInterval) {
                console.log(`📊 Adaptive interval changed: ${adaptiveInterval}ms → ${newInterval}ms (speed: ${navPosition.speed || 0}m/s)`);
                setAdaptiveInterval(newInterval);
              }
            }
          },
          (geoError) => {
            console.warn('🛰️ Real GPS Navigation Error:', geoError.message);
            let errorMessage = 'GPS tracking failed';
            switch (geoError.code) {
              case geoError.PERMISSION_DENIED:
                errorMessage = 'GPS permission denied for navigation';
                break;
              case geoError.POSITION_UNAVAILABLE:
                errorMessage = 'GPS signal unavailable during navigation';
                break;
              case geoError.TIMEOUT:
                errorMessage = 'GPS timeout during navigation';
                break;
            }
            setError(errorMessage);
          },
          {
            enableHighAccuracy: enableHighAccuracy,
            timeout: timeout,
            maximumAge: maximumAge
          }
        );

        watchIdRef.current = watchId;
        console.log(`🔍 NAV TRACKING: Started real GPS watch ${watchId} with ${adaptiveInterval}ms interval`);
      } catch (e) {
        console.error('Failed to start navigation GPS:', e);
        setError('Failed to start GPS navigation tracking');
      }
    } else {
      // Mock GPS mode - use provided position with simulated realistic metrics
      const updateMockPosition = () => {
        if (providedPosition) {
          const navPosition: NavigationPosition = {
            position: providedPosition,
            accuracy: 5, // Mock GPS has consistent "accuracy"
            speed: undefined, // Mock mode doesn't simulate speed
            heading: undefined, // Mock mode doesn't simulate heading
            timestamp: Date.now()
          };

          console.log(`🎭 MOCK GPS UPDATE (Navigation):`, navPosition);
          setNavigationPosition(navPosition);
          
          // Add to speed tracker (for testing speed calculations)
          if (speedTrackerRef.current) {
            speedTrackerRef.current.addPosition(navPosition.position);
          }

          // Get speed data for mock mode
          const speedData = speedTrackerRef.current?.getSpeedData() || {
            currentSpeed: 0,
            averageSpeed: 0,
            maxSpeed: 0,
            isMoving: false
          };

          // Simulate realistic metrics for mock mode
          setMetrics(prev => ({
            updateCount: prev.updateCount + 1,
            averageAccuracy: 5,
            lastUpdateTime: Date.now(),
            activeInterval: adaptiveInterval,
            currentSpeed: speedData.currentSpeed,
            averageSpeed: speedData.averageSpeed,
            maxSpeed: speedData.maxSpeed,
            isMoving: speedData.isMoving
          }));

          // Calculate adaptive interval for mock GPS (for testing)
          if (adaptiveTracking) {
            const newInterval = calculateAdaptiveInterval(undefined, navPosition.accuracy);
            if (newInterval !== adaptiveInterval) {
              console.log(`📊 Mock adaptive interval: ${adaptiveInterval}ms → ${newInterval}ms`);
              setAdaptiveInterval(newInterval);
            }
          }
        } else {
          console.log(`🔍 NAV TRACKING DEBUG: No mock position available yet`);
          setNavigationPosition(null);
        }
      };

      // Update immediately
      updateMockPosition();
      
      // Set up interval for mock GPS updates (simulating real GPS)
      const mockInterval = setInterval(updateMockPosition, adaptiveInterval);
      
      // Store mock interval in watchIdRef for cleanup
      watchIdRef.current = mockInterval as any;
    }

    // Cleanup function
    return () => {
      if (watchIdRef.current !== undefined) {
        try {
          if (useRealGPS) {
            navigator.geolocation?.clearWatch(watchIdRef.current as number);
            console.log(`🔥 CLEANUP: Real GPS watch ${watchIdRef.current} cleared`);
          } else {
            clearInterval(watchIdRef.current as number);
            console.log(`🔥 CLEANUP: Mock GPS interval ${watchIdRef.current} cleared`);
          }
        } catch (e) {
          console.warn('Navigation GPS cleanup error:', e);
        }
        watchIdRef.current = undefined;
      }
      setIsTracking(false);
      setNavigationPosition(null);
    };
  }, [isNavigating, useRealGPS, providedPosition, adaptiveTracking, enableHighAccuracy, timeout, maximumAge, adaptiveInterval]);

  // Get single position (for initial setup) - respects GPS mode
  const getCurrentPosition = (): Promise<NavigationPosition> => {
    return new Promise((resolve, reject) => {
      if (!useRealGPS) {
        // Mock GPS mode - return provided position immediately
        if (providedPosition) {
          const navPosition: NavigationPosition = {
            position: providedPosition,
            accuracy: 5, // Mock GPS accuracy
            speed: undefined,
            heading: undefined,
            timestamp: Date.now()
          };
          resolve(navPosition);
        } else {
          reject(new Error('No mock position available'));
        }
        return;
      }

      // Real GPS mode - use geolocation API
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      try {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            try {
              const navPosition: NavigationPosition = {
                position: {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude
                },
                accuracy: position.coords.accuracy,
                speed: position.coords.speed || undefined,
                heading: position.coords.heading || undefined,
                timestamp: position.timestamp
              };
              resolve(navPosition);
            } catch (e) {
              reject(new Error(`Position processing error: ${e}`));
            }
          },
          (geoError) => {
            reject(new Error(`Location error: ${geoError.message}`));
          },
          {
            enableHighAccuracy,
            timeout,
            maximumAge: 0
          }
        );
      } catch (e) {
        reject(new Error(`Geolocation API error: ${e}`));
      }
    });
  };

  return {
    currentPosition: navigationPosition,
    error,
    isTracking,
    getCurrentPosition,
    metrics,
    adaptiveInterval,
    speedTracker: speedTrackerRef.current
  };
};