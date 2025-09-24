import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Wind, Droplets, Thermometer, Eye, MapPin } from 'lucide-react';
import { useWeather, useWeatherForecast, useWeatherAlerts } from '@/hooks/useWeather';
import { Coordinates } from '@/types/navigation';
import { useLanguage } from '@/hooks/useLanguage';
import { useLocation } from '@/hooks/useLocation';
import { useScreenSize } from '@/hooks/use-mobile';

interface CampingWeatherWidgetProps {
  // Removed coordinates prop as it's now fetched from useLocation
}

const getWeatherIcon = (condition?: string) => {
  if (!condition) return '☀️';

  const cond = condition.toLowerCase();
  if (cond.includes('clear') || cond.includes('sunny')) return '☀️';
  if (cond.includes('cloud')) return '☁️';
  if (cond.includes('rain') || cond.includes('drizzle')) return '🌧️';
  if (cond.includes('storm') || cond.includes('thunder')) return '⛈️';
  if (cond.includes('snow')) return '❄️';
  if (cond.includes('fog') || cond.includes('mist')) return '🌫️';
  if (cond.includes('wind')) return '💨';
  return '☀️';
};

const getCampingAlerts = (weather: any) => {
  const alerts = [];

  if (weather?.windSpeed > 20) {
    alerts.push({ icon: '💨', text: 'Windig', color: '#f59e0b' });
  }

  if (weather?.temperature < 5) {
    alerts.push({ icon: '🥶', text: 'Kalt', color: '#3b82f6' });
  }

  if (weather?.condition?.toLowerCase().includes('rain')) {
    alerts.push({ icon: '🌧️', text: 'Regen', color: '#3b82f6' });
  }

  if (weather?.condition?.toLowerCase().includes('storm')) {
    alerts.push({ icon: '⛈️', text: 'Sturm', color: '#dc2626' });
  }

  if (weather?.humidity > 80) {
    alerts.push({ icon: '💧', text: 'Feucht', color: '#06b6d4' });
  }

  return alerts;
};

