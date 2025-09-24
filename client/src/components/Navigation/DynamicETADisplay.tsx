import React, { useEffect, useState } from 'react';
import { SpeedTracker } from '../../lib/speedTracker';
import { Clock, Navigation } from 'lucide-react';

interface DynamicETADisplayProps {
  remainingDistance: number; // in meters
  currentTravelMode: 'car' | 'bike' | 'pedestrian';
  showAlternativeModes?: boolean;
  className?: string;
}

export const DynamicETADisplay: React.FC<DynamicETADisplayProps> = ({
  remainingDistance,
  currentTravelMode,
  showAlternativeModes = false,
  className = ''
}) => {
  const [etaData, setEtaData] = useState<any>(null);
  const [speedTracker] = useState(() => new SpeedTracker());

  // Mode configuration matching server-side campground calculations
  const modeConfig = {
    car: { emoji: '🚗', label: 'Auto', color: '#dc2626', speedKmh: 15 },      // 4.17 m/s = 15 km/h
    bike: { emoji: '🚴', label: 'Rad', color: '#059669', speedKmh: 7.2 },     // 2.0 m/s = 7.2 km/h  
    pedestrian: { emoji: '🚶', label: 'Fuß', color: '#2563eb', speedKmh: 3.6 } // 1.0 m/s = 3.6 km/h
  };

  useEffect(() => {
    if (remainingDistance > 0) {
      const distanceKm = remainingDistance / 1000;
      const scenarios = speedTracker.getETAScenarios(distanceKm, currentTravelMode);
      setEtaData(scenarios);

      console.log('📊 DYNAMIC ETA UPDATE:', {
        mode: currentTravelMode,
        distance: `${remainingDistance}m`,
        eta: `${Math.ceil(scenarios.atCurrentMode.estimatedTimeRemaining / 60)} min`,
        arrival: scenarios.atCurrentMode.estimatedArrival.toLocaleTimeString('de-DE', {
          hour: '2-digit',
          minute: '2-digit'
        })
      });
    }
  }, [remainingDistance, currentTravelMode, speedTracker]);

  if (!etaData) return null;

  const formatDuration = (seconds: number): string => {
    const minutes = Math.ceil(seconds / 60);
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const formatArrivalTime = (date: Date): string => {
    return date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const currentETA = etaData.atCurrentMode;
  const currentMode = modeConfig[currentTravelMode];

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Primary ETA Display */}
      <div 
        className="flex items-center space-x-3 p-3 rounded-lg"
        style={{
          background: `${currentMode.color}15`,
          border: `1px solid ${currentMode.color}40`
        }}
      >
        <div className="flex items-center space-x-1">
          <span className="text-lg">{currentMode.emoji}</span>
          <Clock className="w-4 h-4" style={{ color: currentMode.color }} />
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span 
              className="font-semibold text-sm"
              style={{ color: currentMode.color }}
            >
              {formatDuration(currentETA.estimatedTimeRemaining)}
            </span>
            <span className="text-xs text-gray-600">
              Ankunft: {formatArrivalTime(currentETA.estimatedArrival)}
            </span>
          </div>

          <div className="text-xs text-gray-500 mt-1">
            {currentMode.label} • {currentMode.speedKmh} km/h • {Math.round(remainingDistance)}m
          </div>
        </div>
      </div>

      {/* Alternative Modes (if enabled) */}
      {showAlternativeModes && (
        <div className="space-y-1">
          <div className="text-xs text-gray-600 font-medium">Alternative Zeiten:</div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {Object.entries(modeConfig).map(([mode, config]) => {
              if (mode === currentTravelMode) return null;

              const eta = etaData.allModes[mode as keyof typeof etaData.allModes];

              return (
                <div 
                  key={mode}
                  className="flex items-center space-x-1 p-2 rounded bg-gray-50"
                >
                  <span>{config.emoji}</span>
                  <span className="text-gray-700">
                    {formatDuration(eta.estimatedTimeRemaining)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};