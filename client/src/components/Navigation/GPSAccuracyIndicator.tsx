import { useEffect, useState } from 'react';
import { Satellite, Signal } from 'lucide-react';

interface GPSAccuracyIndicatorProps {
  useRealGPS: boolean;
}

export const GPSAccuracyIndicator = ({ useRealGPS }: GPSAccuracyIndicatorProps) => {
  const [accuracy, setAccuracy] = useState<number>(10);
  const [signalStrength, setSignalStrength] = useState<'high' | 'medium' | 'low'>('high');

  useEffect(() => {
    if (useRealGPS && 'geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const acc = position.coords.accuracy;
          setAccuracy(acc);
          
          // Determine signal strength based on accuracy
          if (acc <= 5) setSignalStrength('high');
          else if (acc <= 15) setSignalStrength('medium');
          else setSignalStrength('low');
        },
        (error) => {
          console.warn('GPS error:', error);
          setSignalStrength('low');
        },
        { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    } else {
      // Demo mode - simulate good signal
      setAccuracy(3);
      setSignalStrength('high');
    }
  }, [useRealGPS]);

  const getSignalColor = () => {
    switch (signalStrength) {
      case 'high': return 'text-emerald-600';
      case 'medium': return 'text-orange-500';
      case 'low': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

  const getSignalBars = () => {
    switch (signalStrength) {
      case 'high': return 4;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  };

  return (
    <div className="absolute bottom-4 left-4 z-30 bg-white/90 backdrop-blur-md rounded-lg shadow-lg border border-white/20 px-3 py-2">
      <div className="flex items-center space-x-2">
        <Satellite className={`w-4 h-4 ${getSignalColor()}`} />
        
        {/* Signal strength bars */}
        <div className="flex space-x-0.5">
          {[1, 2, 3, 4].map((bar) => (
            <div
              key={bar}
              className={`w-1 rounded-full transition-all duration-300 ${
                bar <= getSignalBars()
                  ? `${getSignalColor().replace('text-', 'bg-')} h-3`
                  : 'bg-gray-200 h-2'
              }`}
            />
          ))}
        </div>
        
        <div className="text-xs text-gray-600">
          {useRealGPS ? (
            <span>±{Math.round(accuracy)}m</span>
          ) : (
            <span className="text-orange-600">Demo</span>
          )}
        </div>
      </div>
    </div>
  );
};