export const CampingWeatherWidget = () => {
  // ALL HOOKS MUST BE DECLARED AT THE TOP BEFORE ANY CONDITIONAL LOGIC
  const { t } = useLanguage();
  const screenSize = useScreenSize();
  const [isExpanded, setIsExpanded] = useState(false);

  // Get location from the custom hook
  const { currentPosition, useRealGPS, toggleGPS } = useLocation();

  const lat = currentPosition?.lat;
  const lng = currentPosition?.lng;

  const hasValidCoords = lat != null && lng != null && !isNaN(lat) && !isNaN(lng);

  // Enhanced logging for GPS synchronization
  console.log('🌤️ WEATHER WIDGET GPS SYNC:', {
    currentPosition,
    useRealGPS,
    hasValidCoords,
    coordinates: { lat, lng },
    timestamp: new Date().toISOString()
  });

  // Weather hooks need to be called unconditionally, using safe coordinates
  const { data: weather, isLoading, error } = useWeather(
    hasValidCoords ? lat : 0,
    hasValidCoords ? lng : 0
  );
  const { data: forecastData, error: forecastError } = useWeatherForecast(
    hasValidCoords ? lat : 0,
    hasValidCoords ? lng : 0
  );

  // Enhanced Weather Alerts with Real API Integration - use safe coordinates
  const { data: alertsData, isLoading: alertsLoading } = useWeatherAlerts(
    hasValidCoords ? lat : 0,
    hasValidCoords ? lng : 0
  );
  const realAlerts = alertsData?.alerts || [];


  // NOW we can do conditional logic after all hooks are declared
  if (!hasValidCoords) {
    console.warn('🚨 Invalid coordinates in weather widget');
    return (
      <div className="bg-orange-500 text-white p-3 rounded-xl">
        <div className="text-sm">GPS Fehler</div>
      </div>
    );
  }

  // Enhanced debug logging with GPS accuracy tracking
  console.group('🌤️ UNIFIED WEATHER WIDGET DEBUG');
  console.log('📍 GPS Coordinates:', {
    latitude: lat,
    longitude: lng,
    accuracy: 'GPS accuracy tracking',
    rounded: {
      lat: Math.round(lat * 1000) / 1000,
      lng: Math.round(lng * 1000) / 1000
    },
    timestamp: new Date().toLocaleTimeString()
  });

  console.log('🌡️ Weather Data State:', {
    weatherData: weather,
    isLoading,
    error: error?.message,
    forecastData,
    forecastError: forecastError?.message,
    realAlerts: realAlerts,
    alertsLoading: alertsLoading,
    timestamp: new Date().toLocaleTimeString()
  });
  console.groupEnd();

  const handleToggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const handleGPSToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('🛰️ Weather Widget: GPS toggle clicked, current mode:', useRealGPS ? 'Real' : 'Mock');
    toggleGPS();
  };

  const translateWeatherCondition = (condition?: string) => {
    if (!condition) return '';

    const translations: { [key: string]: string } = {
      'clear': 'Klar',
      'sunny': 'Sonnig',
      'clouds': 'Wolken',
      'cloudy': 'Bewölkt',
      'partly cloudy': 'Teilweise bewölkt',
      'rain': 'Regen',
      'drizzle': 'Nieselregen',
      'thunderstorm': 'Gewitter',
      'snow': 'Schnee',
      'fog': 'Nebel',
      'mist': 'Dunst'
    };

    return translations[condition.toLowerCase()] || condition;
  };

  const getWeatherGradient = (condition?: string) => {
    switch (condition?.toLowerCase()) {
      case 'clear':
      case 'sunny':
        return 'linear-gradient(135deg, rgba(255, 193, 7, 0.7) 0%, rgba(255, 152, 0, 0.8) 100%)';
      case 'rain':
      case 'drizzle':
        return 'linear-gradient(135deg, rgba(33, 150, 243, 0.7) 0%, rgba(30, 136, 229, 0.8) 100%)';
      case 'clouds':
      case 'cloudy':
        return 'linear-gradient(135deg, rgba(96, 125, 139, 0.7) 0%, rgba(69, 90, 100, 0.8) 100%)';
      case 'snow':
        return 'linear-gradient(135deg, rgba(176, 190, 197, 0.7) 0%, rgba(144, 164, 174, 0.8) 100%)';
      default:
        return 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(37, 99, 235, 0.6) 100%)';
    }
  };

  if (isLoading) {
    return (
      <div
        className="absolute bottom-20 right-4 z-30 p-4"
        style={{
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '20px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          minWidth: '160px'
        }}
      >
        <div className="flex items-center space-x-3">
          <div
            className="w-10 h-10 rounded-full animate-pulse"
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.3)'
            }}
          ></div>
          <div className="flex flex-col space-y-2">
            <div
              className="w-16 h-4 rounded animate-pulse"
              style={{ background: 'rgba(0, 0, 0, 0.1)' }}
            ></div>
            <div
              className="w-20 h-3 rounded animate-pulse"
              style={{ background: 'rgba(0, 0, 0, 0.05)' }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  if (!weather) return null;

  const campingAlerts = getCampingAlerts(weather);

  // Combine local camping alerts with real OpenWeatherMap alerts
  const allAlerts = [...campingAlerts, ...realAlerts];

  // Responsive dimensions and positioning
  const getResponsiveStyles = () => {
    const baseStyles = {
      background: 'rgba(255, 255, 255, 0.15)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: screenSize === 'mobile' ? '16px' : '20px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05)'
    };

    switch (screenSize) {
      case 'mobile':
        return {
          ...baseStyles,
          width: isExpanded ? '280px' : '140px',
          minHeight: isExpanded ? 'auto' : 'auto',
          maxHeight: isExpanded ? '60vh' : 'auto'
        };
      case 'tablet':
        return {
          ...baseStyles,
          width: isExpanded ? '320px' : '150px',
          minHeight: isExpanded ? 'auto' : 'auto'
        };
      default: // desktop
        return {
          ...baseStyles,
          width: isExpanded ? '340px' : '160px',
          minHeight: isExpanded ? '200px' : 'auto'
        };
    }
  };

  const getPositionClasses = () => {
    switch (screenSize) {
      case 'mobile':
        return 'absolute bottom-4 right-2 z-30';
      case 'tablet':
        return 'absolute bottom-6 right-3 z-30';
      default: // desktop
        return 'absolute bottom-8 right-4 z-30';
    }
  };

  const getPaddingClasses = () => {
    switch (screenSize) {
      case 'mobile':
        return 'p-2';
      case 'tablet':
        return 'p-3';
      default: // desktop
        return 'p-4';
    }
  };

  return (
    <div
      className={`${getPositionClasses()} ${getPaddingClasses()} cursor-pointer transition-all duration-500 ease-out hover:scale-[1.02] hover:shadow-2xl ${
        isExpanded && screenSize === 'mobile' ? 'overflow-y-auto' : ''
      }`}
      style={getResponsiveStyles()}
      onClick={handleToggleExpanded}
    >
      {/* Main Weather Display - Modern Glassmorphism */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          <span className={screenSize === 'mobile' ? 'text-base' : 'text-lg'}>
            {getWeatherIcon(weather.icon)}
          </span>
          <div>
            <div className={`font-bold text-white ${
              screenSize === 'mobile' ? 'text-base' : 'text-lg'
            }`}>
              {weather.temperature}°C
            </div>
            <div className={`text-white/80 ${
              screenSize === 'mobile' ? 'text-xs leading-tight' : 'text-xs'
            }`}>
              {translateWeatherCondition(weather.condition)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleToggleExpanded}
            className="text-white/60 hover:text-white transition-colors text-xs"
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {/* Location and GPS Mode Display */}
      <div className={`flex items-center justify-between mb-2 rounded-lg bg-white/10 ${
        screenSize === 'mobile' ? 'py-1 px-1' : 'py-2 px-2'
      }`}>
        <div className="flex items-center gap-1 min-w-0 flex-1">
          <span className="text-xs text-white/90">📍</span>
          <div className="min-w-0 flex-1">
            <div className={`font-medium text-white truncate ${
              screenSize === 'mobile' ? 'text-xs' : 'text-sm'
            }`}>
              {weather.location || 'Unbekannter Ort'}
            </div>
            {screenSize !== 'mobile' && (
              <div className="text-xs text-white/70 truncate">
                {Math.round(currentPosition.lat * 1000) / 1000}, {Math.round(currentPosition.lng * 1000) / 1000}
              </div>
            )}
          </div>
        </div>

        {/* GPS Toggle Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🌤️ WEATHER WIDGET: GPS toggle clicked, current mode:', useRealGPS ? 'Real' : 'Mock');
            console.log('🌤️ WEATHER WIDGET: toggleGPS function type:', typeof toggleGPS);
            console.log('🌤️ WEATHER WIDGET: GPS TOGGLE BUTTON CLICKED - This should work!');
            if (toggleGPS) {
              toggleGPS();
              console.log('🌤️ WEATHER WIDGET: toggleGPS() called successfully');
              console.log('🌤️ WEATHER WIDGET: GPS should now switch modes!');
            } else {
              console.error('🌤️ WEATHER WIDGET: toggleGPS is undefined!');
            }
          }}
          className={`rounded-lg font-medium transition-all duration-200 hover:scale-105 ${
            screenSize === 'mobile' 
              ? 'px-2 py-1 text-xs' 
              : 'px-3 py-1 text-xs'
          } ${
            useRealGPS
              ? 'bg-green-500/80 text-white hover:bg-green-500'
              : 'bg-blue-500/80 text-white hover:bg-blue-500'
          }`}
          title={useRealGPS ? 'Echtes GPS aktiv - Klick für Mock GPS' : 'Mock GPS aktiv - Klick für echtes GPS'}
        >
          {screenSize === 'mobile' 
            ? (useRealGPS ? '📡' : '📍')
            : (useRealGPS ? '📡 REAL GPS' : '📍 MOCK GPS')
          }
        </button>
      </div>

      {/* Expanded 3-Day Forecast - Modern Cards */}
      {isExpanded && forecastData && (
        <div className={screenSize === 'mobile' ? 'mt-2' : 'mt-4'}>
          <div
            className={`font-medium text-gray-700 mb-2 text-center pb-2 ${
              screenSize === 'mobile' ? 'text-xs' : 'text-sm'
            }`}
            style={{
              borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
            }}
          >
            3-Tage Vorhersage
          </div>

          <div className={`grid grid-cols-3 ${
            screenSize === 'mobile' ? 'gap-1' : 'gap-3'
          }`}>
            {/* Today */}
            {forecastData.today && (
              <div
                className={`flex flex-col items-center text-center transition-all duration-300 hover:scale-105 ${
                  screenSize === 'mobile' ? 'p-2' : 'p-3'
                }`}
                style={{
                  background: 'rgba(255, 255, 255, 0.3)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  borderRadius: screenSize === 'mobile' ? '12px' : '16px'
                }}
              >
                <div className="text-xs font-medium text-gray-600 mb-1">Heute</div>
                <div className={`mb-1 ${screenSize === 'mobile' ? 'text-lg' : 'text-xl'}`}>
                  {getWeatherIcon(forecastData.today.icon)}
                </div>
                <div className={`text-gray-800 font-semibold ${
                  screenSize === 'mobile' ? 'text-xs' : 'text-sm'
                }`}>
                  {forecastData.today.temp}°
                </div>
              </div>
            )}

            {/* Tomorrow */}
            {forecastData.tomorrow && (
              <div
                className={`flex flex-col items-center text-center transition-all duration-300 hover:scale-105 ${
                  screenSize === 'mobile' ? 'p-2' : 'p-3'
                }`}
                style={{
                  background: 'rgba(255, 255, 255, 0.3)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  borderRadius: screenSize === 'mobile' ? '12px' : '16px'
                }}
              >
                <div className="text-xs font-medium text-gray-600 mb-1">Morgen</div>
                <div className={`mb-1 ${screenSize === 'mobile' ? 'text-lg' : 'text-xl'}`}>
                  {getWeatherIcon(forecastData.tomorrow.icon)}
                </div>
                <div className={`text-gray-800 font-semibold ${
                  screenSize === 'mobile' ? 'text-xs' : 'text-sm'
                }`}>
                  {forecastData.tomorrow.temp}°
                </div>
              </div>
            )}

            {/* Day After */}
            {forecastData.dayAfter && (
              <div
                className={`flex flex-col items-center text-center transition-all duration-300 hover:scale-105 ${
                  screenSize === 'mobile' ? 'p-2' : 'p-3'
                }`}
                style={{
                  background: 'rgba(255, 255, 255, 0.3)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  borderRadius: screenSize === 'mobile' ? '12px' : '16px'
                }}
              >
                <div className="text-xs font-medium text-gray-600 mb-1">Übermorgen</div>
                <div className={`mb-1 ${screenSize === 'mobile' ? 'text-lg' : 'text-xl'}`}>
                  {getWeatherIcon(forecastData.dayAfter.icon)}
                </div>
                <div className={`text-gray-800 font-semibold ${
                  screenSize === 'mobile' ? 'text-xs' : 'text-sm'
                }`}>
                  {forecastData.dayAfter.temp}°
                </div>
              </div>
            )}
          </div>

          {/* Extended Weather Details */}
          <div className={`pt-2 border-t border-white/20 ${
            screenSize === 'mobile' ? 'mt-2' : 'mt-3'
          }`}>
            <div className={`grid grid-cols-2 gap-2 ${
              screenSize === 'mobile' ? 'text-xs' : 'text-xs'
            }`}>
              {weather?.windSpeed && (
                <div className="flex items-center space-x-1 text-white/80">
                  <Wind className="w-3 h-3" />
                  <span>{Math.round(weather.windSpeed)} km/h</span>
                </div>
              )}
              <div className="flex items-center space-x-1 text-white/80">
                <Droplets className="w-3 h-3" />
                <span>{weather.humidity}%</span>
              </div>
            </div>
          </div>

          {/* Enhanced Weather Alerts */}
          {allAlerts.length > 0 && (
            <div className="mt-2 pt-2 border-t border-white/20">
              <div className="text-xs text-white/90 mb-1">
                {realAlerts.length > 0 ? 'Wetterwarnungen:' : 'Camping Hinweise:'}
              </div>
              <div className="flex flex-wrap gap-1">
                {/* Priority: Show real weather alerts first */}
                {realAlerts.slice(0, screenSize === 'mobile' ? 1 : 2).map((alert: any, index) => (
                  <div
                    key={`real_${index}`}
                    className={`rounded text-white/90 ${
                      screenSize === 'mobile' ? 'text-xs px-1 py-1' : 'text-xs px-2 py-1'
                    } ${
                      alert.severity === 'high' ? 'bg-red-500/80' :
                      alert.severity === 'medium' ? 'bg-orange-500/80' : 'bg-yellow-500/80'
                    }`}
                  >
                    🚨 {screenSize === 'mobile' && alert.title.length > 10 
                      ? alert.title.substring(0, 10) + '...' 
                      : alert.title}
                  </div>
                ))}

                {/* Then show camping-specific alerts */}
                {campingAlerts.slice(0, realAlerts.length > 0 ? 1 : (screenSize === 'mobile' ? 2 : 3)).map((alert, index) => (
                  <div
                    key={`camping_${index}`}
                    className={`bg-white/20 rounded text-white/90 ${
                      screenSize === 'mobile' ? 'text-xs px-1 py-1' : 'text-xs px-2 py-1'
                    }`}
                  >
                    {alert.icon} {alert.text}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};