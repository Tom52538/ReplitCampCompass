import { useWeather } from '@/hooks/useWeather';
import { usePOI } from '@/hooks/usePOI';
import { Coordinates } from '@/types/navigation';

interface StatusBarProps {
  currentPosition: Coordinates;
}

export const StatusBar = ({ currentPosition }: StatusBarProps) => {
  const { isLoading: weatherLoading, error: weatherError } = useWeather(
    currentPosition.lat, 
    currentPosition.lng
  );
  const { isLoading: poiLoading, error: poiError } = usePOI();

  const getStatusDot = (loading: boolean, error: any) => {
    if (loading) return 'status-dot bg-yellow-500 animate-pulse';
    if (error) return 'status-dot bg-red-500';
    return 'status-dot bg-green-500';
  };

  return (
    <div className="absolute top-4 right-4 z-50 flex items-center space-x-2">
      {/* GPS Status */}
      <div 
        className="status-dot success animate-pulse" 
        title="GPS Connected"
      ></div>
      
      {/* Weather API Status */}
      <div 
        className={getStatusDot(weatherLoading, weatherError)}
        title={
          weatherLoading ? 'Loading weather...' : 
          weatherError ? 'Weather unavailable' : 
          'Weather data available'
        }
      ></div>
      
      {/* POI Data Status */}
      <div 
        className={getStatusDot(poiLoading, poiError)}
        title={
          poiLoading ? 'Loading POIs...' : 
          poiError ? 'POI data unavailable' : 
          'POI data available'
        }
      ></div>
    </div>
  );
};
