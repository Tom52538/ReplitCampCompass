import { Coordinates } from '@/types/navigation';
import { useWeather } from '@/hooks/useWeather';
import { useLanguage } from '@/hooks/useLanguage';
import { 
  Cloud, Sun, CloudRain, CloudSnow, Wind, Droplets, AlertTriangle, 
  MapPin, Wifi, WifiOff, Battery, Signal
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CampingCenterContentProps {
  currentPosition: Coordinates;
  weather?: any;
}

const getWeatherIcon = (condition: string) => {
  const conditionLower = condition.toLowerCase();
  if (conditionLower.includes('rain')) return CloudRain;
  if (conditionLower.includes('snow')) return CloudSnow;
  if (conditionLower.includes('cloud')) return Cloud;
  if (conditionLower.includes('clear') || conditionLower.includes('sun')) return Sun;
  return Cloud;
};

const getCampingAlerts = (weather: any, t: (key: string) => string) => {
  const alerts = [];
  
  if (weather?.temperature < 5) {
    alerts.push({ type: 'cold', message: 'Cold weather - extra layers recommended', icon: '🥶', priority: 'high' });
  }
  
  if (weather?.condition?.toLowerCase().includes('rain')) {
    alerts.push({ type: 'rain', message: 'Rain expected - secure equipment', icon: '🌧️', priority: 'medium' });
  }
  
  if (weather?.windSpeed && weather.windSpeed > 20) {
    alerts.push({ type: 'wind', message: 'Strong winds - check tent stakes', icon: '💨', priority: 'high' });
  }
  
  if (weather?.temperature > 30) {
    alerts.push({ type: 'heat', message: 'High temperature - stay hydrated', icon: '🌡️', priority: 'medium' });
  }
  
  return alerts;
};

export const CampingCenterContent = ({ currentPosition, weather }: CampingCenterContentProps) => {
  const { data: currentWeather, isLoading: weatherLoading } = useWeather(currentPosition.lat, currentPosition.lng);
  const { t } = useLanguage();
  
  const weatherData = weather || currentWeather;
  const WeatherIcon = weatherData ? getWeatherIcon(weatherData.condition) : Cloud;
  const alerts = weatherData ? getCampingAlerts(weatherData, t) : [];

  return (
    <div className="h-full overflow-y-auto space-y-4">
      {/* Quick Status Header */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800">Camping Center</h3>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="GPS Active"></div>
          <Signal className="w-4 h-4 text-green-600" />
        </div>
      </div>

      {/* Weather Summary */}
      <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <WeatherIcon className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-blue-900">
              {weatherLoading ? 'Loading...' : weatherData ? `${Math.round(weatherData.temperature)}°C` : 'Weather unavailable'}
            </span>
          </div>
          {weatherData && (
            <span className="text-sm text-blue-700 capitalize">{weatherData.condition}</span>
          )}
        </div>
        
        {weatherData && (
          <div className="flex items-center space-x-4 text-sm text-blue-700">
            {weatherData.humidity && (
              <div className="flex items-center space-x-1">
                <Droplets className="w-4 h-4" />
                <span>{weatherData.humidity}%</span>
              </div>
            )}
            {weatherData.windSpeed && (
              <div className="flex items-center space-x-1">
                <Wind className="w-4 h-4" />
                <span>{Math.round(weatherData.windSpeed)}km/h</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Camping Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center">
            <AlertTriangle className="w-4 h-4 mr-1 text-amber-500" />
            Camping Alerts
          </h4>
          <div className="space-y-2">
            {alerts.map((alert, index) => (
              <div key={index} className={`p-3 rounded-lg border ${
                alert.priority === 'high' 
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{alert.icon}</span>
                  <span className="text-sm font-medium">{alert.message}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Essential Camping Categories */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-700">Essential Services</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
            <div className="flex items-center space-x-2">
              <div className="bg-blue-500 rounded-lg p-2">
                <span className="text-white text-lg">🚿</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">Restrooms</p>
                <p className="text-xs text-gray-500">Facilities</p>
              </div>
            </div>
          </div>
          
          <div className="p-3 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
            <div className="flex items-center space-x-2">
              <div className="bg-red-500 rounded-lg p-2">
                <span className="text-white text-lg">🔥</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">Fire Pits</p>
                <p className="text-xs text-gray-500">Recreation</p>
              </div>
            </div>
          </div>
          
          <div className="p-3 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
            <div className="flex items-center space-x-2">
              <div className="bg-green-500 rounded-lg p-2">
                <span className="text-white text-lg">🗑️</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">Waste</p>
                <p className="text-xs text-gray-500">Services</p>
              </div>
            </div>
          </div>
          
          <div className="p-3 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
            <div className="flex items-center space-x-2">
              <div className="bg-purple-500 rounded-lg p-2">
                <span className="text-white text-lg">⛽</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">Services</p>
                <p className="text-xs text-gray-500">Facilities</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Current Location Info */}
      <div className="p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <MapPin className="w-4 h-4 text-gray-600" />
          <h4 className="text-sm font-semibold text-gray-700">Current Location</h4>
        </div>
        <div className="text-sm text-gray-600 space-y-1">
          <p>Lat: {currentPosition.lat.toFixed(6)}</p>
          <p>Lng: {currentPosition.lng.toFixed(6)}</p>
          <div className="flex items-center space-x-2 mt-2">
            <Badge variant="secondary" className="text-xs">
              GPS Active
            </Badge>
            <Badge variant="secondary" className="text-xs">
              ±3m accuracy
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
};