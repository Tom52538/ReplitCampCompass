import { useState, useEffect } from 'react';
import { Coordinates, TestSite, TEST_SITES } from '@/types/navigation';

interface UseLocationProps {
  currentSite: TestSite;
}

export const useLocation = (props?: UseLocationProps) => {
  // Mock coordinates for Starting Point POI (on network node near reception)
  const mockCoordinates: Record<string, Coordinates> = {
    kamperland: { lat: 51.5896335, lng: 3.7216451 }, // Exactly at Starting Point POI on road network
    zuhause: { lat: 51.00169448656764, lng: 6.051019009670205 },
    default: { lat: 51.5896335, lng: 3.7216451 } // Exactly at Starting Point POI on road network
  };

  const [currentSite, setCurrentSite] = useState<string>(
    localStorage.getItem('selected-site') || 'kamperland'
  );
  const [currentPosition, setCurrentPosition] = useState<Coordinates>(
    mockCoordinates[currentSite] || mockCoordinates.default
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useRealGPS, setUseRealGPS] = useState(false); // Start with Mock GPS
  const [watchId, setWatchId] = useState<number | undefined>(undefined);

  console.log(`🔍 GPS DEBUG: useLocation initialized - Site: ${currentSite}, UseRealGPS: ${useRealGPS}, Position:`, currentPosition);

  // Listen for site changes in localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const newSite = localStorage.getItem('selected-site') || 'kamperland';
      // Only log when location actually changes to prevent spam
      if (currentSite !== newSite) {
        console.log('🔍 GPS DEBUG: Location changed from:', currentSite, 'to:', newSite);
      }

      if (newSite !== currentSite) {
        console.log(`🔄 SITE CHANGE DETECTED: ${currentSite} -> ${newSite}`);
        setCurrentSite(newSite);

        // Always update position for mock coordinates when site changes
        // (Real GPS will override this if active)
        const newCoords = mockCoordinates[newSite] || mockCoordinates.default;
        console.log(`🎯 SITE CHANGE: Updating position for ${newSite}:`, newCoords);
        setCurrentPosition(newCoords);
      }
    };

    // Check immediately on mount
    const initialSite = localStorage.getItem('selected-site') || 'kamperland';
    if (initialSite !== currentSite) {
      console.log(`🚀 INITIAL SETUP: Setting site to ${initialSite}`);
      setCurrentSite(initialSite);

      if (!useRealGPS) {
        const initialCoords = mockCoordinates[initialSite] || mockCoordinates.default;
        console.log(`🚀 INITIAL POSITION (Mock): Setting to`, initialCoords);
        setCurrentPosition(initialCoords);
      }
    }

    window.addEventListener('storage', handleStorageChange);
    // Reduced interval frequency for better performance
    const interval = setInterval(handleStorageChange, 2000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [currentSite, useRealGPS]);

  // GPS mode effect
  useEffect(() => {
    console.log(`🚨 GPS MODE EFFECT: useRealGPS=${useRealGPS}, currentSite=${currentSite}`);
    let activeWatchId: number | undefined;

    // Clear existing GPS watch
    if (watchId !== undefined) {
      try {
        if (navigator.geolocation) {
          navigator.geolocation.clearWatch(watchId);
          console.log(`🛑 GPS Watch Cleared: ${watchId}`);
        }
      } catch (e) {
        console.warn('Error clearing GPS watch:', e);
      }
      setWatchId(undefined);
    }

    if (useRealGPS) {
      // Real GPS mode
      if (!navigator.geolocation) {
        setError('Geolocation not supported');
        return;
      }

      try {
        activeWatchId = navigator.geolocation.watchPosition(
          (position) => {
            const coords: Coordinates = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };

            console.log(`🛰️ REAL GPS UPDATE:`, coords);
            setCurrentPosition(coords);
            setError(null);
          },
          (error) => {
            console.warn('🛰️ Real GPS Error:', error.message);
            
            // Detailed error message based on error type
            let errorMessage = 'GPS access failed';
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage = 'GPS permission denied. Please allow location access in your browser.';
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage = 'GPS signal unavailable. Check your device settings.';
                break;
              case error.TIMEOUT:
                errorMessage = 'GPS timeout. Please try again.';
                break;
              default:
                errorMessage = `GPS error: ${error.message}`;
            }
            
            // NO auto-fallback - user has full control
            setError(errorMessage);
            console.log('💡 Switch to Mock GPS if needed via toggle');
          },
          {
            enableHighAccuracy: true,
            timeout: 30000, // Increased timeout for better compatibility
            maximumAge: 10000, // Allow slightly older positions
          }
        );

        console.log(`🔍 GPS DEBUG: Started GPS watch ${activeWatchId}`);
        setWatchId(activeWatchId);
      } catch (e) {
        console.error('Failed to start GPS:', e);
        setError('Failed to start GPS tracking');
      }
    } else {
      // Mock GPS mode - IMMEDIATELY set mock coordinates
      const mockCoords = mockCoordinates[currentSite] || mockCoordinates.default;

      console.log(`🔒 MOCK GPS MODE ACTIVATED for ${currentSite}:`, mockCoords);
      setCurrentPosition(mockCoords);
      setError(null);
    }

    // CRITICAL: Cleanup function must capture the ACTIVE watchId
    return () => {
      if (activeWatchId !== undefined) {
        try {
          if (navigator.geolocation) {
            navigator.geolocation.clearWatch(activeWatchId);
            console.log(`🔥 CLEANUP: GPS Watch ${activeWatchId} cleared on unmount/change`);
          }
        } catch (e) {
          console.warn('Cleanup error:', e);
        }
      }
    };
  }, [useRealGPS, currentSite]);

  // Enforce mock position when in mock mode
  useEffect(() => {
    if (!useRealGPS) {
      const expectedCoords = mockCoordinates[currentSite] || mockCoordinates.default;
      const currentCoords = currentPosition;

      const latDiff = Math.abs(currentCoords.lat - expectedCoords.lat);
      const lngDiff = Math.abs(currentCoords.lng - expectedCoords.lng);

      if (latDiff > 0.001 || lngDiff > 0.001) {
        console.log(`🚨 MOCK GPS ENFORCEMENT: Correcting position for ${currentSite}`);
        console.log(`  Current:`, currentCoords);
        console.log(`  Expected:`, expectedCoords);
        setCurrentPosition(expectedCoords);
      }
    }
  }, [currentSite, useRealGPS, currentPosition]);

  const updatePosition = (position: Coordinates) => {
    console.log(`🔍 GPS DEBUG: updatePosition called with:`, position, `useRealGPS: ${useRealGPS}`);

    // Only allow position updates if we're in real GPS mode
    if (useRealGPS) {
      console.log(`🔍 GPS DEBUG: Allowing position update (Real GPS mode)`);
      setCurrentPosition(position);
    } else {
      console.log(`🔍 GPS DEBUG: BLOCKING position update - using mock GPS mode`);
      console.log(`🔍 GPS DEBUG: Keeping mock position:`, mockCoordinates[currentSite] || mockCoordinates.default);
    }
  };

  const getCurrentPosition = (): Promise<Coordinates> => {
    return new Promise((resolve, reject) => {
      // If using mock GPS, return mock coordinates immediately
      if (!useRealGPS) {
        console.log('getCurrentPosition: Using mock coordinates');
        resolve(mockCoordinates[currentSite] || mockCoordinates.default);
        return;
      }

      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      setIsLoading(true);
      setError(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: Coordinates = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCurrentPosition(coords);
          setIsLoading(false);
          resolve(coords);
        },
        (error) => {
          console.warn('Geolocation error:', error);
          setError('GPS access failed');
          setIsLoading(false);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
        }
      );
    });
  };

  const toggleGPS = () => {
    const newGPSState = !useRealGPS;

    console.log(`🎚️ GPS TOGGLE CALLED: ${useRealGPS ? 'Real' : 'Mock'} -> ${newGPSState ? 'Real' : 'Mock'}`);
    console.log(`🎚️ Current site: ${currentSite}`);
    console.log(`🎚️ toggleGPS function executed successfully`);

    // FORCE RESET GPS STATE and CLEAR ANY PREVIOUS ERRORS
    setError(null);
    setUseRealGPS(newGPSState);

    // If switching TO mock GPS, immediately set the mock position
    if (!newGPSState) {
      const mockCoords = mockCoordinates[currentSite] || mockCoordinates.default;
      console.log(`🚨 SWITCHING TO MOCK GPS for ${currentSite}:`, mockCoords);
      setCurrentPosition(mockCoords);
    } else {
      // If switching TO real GPS, trigger real GPS acquisition with permission request
      console.log(`🌍 SWITCHING TO REAL GPS - starting GPS acquisition with permission request`);
      console.log(`🌍 Requesting fresh GPS permission and location...`);
      
      // Force immediate GPS position request
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const coords: Coordinates = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            console.log(`✅ REAL GPS SUCCESS: Got real position:`, coords);
            setCurrentPosition(coords);
            setError(null);
          },
          (error) => {
            console.error('🚨 REAL GPS FAILED:', error.message);
            console.log(`🔄 GPS FAILED - FALLING BACK TO MOCK GPS`);
            setUseRealGPS(false); // Fall back to mock GPS
            const mockCoords = mockCoordinates[currentSite] || mockCoordinates.default;
            setCurrentPosition(mockCoords);
            setError(`GPS access failed: ${error.message}`);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0, // Force fresh location
          }
        );
      }
    }
  };

  return {
    currentPosition,
    isLoading,
    error,
    useRealGPS,
    updatePosition,
    getCurrentPosition,
    toggleGPS,
  };
};