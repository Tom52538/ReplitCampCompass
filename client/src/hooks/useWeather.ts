import { useQuery } from '@tanstack/react-query';
import { WeatherData } from '@/types/navigation';

export const useWeather = (lat: number, lng: number) => {
  // Balanced coordinate rounding for accurate location while preventing excessive queries
  const stableCoordinates = {
    lat: Math.round(lat * 1000) / 1000, // Round to 3 decimal places (~100m accuracy)
    lng: Math.round(lng * 1000) / 1000
  };

  return useQuery({
    queryKey: ['/api/weather', stableCoordinates.lat, stableCoordinates.lng], // Use stable coordinates
    queryFn: async () => {
      console.group('🌤️ WEATHER HOOK: API Request');
      console.log('📡 Request Details:', {
        originalCoordinates: { lat, lng },
        stableCoordinates,
        coordinateRounding: {
          latChange: Math.abs(lat - stableCoordinates.lat),
          lngChange: Math.abs(lng - stableCoordinates.lng)
        },
        url: `/api/weather?lat=${stableCoordinates.lat}&lng=${stableCoordinates.lng}`,
        timestamp: new Date().toISOString(),
        queryKey: ['/api/weather', stableCoordinates.lat, stableCoordinates.lng],
        preventsDuplicateRequests: true
      });

      const startTime = performance.now();

      try {
        const response = await fetch(`/api/weather?lat=${stableCoordinates.lat}&lng=${stableCoordinates.lng}`);
        const endTime = performance.now();

        console.log('🌐 Network Response:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          responseTime: `${(endTime - startTime).toFixed(2)}ms`,
          headers: Object.fromEntries(response.headers.entries()),
          timestamp: new Date().toISOString(),
          originalCoords: { lat, lng },
          stableCoords: stableCoordinates
        });

        if (!response.ok) {
          console.error('❌ WEATHER HOOK: Fetch failed', {
            status: response.status,
            statusText: response.statusText,
            coordinates: { lat, lng },
            timestamp: new Date().toISOString()
          });
          throw new Error(`Failed to fetch weather data: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ WEATHER HOOK: Data received successfully', {
          data,
          dataSize: JSON.stringify(data).length,
          hasTemperature: 'temperature' in data,
          hasCondition: 'condition' in data,
          timestamp: new Date().toISOString()
        });

        console.groupEnd();
        return data as WeatherData;
      } catch (error) {
        console.error('💥 WEATHER HOOK: Request failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          coordinates: { lat, lng },
          timestamp: new Date().toISOString()
        });
        console.groupEnd();
        throw error;
      }
    },
    staleTime: 15 * 60 * 1000, // 15 minutes - reduce API calls
    refetchInterval: 15 * 60 * 1000, // Auto-refetch every 15 minutes
    refetchOnWindowFocus: false, // Disable unnecessary refetching
    enabled: !!(lat && lng),
    retry: (failureCount, error) => {
      // Don't retry if it's a network error that might indicate app issues
      if (error?.message?.includes('fetch') && failureCount > 1) {
        console.log('🚨 Weather fetch failing repeatedly - may indicate app instability');
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    onError: (error) => {
      console.error('🚨 Weather hook error:', error);
      // Clear weather cache on persistent errors
      if (error?.message?.includes('fetch')) {
        localStorage.removeItem('weather-cache');
      }
    },
  });
};

export const useWeatherAlerts = (lat: number, lng: number) => {
  // More precise coordinates for alerts to match forecast accuracy
  const stableCoordinates = {
    lat: Math.round(lat * 1000) / 1000, // Round to 3 decimal places (~100m accuracy)
    lng: Math.round(lng * 1000) / 1000
  };

  return useQuery({
    queryKey: ['/api/weather/alerts', stableCoordinates.lat, stableCoordinates.lng],
    queryFn: async () => {
      console.group('🚨 WEATHER ALERTS HOOK: API Request');
      console.log('📡 Alerts Request Details:', {
        coordinates: { lat, lng },
        roundedCoordinates: { lat: Math.round(lat * 100), lng: Math.round(lng * 100) },
        url: `/api/weather/alerts?lat=${lat}&lng=${lng}`,
        timestamp: new Date().toISOString()
      });

      const startTime = performance.now();

      try {
        const response = await fetch(`/api/weather/alerts?lat=${stableCoordinates.lat}&lng=${stableCoordinates.lng}`);
        const endTime = performance.now();

        console.log('🌐 Alerts Network Response:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          responseTime: `${(endTime - startTime).toFixed(2)}ms`,
          timestamp: new Date().toISOString()
        });

        if (!response.ok) {
          console.error('❌ WEATHER ALERTS HOOK: Fetch failed', {
            status: response.status,
            statusText: response.statusText,
            coordinates: { lat, lng },
            timestamp: new Date().toISOString()
          });
          throw new Error(`Failed to fetch weather alerts: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ WEATHER ALERTS HOOK: Data received successfully', {
          data,
          alertCount: data.alerts ? data.alerts.length : 0,
          timestamp: new Date().toISOString()
        });

        console.groupEnd();
        return data;
      } catch (error) {
        console.error('💥 WEATHER ALERTS HOOK: Request failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          coordinates: { lat, lng },
          timestamp: new Date().toISOString()
        });
        console.groupEnd();
        throw error;
      }
    },
    staleTime: 60 * 60 * 1000, // 60 minutes - alerts change very rarely
    refetchInterval: 60 * 60 * 1000, // Auto-refetch every 60 minutes  
    refetchOnWindowFocus: false, // Don't refetch alerts on focus
    enabled: !!(lat && lng),
    retry: (failureCount, error) => {
      if (error?.message?.includes('fetch') && failureCount > 1) {
        console.log('🚨 Weather alerts fetch failing repeatedly');
        return false;
      }
      return failureCount < 2; // Fewer retries for alerts
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    onError: (error) => {
      console.error('🚨 Weather alerts hook error:', error);
    },
  });
};

