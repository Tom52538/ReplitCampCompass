import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Navigation, Square, AlertTriangle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RouteResponse, Coordinates } from '@/types/navigation';
import { useNavigationTracking } from '@/hooks/useNavigationTracking';
import { useLocation } from '@/hooks/useLocation';
import { RouteTracker, RouteProgress } from '@/lib/routeTracker';
import { RerouteService } from '@/lib/rerouteService';
import { CampgroundRerouteDetector } from '@/lib/campgroundRerouting';
import { NavigationPerformanceMonitor } from './NavigationPerformanceMonitor';
import { offlineStorage } from '@/lib/offlineStorage';
import { useLanguage } from '@/hooks/useLanguage';
import { getTranslation, translateInstruction } from '@/lib/i18n';
import { SecureTTSClient } from '@/services/secureTTSClient';

interface GroundNavigationProps {
  route: RouteResponse;
  onEndNavigation: () => void;
  onRouteUpdate?: (newRoute: RouteResponse) => void;
  isVisible: boolean;
}

export const GroundNavigation = ({
  route,
  onEndNavigation,
  onRouteUpdate,
  isVisible
}: GroundNavigationProps) => {
  const [isNavigating, setIsNavigating] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [routeProgress, setRouteProgress] = useState<RouteProgress | null>(null);
  const [isOffRoute, setIsOffRoute] = useState(false);
  const [hasAnnouncedStart, setHasAnnouncedStart] = useState(false);
  const [isRerouting, setIsRerouting] = useState(false);
  const [offRouteCount, setOffRouteCount] = useState(0);
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(false);
  const [gpsUpdateCount, setGpsUpdateCount] = useState(0);
  const [lastAnnouncedDistance, setLastAnnouncedDistance] = useState(0);
  const [navigationError, setNavigationError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Voice guidance refs - ElevenLabs TTS only
  const ttsClientRef = useRef<SecureTTSClient | null>(null);
  const lastAnnouncementRef = useRef<{ step: number; distance: number; time: number }>({ step: 0, distance: 999, time: 0 });
  const routeCacheRef = useRef<string>('');
  const hasAnnouncedStartRef = useRef<boolean>(false);

  // Language system
  const { currentLanguage } = useLanguage();

  // Initialize TTS client safely with comprehensive error handling
  useEffect(() => {
    const initializeTTS = async () => {
      if (true && !ttsClientRef.current && !isInitialized) {
        try {
          setIsInitialized(true);
          ttsClientRef.current = new SecureTTSClient();
          console.log('🎤 TTS Client initialized for ground navigation');

          // Test TTS connection immediately
          try {
            const testResult = await ttsClientRef.current.testConnection();
            console.log('🧪 TTS Connection Test Result:', testResult);
            if (!testResult.available || !testResult.connected) {
              throw new Error(testResult.error || 'TTS service not available');
            }
          } catch (testError) {
            console.error('❌ TTS Connection Test Failed:', testError);
            setNavigationError('TTS service unavailable - check console for details');
          }

          setNavigationError(null);
        } catch (error) {
          console.error('❌ Failed to initialize TTS client:', error);
          setNavigationError('Voice guidance unavailable - continuing without audio');
          // Don't block navigation, just disable voice
          ttsClientRef.current = null;
        }
      } else if (!true && ttsClientRef.current) {
        // Clean up TTS when voice is disabled
        try {
          ttsClientRef.current = null;
          console.log('🎤 TTS Client cleaned up');
        } catch (error) {
          console.warn('⚠️ TTS cleanup warning:', error);
        }
      }
    };

    initializeTTS().catch(error => {
      console.error('❌ TTS initialization error:', error);
      setNavigationError('Voice system error - navigation continues silently');
    });
  }, [true, isInitialized]);

  // Get GPS state from useLocation
  const { currentPosition: locationPosition, useRealGPS } = useLocation();

  // Rerouting service
  const rerouteService = useMemo(() => new RerouteService(), []);

  // Campground reroute detector for automatic rerouting
  const campgroundRerouteDetector = useMemo(() => new CampgroundRerouteDetector(), []);

  // Continuous GPS tracking with adaptive performance
  const { currentPosition, error: gpsError, isTracking } = useNavigationTracking(isNavigating, useRealGPS, locationPosition, {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 1000,
    adaptiveTracking: true
  });

  // FIXED: Enhanced automatic rerouting handler with proper state reset
  const handleAutoReroute = useCallback(async (offRouteDistance: number) => {
    if (isRerouting || !currentPosition || !onRouteUpdate) {
      console.log('🔄 REROUTING BLOCKED:', { isRerouting, hasPosition: !!currentPosition, hasUpdateCallback: !!onRouteUpdate });
      return;
    }

    console.log('🔄 STARTING REROUTING from position:', currentPosition.position);
    setIsRerouting(true);

    try {
      // Extract destination from current route
      const geometry = route.geometry;
      if (!geometry || geometry.length === 0) {
        throw new Error('No route geometry available');
      }

      const destination = {
        lat: geometry[geometry.length - 1][1],
        lng: geometry[geometry.length - 1][0]
      };

      console.log('🎯 REROUTING DESTINATION:', destination);

      const newRoute = await rerouteService.quickReroute(
        currentPosition.position,
        destination
      );

      console.log('✅ NEW ROUTE CALCULATED:', {
        distance: newRoute.totalDistance,
        instructions: newRoute.instructions?.length || 0
      });

      // CRITICAL: Reset ALL navigation state before updating route
      setCurrentStepIndex(0);
      setOffRouteCount(0);
      setLastAnnouncedDistance(0);
      setIsOffRoute(false);
      setHasAnnouncedStart(false); // Force new start announcement
      hasAnnouncedStartRef.current = false;

      // Reset announcement tracking completely
      lastAnnouncementRef.current = { step: -1, distance: 999, time: 0 };

      // Update the route - this will trigger new navigation
      onRouteUpdate(newRoute);

      // Force route tracker to update with new route
      routeTracker.updateRoute(newRoute);

      // Announce rerouting success
      if (ttsClientRef.current) {
        try {
          await ttsClientRef.current.speak('Route neu berechnet. Neue Anweisungen folgen.', 'start');
        } catch (error) {
          console.warn('Reroute announcement failed:', error);
        }
      }

      console.log('✅ REROUTING COMPLETE - All state reset for new navigation');

    } catch (error) {
      console.error('❌ REROUTING FAILED:', error);
      setNavigationError('Rerouting failed - continuing with original route');
    } finally {
      setIsRerouting(false);
    }
  }, [isRerouting, currentPosition, route.geometry, rerouteService, onRouteUpdate, routeTracker]);

  // Route tracker instance
  const routeTracker = useMemo(() => {
    return new RouteTracker(
      route,
      (stepIndex) => setCurrentStepIndex(stepIndex),
      () => {
        // Route completed
        setIsNavigating(false);
        setTimeout(() => onEndNavigation(), 2000);
      },
      (offRouteDistance) => {
        setIsOffRoute(true);
        setOffRouteCount(prev => prev + 1);
        console.log(`Off route detected: ${Math.round(offRouteDistance)}m from route`);
      }
    );
  }, [route, onEndNavigation]);

  // Update RouteTracker when route changes externally
  useEffect(() => {
    if (routeTracker && route) {
      routeTracker.updateRoute(route);
      setCurrentStepIndex(0);
      console.log('🗺️ RouteTracker updated due to external route change');
    }
  }, [route?.geometry, routeTracker]);

  // FIXED: Navigation start announcement with REAL first instruction
  useEffect(() => {
    const handleNavigationStart = async () => {
      // Early return with safety checks
      if (!isNavigating || !true || hasAnnouncedStart || !routeTracker) {
        return;
      }

      // Additional safety check for TTS client
      if (!ttsClientRef.current && true) {
        console.warn('⚠️ TTS client not available for navigation start - continuing without voice');
        return;
      }

      try {
        console.log('🎤 Navigation START Effect - alle Bedingungen erfüllt');

        // Cache-Key zur eindeutigen Identifikation dieser Route generieren
        const routeKey = `${route.geometry ? route.geometry.length : 'unknown'}-${Date.now()}`;

        if (routeCacheRef.current !== routeKey) {
          console.log('🧹 NEUE ROUTE ERKANNT - Cache wird geleert');
          console.log('Alte Route:', routeCacheRef.current, '-> Neue Route:', routeKey);

          // KOMPLETTE Cache-Löschung für neue Route
          if (ttsClientRef.current && typeof ttsClientRef.current.clearCache === 'function') {
            try {
              ttsClientRef.current.clearCache();
              console.log('✅ TTS Cache erfolgreich geleert für neue Route');
            } catch (error) {
              console.error('❌ Cache-Löschung fehlgeschlagen:', error);
            }
          }

          routeCacheRef.current = routeKey;
          hasAnnouncedStartRef.current = false;
          setHasAnnouncedStart(false);
        }

        if (!hasAnnouncedStartRef.current) {
          hasAnnouncedStartRef.current = true;
          setHasAnnouncedStart(true);

          // CHECK: Fallback reason announcement FIRST if Google Directions was used
          if (route.fallbackReason && ttsClientRef.current) {
            try {
              console.log('🌐 ANNOUNCING GOOGLE FALLBACK:', route.fallbackReason);
              await ttsClientRef.current.speak(route.fallbackReason, 'info');

              // Short pause before main navigation announcement
              await new Promise(resolve => setTimeout(resolve, 1500));
            } catch (error) {
              console.error('❌ Fallback announcement error:', error);
            }
          }

          // CRITICAL FIX: Calculate REAL distance from current position to first waypoint
          let firstInstruction = null;
          let actualDistance = null;

          // Log route data for debugging
          console.log('🔍 ROUTE DEBUG:', {
            hasInstructions: !!(route.instructions && route.instructions.length > 0),
            instructionCount: route.instructions?.length || 0,
            firstInstructionRaw: route.instructions?.[0],
            fallbackReason: route.fallbackReason || 'none',
            hasGeometry: !!(route.geometry && route.geometry.length > 0),
            currentPosition: currentPosition?.position
          });

          // Calculate ACTUAL distance to first route point
          if (route.geometry && route.geometry.length > 1 && currentPosition) {
            const firstRoutePoint = {
              lat: route.geometry[1][1], // Skip starting point, get first real waypoint
              lng: route.geometry[1][0]
            };

            const currentPos = currentPosition.position;

            // Calculate real distance using haversine formula
            const R = 6371e3; // Earth radius in meters
            const φ1 = currentPos.lat * Math.PI/180;
            const φ2 = firstRoutePoint.lat * Math.PI/180;
            const Δφ = (firstRoutePoint.lat - currentPos.lat) * Math.PI/180;
            const Δλ = (firstRoutePoint.lng - currentPos.lng) * Math.PI/180;

            const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                      Math.cos(φ1) * Math.cos(φ2) *
                      Math.sin(Δλ/2) * Math.sin(Δλ/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            actualDistance = Math.round(R * c); // Distance in meters

            console.log('📏 REAL DISTANCE CALCULATION:', {
              currentPos,
              firstRoutePoint,
              calculatedDistance: actualDistance + 'm',
              geometryPoints: route.geometry.length
            });
          }

          // Extract first instruction from current route - NO CACHING
          if (route.instructions && route.instructions.length > 0) {
            const firstInstructionData = route.instructions[0];

            if (typeof firstInstructionData === 'string') {
              firstInstruction = firstInstructionData;
            } else if (firstInstructionData && firstInstructionData.instruction) {
              // CRITICAL FIX: Translate Google Directions instructions to German for TTS
              const originalInstruction = firstInstructionData.instruction;
              firstInstruction = translateInstruction(originalInstruction, currentLanguage);

              console.log('🌐 INSTRUCTION TRANSLATION:', {
                original: originalInstruction,
                translated: firstInstruction,
                method: route.method || 'unknown'
              });

              // REPLACE any distance in the instruction with ACTUAL calculated distance
              if (firstInstruction && actualDistance !== null) {
                // Remove any existing distance info and replace with real calculation
                firstInstruction = firstInstruction.replace(/\d+\s*(m|meter|meters|km|kilometer|kilometers)/gi, '');
                firstInstruction = `${actualDistance}m ${firstInstruction.trim()}`;

                console.log('✅ DISTANCE CORRECTED INSTRUCTION:', {
                  originalInstruction: firstInstructionData.instruction,
                  correctedInstruction: firstInstruction,
                  realDistance: actualDistance + 'm'
                });
              } else {
                console.log('✅ EXTRACTED FIRST INSTRUCTION (no distance correction):', firstInstruction);
              }
            }
          }

          // NO FALLBACK to routeTracker - use ONLY current route data
          if (!firstInstruction) {
            console.error('❌ NO FIRST INSTRUCTION FOUND in route data');
            console.log('Route instructions:', route.instructions);
          }

          if (firstInstruction && ttsClientRef.current) {
            // Use the ACTUAL calculated route instruction - NEVER cached
            const realStartAnnouncement = `Navigation gestartet. ${firstInstruction}`;

            try {
              console.log('🎤 ABOUT TO ANNOUNCE:', {
                instruction: firstInstruction,
                fullText: realStartAnnouncement,
                routeKey: routeKey,
                timestamp: new Date().toISOString(),
                fallbackUsed: !!route.fallbackReason
              });

              await ttsClientRef.current.speak(realStartAnnouncement, 'start');

              console.log('✅ SUCCESSFULLY ANNOUNCED FRESH INSTRUCTION');
              console.log('🎤 Route-specific instruction:', firstInstruction);
              console.log('🎤 Full announcement text:', realStartAnnouncement);
            } catch (error) {
              console.error('❌ Navigation Start TTS Error:', error);
              setNavigationError('Voice announcement failed - navigation continues');
            }

            // Set up the announcement tracking with CORRECT initial state
            setTimeout(() => {
              lastAnnouncementRef.current = { step: 0, distance: 999, time: Date.now() };
            }, 1500);

          } else if (ttsClientRef.current) {
            // Fallback if no instruction available
            const fallbackAnnouncement = `Navigation gestartet. Folgen Sie den Anweisungen.`;
            try {
              await ttsClientRef.current.speak(fallbackAnnouncement, 'start');
            } catch (error) {
              console.error('❌ Navigation Start TTS Error:', error);
              setNavigationError('Voice announcement failed - navigation continues');
            }
            console.log('🎤 ElevenLabs Fallback Start');
          }
        }
      } catch (error) {
        console.error('❌ Critical error in navigation start:', error);
        setNavigationError('Navigation start error - check console');
        // Reset state to prevent infinite loops
        hasAnnouncedStartRef.current = false;
        setHasAnnouncedStart(false);
      }
    };

    handleNavigationStart().catch(error => {
      console.error('❌ Unhandled navigation start error:', error);
      setNavigationError('Navigation initialization failed');
    });
  }, [isNavigating, routeTracker, hasAnnouncedStart, true, route]);

  // Update route progress when position changes - CRITICAL for live navigation
  useEffect(() => {
    const updateProgress = async () => {
      if (!currentPosition || !isNavigating) return;

      let progress;
      try {
        // Single call to route tracker - prevents multiple rapid updates
        progress = routeTracker.updatePosition(currentPosition.position);
        setRouteProgress(progress);
      } catch (error) {
        console.error('❌ Error updating route position:', error);
        setNavigationError('Route tracking failed');
        return;
      }

      // ElevenLabs TTS Voice guidance with loop prevention
      const currentInstruction = routeTracker.getCurrentInstruction();
      if (currentInstruction && ttsClientRef.current && progress.distanceToNext > 0.01) { // Minimum 10m for announcements
        const lastAnnouncement = lastAnnouncementRef.current;
        const currentTime = Date.now();
        const timeSinceLastAnnouncement = currentTime - lastAnnouncement.time;
        const distanceChange = Math.abs(progress.distanceToNext - lastAnnouncement.distance);

        // FIXED: Prevent voice loops with better conditions
        // Only announce if:
        // 1. Step changed (most important) OR
        // 2. More than 30 seconds passed AND significant distance change OR
        // 3. Very significant distance change (>100m) - user made real progress
        const shouldAnnounce =
          progress.currentStep !== lastAnnouncement.step ||
          (timeSinceLastAnnouncement > 30000 && distanceChange > 0.02) ||
          distanceChange > 0.1; // 100m significant change to prevent loops

        if (shouldAnnounce) {
          const distanceInMeters = progress.distanceToNext * 1000;

          // Format German navigation announcement
          let announcement = '';
          if (distanceInMeters > 200) {
            announcement = `In ${Math.round(distanceInMeters)} Metern: ${currentInstruction.instruction}`;
          } else if (distanceInMeters > 50) {
            announcement = `In ${Math.round(distanceInMeters)} Metern: ${currentInstruction.instruction}`;
          } else if (distanceInMeters > 20) {
            announcement = `Gleich: ${currentInstruction.instruction}`;
          } else {
            announcement = currentInstruction.instruction;
          }

          // Use ElevenLabs TTS for high-quality navigation
          try {
            await ttsClientRef.current.speak(announcement, 'direction');
            lastAnnouncementRef.current = {
              step: progress.currentStep,
              distance: progress.distanceToNext,
              time: currentTime
            };

            console.log('🎤 ElevenLabs Navigation:', {
              instruction: currentInstruction.instruction,
              distance: Math.round(distanceInMeters) + 'm',
              announcement,
              reason: progress.currentStep !== lastAnnouncement.step ? 'step_change' :
                      timeSinceLastAnnouncement > 30000 ? 'time_interval' : 'distance_change'
            });
          } catch (error) {
            console.error('❌ Navigation TTS Error:', error);
            setNavigationError('Voice guidance failed');
          }
        }
      }

      // Debug log for route progress updates
      if (gpsUpdateCount % 10 === 0) { // Log every 10th update to prevent spam
        console.log('🗺️ Route Progress Update:', {
          distanceRemaining: `${progress.distanceRemaining.toFixed(2)}km`,
          timeRemaining: `${Math.round(progress.estimatedTimeRemaining / 60)}min`,
          percentComplete: `${progress.percentComplete.toFixed(1)}%`,
          currentSpeed: `${progress.currentSpeed}km/h`
        });
      }

      // Update step index if it changed (critical for UI updates)
      if (progress.currentStep !== currentStepIndex) {
        setCurrentStepIndex(progress.currentStep);
      }

      // Update off-route status and check for automatic rerouting
      if (progress.isOffRoute && !isOffRoute) {
        setIsOffRoute(true);
        setOffRouteCount(prev => prev + 1);
      } else if (!progress.isOffRoute && isOffRoute) {
        setIsOffRoute(false);
        setOffRouteCount(0); // Reset counter when back on route
      }

      // FIXED: Enhanced automatic rerouting with immediate trigger
      if (progress.isOffRoute) {
        console.log('🚨 OFF-ROUTE DETECTED:', {
          offRouteDistance: Math.round((progress.distanceToNext || 0) * 1000) + 'm',
          offRouteCount: offRouteCount,
          isRerouting: isRerouting
        });

        const rerouteDecision = campgroundRerouteDetector.shouldReroute(
          currentPosition.position,
          route,
          isNavigating
        );

        // TRIGGER REROUTING IMMEDIATELY - don't wait for multiple off-route detections
        if (rerouteDecision.shouldReroute && !isRerouting) {
          console.log('🏕️ IMMEDIATE REROUTING TRIGGERED:', rerouteDecision.reason);

          // Clear voice announcements to prevent loops
          if (ttsClientRef.current) {
            try {
              ttsClientRef.current.clearCache();
              console.log('🧹 Cleared TTS cache before rerouting to prevent loops');
            } catch (error) {
              console.warn('TTS cache clear warning:', error);
            }
          }

          // Reset announcement tracking to prevent voice loops
          lastAnnouncementRef.current = { step: -1, distance: 999, time: 0 };

          handleAutoReroute(rerouteDecision.distance || 0);
        }
      } else if (!progress.isOffRoute && isOffRoute) {
        // Back on route - reset counters and announcement state
        console.log('✅ BACK ON ROUTE - resetting state');
        setOffRouteCount(0);
        lastAnnouncementRef.current = { step: progress.currentStep, distance: progress.distanceToNext, time: Date.now() };
      }

      // Increment GPS update counter for performance monitoring
      setGpsUpdateCount(prev => prev + 1);
    };

    updateProgress().catch(error => {
      console.error('❌ Error in progress update effect:', error);
      setNavigationError('Progress update failed');
    });
  }, [currentPosition?.timestamp, isNavigating, routeTracker, isOffRoute, currentStepIndex, campgroundRerouteDetector, route, handleAutoReroute]);

  // Navigation instruction updates with comprehensive error handling
  useEffect(() => {
    const handleInstructionUpdates = async () => {
      try {
        if (!isNavigating || !true || !routeTracker || !hasAnnouncedStart) {
          return;
        }

        // Safety check for TTS client
        if (!ttsClientRef.current) {
          console.warn('⚠️ TTS client unavailable for instruction updates');
          return;
        }

        let currentInstruction, progress;

        try {
          currentInstruction = routeTracker.getCurrentInstruction();
          progress = routeTracker.getProgress();
        } catch (error) {
          console.error('❌ Error getting route data:', error);
          setNavigationError('Route tracking error');
          return;
        }

        if (!currentInstruction) return;

        const currentStepIndex = progress?.stepIndex || 0;
        const remainingDistance = progress?.remainingDistance || 0;
        const now = Date.now();

        // Debounce logic: prevent duplicate announcements within 5 seconds
        const lastAnnouncement = lastAnnouncementRef.current;
        if (lastAnnouncement &&
            lastAnnouncement.step === currentStepIndex &&
            Math.abs(lastAnnouncement.distance - remainingDistance) < 10 &&
            now - lastAnnouncement.time < 5000) {
          return;
        }

        // Distance-based announcement logic
        const shouldAnnounce =
          remainingDistance <= 50 && remainingDistance > 5 && // Within 50m but not too close
          (!lastAnnouncement ||
           currentStepIndex > lastAnnouncement.step || // New step
           lastAnnouncement.distance - remainingDistance > 20 || // Significant progress
           now - lastAnnouncement.time > 30000); // 30s since last announcement

        if (shouldAnnounce && currentInstruction.instruction) {
          const announcement = `In ${Math.round(remainingDistance)} Metern: ${currentInstruction.instruction}`;

          try {
            await ttsClientRef.current.speak(announcement, 'instruction');

            lastAnnouncementRef.current = {
              step: currentStepIndex,
              distance: remainingDistance,
              time: now
            };

            console.log('🎤 ElevenLabs Instruction:', {
              step: currentStepIndex,
              distance: remainingDistance,
              instruction: currentInstruction.instruction,
              announcement
            });
          } catch (error) {
            console.error('❌ Instruction TTS Error:', error);
            setNavigationError('Voice instruction failed');
          }
        }
      } catch (error) {
        console.error('❌ Critical error in instruction updates:', error);
        setNavigationError('Navigation instruction system error');
      }
    };

    handleInstructionUpdates().catch(error => {
      console.error('❌ Unhandled instruction update error:', error);
    });
  }, [isNavigating, routeTracker, hasAnnouncedStart, true]);

  // Get current instruction from route tracker
  const currentInstruction = routeTracker.getCurrentInstruction();
  const nextInstruction = routeTracker.getNextInstruction();

  // Save route for offline access
  const saveRouteOffline = useCallback(async () => {
    try {
      const routeId = `route_${Date.now()}`;
      await offlineStorage.saveRoute(routeId, route, `Navigation to ${route.instructions[route.instructions.length - 1] || 'destination'}`);
      console.log('Route saved offline successfully');
    } catch (error) {
      console.error('Failed to save route offline:', error);
    }
  }, [route]);

  const handleEndNavigation = () => {
    setIsNavigating(false);
    setHasAnnouncedStart(false); // Reset für nächste Navigation

    // CRITICAL: Kompletter TTS Cache Reset bei Navigation-Ende
    if (ttsClientRef.current) {
      ttsClientRef.current.clearCache();
      console.log('🧹 GROUND NAVIGATION END: TTS Cache KOMPLETT geleert');
    }

    onEndNavigation();
  };

  // Calculate REAL distance to next instruction using current GPS position
  const calculateRealDistanceToNextInstruction = () => {
    if (!currentPosition || !route.geometry || route.geometry.length === 0) {
      return currentInstruction?.distance || '0m';
    }

    try {
      // Get current GPS position
      const currentLat = currentPosition.position.lat;
      const currentLng = currentPosition.position.lng;

      // Find next significant waypoint in route geometry
      let nearestPointIndex = 0;
      let minDistance = Infinity;

      // Find closest point on route to current position
      for (let i = 0; i < route.geometry.length; i++) {
        const [routeLng, routeLat] = route.geometry[i];
        const distance = calculateDistanceBetweenPoints(
          currentLat, currentLng, routeLat, routeLng
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearestPointIndex = i;
        }
      }

      // Calculate distance to next instruction waypoint (ahead on route)
      let targetIndex = Math.min(nearestPointIndex + 10, route.geometry.length - 1);
      const [targetLng, targetLat] = route.geometry[targetIndex];

      const realDistance = calculateDistanceBetweenPoints(
        currentLat, currentLng, targetLat, targetLng
      );

      return formatDistance(realDistance / 1000); // Convert to km for formatDistance
    } catch (error) {
      console.error('❌ Real distance calculation error:', error);
      return currentInstruction?.distance || '0m';
    }
  };

  // Helper function to calculate distance between two GPS points
  const calculateDistanceBetweenPoints = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  };

  // Format remaining distance and time from route progress
  const formatDistance = (km: number) => {
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)}km`;
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.ceil(seconds / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  if (!isVisible || !currentInstruction) return null;

  return (
    <div className="absolute top-20 left-4 right-4 z-30">
      <div
        className="p-4 rounded-2xl border"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(40px) saturate(200%) brightness(1.1)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 8px 32px rgba(31, 38, 135, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          WebkitBackdropFilter: 'blur(40px) saturate(200%) brightness(1.1)'
        }}
      >
        {/* Primary Instruction with Icon */}
        <div className="flex items-center gap-4 mb-4">
          <div
            className="text-white rounded-lg p-3 flex-shrink-0"
            style={{
              background: 'rgba(59, 130, 246, 0.8)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <Navigation className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h2
              className="text-xl font-bold leading-tight"
              style={{
                color: '#1f2937',
                textShadow: '0 1px 3px rgba(255, 255, 255, 0.8)'
              }}
            >
              {translateInstruction(currentInstruction.instruction, currentLanguage)}
            </h2>
            <p
              className="text-lg font-medium"
              style={{
                color: '#374151',
                textShadow: '0 1px 2px rgba(255, 255, 255, 0.6)'
              }}
            >
              In {calculateRealDistanceToNextInstruction()}
            </p>
          </div>
          {isOffRoute && (
            <div
              className="flex items-center space-x-1 px-2 py-1 rounded-lg"
              style={{
                background: 'rgba(239, 68, 68, 0.8)',
                color: '#ffffff',
                backdropFilter: 'blur(10px)'
              }}
            >
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-medium">{getTranslation(currentLanguage, 'navigation.offRoute')}</span>
            </div>
          )}
        </div>

        {/* GPS Error Warning */}
        {gpsError && (
          <div className="mb-3 p-3 bg-red-50/80 backdrop-blur-sm border border-red-200/50 rounded-lg">
            <div className="text-sm text-red-800 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2" />
              {gpsError}
            </div>
          </div>
        )}

        {/* Progress Bar & ETA with live updates */}
        {routeProgress && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span className="font-medium">
                Verbleibend: {formatDistance(routeProgress.distanceRemaining)}
              </span>
              <span>
                Zeit: {formatDuration(routeProgress.estimatedTimeRemaining)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Geschw: {routeProgress.currentSpeed.toFixed(1)} km/h</span>
              <span>{routeProgress.percentComplete.toFixed(0)}% geschafft</span>
            </div>
            <div className="w-full bg-gray-200/50 rounded-full h-1.5">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${routeProgress.percentComplete}%` }}
              />
            </div>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <button
              onClick={async () => {
                if (ttsClientRef.current) {
                  console.log('🧪 Testing ElevenLabs Navigation System with User Interaction...');

                  // CRITICAL: User interaction enables audio playback
                  try {
                    // Test immediate audio playback (user gesture required)
                    console.log('🎤 Testing immediate TTS with user gesture...');
                    await ttsClientRef.current.speak('TTS Test erfolgreich. Navigation kann starten.', 'start');

                    console.log('✅ FIRST TTS SUCCESS - Now testing navigation sequence...');

                    // Now test the full navigation sequence
                    setTimeout(async () => {
                      try {
                        await ttsClientRef.current?.speak('Navigation gestartet. Geradeaus weiterfahren für 200 Meter', 'start');
                      } catch (error) {
                        console.error('❌ Navigation start TTS failed:', error);
                      }
                    }, 1500);

                    setTimeout(async () => {
                      try {
                        await ttsClientRef.current?.speak('In 100 Metern links abbiegen', 'direction');
                      } catch (error) {
                        console.error('❌ Direction TTS failed:', error);
                      }
                    }, 4000);

                    setTimeout(async () => {
                      try {
                        await ttsClientRef.current?.speak('Gleich links abbiegen', 'direction');
                      } catch (error) {
                        console.error('❌ Direction TTS failed:', error);
                      }
                    }, 6000);

                    setTimeout(async () => {
                      try {
                        await ttsClientRef.current?.speak('Links abbiegen auf Mariapolderseweg', 'direction');
                      } catch (error) {
                        console.error('❌ Direction TTS failed:', error);
                      }
                    }, 8000);

                    setTimeout(async () => {
                      try {
                        await ttsClientRef.current?.speak('Sie haben Ihr Ziel erreicht', 'arrival');
                      } catch (error) {
                        console.error('❌ Arrival TTS failed:', error);
                      }
                    }, 10000);

                    console.log('✅ ElevenLabs Navigation test sequence started with user gesture');
                  } catch (error) {
                    console.error('❌ Initial TTS test failed:', error);
                    setNavigationError(`TTS Test Failed: ${error.message}`);
                  }
                } else {
                  console.error('❌ TTS Client not available for testing');
                  setNavigationError('TTS Client not initialized - refresh page');
                }
              }}
              className="p-3 rounded-full transition-all duration-200 hover:scale-105"
              style={{
                background: 'rgba(59, 130, 246, 0.2)',
                backdropFilter: 'blur(30px)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)'
              }}
              title="Test Navigation & Voice - CLICK REQUIRED for browser audio permission"
            >
              <span className="text-sm font-bold text-blue-600">🧪 TTS</span>
            </button>

            <button
              onClick={() => setShowPerformanceMonitor(!showPerformanceMonitor)}
              className="p-3 rounded-full transition-all duration-200"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(30px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)'
              }}
            >
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <button
            onClick={handleEndNavigation}
            className="px-4 py-2 rounded-xl font-medium transition-all duration-200 flex items-center space-x-2"
            style={{
              background: 'rgba(239, 68, 68, 0.7)',
              backdropFilter: 'blur(20px)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <Square className="w-4 h-4" />
            <span>{getTranslation(currentLanguage, 'navigation.end')}</span>
          </button>
        </div>
      </div>

      {/* Display navigation error if present */}
      {navigationError && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-2 rounded-md shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">⚠️ {navigationError}</span>
            <button
              onClick={() => setNavigationError(null)}
              className="text-yellow-700 hover:text-yellow-900 text-sm font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Performance Monitor */}
      <NavigationPerformanceMonitor
        gpsAccuracy={currentPosition?.accuracy || 0}
        adaptiveInterval={1000}
        isVisible={showPerformanceMonitor}
        currentSpeed={routeProgress?.currentSpeed || 0}
        averageSpeed={routeProgress?.averageSpeed || 0}
        updateCount={gpsUpdateCount}
      />
    </div>
  );
};