export const useWeatherForecast = (lat: number, lng: number) => {
  // Coordinate stability for forecast requests - use higher precision
  const stableCoordinates = {
    lat: Math.round(lat * 1000) / 1000, // Round to 3 decimal places (~100m accuracy)
    lng: Math.round(lng * 1000) / 1000
  };

  return useQuery({
    queryKey: ['/api/weather/forecast', stableCoordinates.lat, stableCoordinates.lng],
    queryFn: async () => {
      console.group('🌦️ WEATHER FORECAST HOOK: API Request');
      console.log('📡 Forecast Request Details:', {
        originalCoordinates: { lat, lng },
        stableCoordinates,
        coordinateStabilization: {
          latChange: Math.abs(lat - stableCoordinates.lat),
          lngChange: Math.abs(lng - stableCoordinates.lng)
        },
        url: `/api/weather/forecast?lat=${stableCoordinates.lat}&lng=${stableCoordinates.lng}`,
        timestamp: new Date().toISOString(),
        queryKey: ['/api/weather/forecast', stableCoordinates.lat, stableCoordinates.lng]
      });

      const startTime = performance.now();

      try {
        const response = await fetch(`/api/weather/forecast?lat=${stableCoordinates.lat}&lng=${stableCoordinates.lng}`);
        const endTime = performance.now();

        console.log('🌐 Forecast Network Response:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          responseTime: `${(endTime - startTime).toFixed(2)}ms`,
          headers: Object.fromEntries(response.headers.entries()),
          timestamp: new Date().toISOString()
        });

        if (!response.ok) {
          console.error('❌ WEATHER FORECAST HOOK: Fetch failed', {
            status: response.status,
            statusText: response.statusText,
            coordinates: { lat, lng },
            timestamp: new Date().toISOString()
          });
          throw new Error(`Failed to fetch weather forecast: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ WEATHER FORECAST HOOK: Data received successfully', {
          data,
          dataSize: JSON.stringify(data).length,
          hasForecast: 'forecast' in data,
          forecastCount: data.forecast ? data.forecast.length : 0,
          timestamp: new Date().toISOString()
        });

        console.groupEnd();
        return data;
      } catch (error) {
        console.error('💥 WEATHER FORECAST HOOK: Request failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          coordinates: { lat, lng },
          timestamp: new Date().toISOString()
        });
        console.groupEnd();
        throw error;
      }
    },
    staleTime: 15 * 60 * 1000, // 15 minutes - more frequent updates
    refetchInterval: 15 * 60 * 1000, // Auto-refetch every 15 minutes
    refetchOnWindowFocus: true, // Refetch when window gains focus
    enabled: !!(lat && lng),
    retry: (failureCount, error) => {
      if (error?.message?.includes('fetch') && failureCount > 1) {
        console.log('🚨 Forecast fetch failing repeatedly - may indicate app instability');
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    onError: (error) => {
      console.error('🚨 Forecast hook error:', error);
      if (error?.message?.includes('fetch')) {
        localStorage.removeItem('forecast-cache');
      }
    },
  });
};