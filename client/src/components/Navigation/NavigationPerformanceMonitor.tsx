import { Battery, Signal, Clock, Gauge, Satellite } from 'lucide-react';

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

interface NavigationPerformanceMonitorProps {
  metrics: NavigationMetrics;
  gpsAccuracy: number;
  isVisible: boolean;
  useRealGPS: boolean;
}

export const NavigationPerformanceMonitor = ({ 
  metrics,
  gpsAccuracy, 
  isVisible,
  useRealGPS
}: NavigationPerformanceMonitorProps) => {
  if (!isVisible) return null;

  const getGpsSignalStrength = (accuracy: number) => {
    if (accuracy <= 5) return { status: 'excellent', color: 'text-green-400' };
    if (accuracy <= 10) return { status: 'good', color: 'text-yellow-400' };
    if (accuracy <= 20) return { status: 'fair', color: 'text-orange-400' };
    return { status: 'poor', color: 'text-red-400' };
  };

  const getBatteryOptimization = (interval: number) => {
    if (interval <= 1000) return { status: 'high-power', color: 'text-red-300' };
    if (interval <= 2000) return { status: 'balanced', color: 'text-yellow-300' };
    return { status: 'power-saving', color: 'text-green-300' };
  };

  const getTimeSinceLastUpdate = (lastUpdateTime: number) => {
    if (lastUpdateTime === 0) return 'Never';
    const secondsAgo = Math.floor((Date.now() - lastUpdateTime) / 1000);
    if (secondsAgo < 60) return `${secondsAgo}s ago`;
    const minutesAgo = Math.floor(secondsAgo / 60);
    return `${minutesAgo}m ago`;
  };

  const signalStrength = getGpsSignalStrength(gpsAccuracy);
  const batteryMode = getBatteryOptimization(metrics.activeInterval);
  const timeSinceUpdate = getTimeSinceLastUpdate(metrics.lastUpdateTime);
  
  return (
    <div className="absolute top-4 right-4 z-50 bg-black/90 backdrop-blur-sm p-3 rounded-lg text-white text-xs space-y-2 min-w-[200px]">
      <div className="font-bold text-center flex items-center justify-center space-x-1">
        <Satellite className="w-3 h-3" />
        <span>{useRealGPS ? 'Real GPS' : 'Mock GPS'} Debug</span>
      </div>
      
      {/* GPS Status */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-1">
          <Signal className="w-3 h-3" />
          <span>GPS Signal:</span>
        </div>
        <span className={signalStrength.color}>
          {signalStrength.status} (±{gpsAccuracy.toFixed(1)}m)
        </span>
      </div>

      {/* Update Frequency */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-1">
          <Clock className="w-3 h-3" />
          <span>Update Rate:</span>
        </div>
        <span className="text-cyan-300">{metrics.activeInterval}ms</span>
      </div>

      {/* Battery Optimization */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-1">
          <Battery className="w-3 h-3" />
          <span>Power Mode:</span>
        </div>
        <span className={batteryMode.color}>
          {batteryMode.status}
        </span>
      </div>

      {/* Current Speed */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-1">
          <Gauge className="w-3 h-3" />
          <span>Speed:</span>
        </div>
        <span className={metrics.isMoving ? 'text-blue-300' : 'text-gray-400'}>
          {metrics.currentSpeed.toFixed(1)} km/h
        </span>
      </div>

      {/* Average Speed */}
      {metrics.averageSpeed > 0 && (
        <div className="flex justify-between items-center">
          <span>Avg Speed:</span>
          <span className="text-cyan-300">
            {metrics.averageSpeed.toFixed(1)} km/h
          </span>
        </div>
      )}

      {/* Max Speed */}
      {metrics.maxSpeed > 0 && (
        <div className="flex justify-between items-center">
          <span>Max Speed:</span>
          <span className="text-green-300">
            {metrics.maxSpeed.toFixed(1)} km/h
          </span>
        </div>
      )}

      {/* Movement Status */}
      <div className="flex justify-between items-center">
        <span>Movement:</span>
        <span className={metrics.isMoving ? 'text-green-300' : 'text-gray-400'}>
          {metrics.isMoving ? 'Moving' : 'Stationary'}
        </span>
      </div>

      {/* Update Counter */}
      <div className="flex justify-between items-center">
        <span>GPS Updates:</span>
        <span className="text-yellow-300">
          {metrics.updateCount}
        </span>
      </div>

      {/* Last Update Time */}
      <div className="flex justify-between items-center">
        <span>Last Update:</span>
        <span className="text-purple-300 text-xs">
          {timeSinceUpdate}
        </span>
      </div>

      {/* Status Indicators */}
      <div className="pt-2 border-t border-gray-600">
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">GPS Mode:</span>
          <span className={useRealGPS ? 'text-green-400' : 'text-blue-400'}>
            {useRealGPS ? 'Hardware' : 'Simulated'}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">System Status:</span>
          <span className="text-green-400">Active</span>
        </div>
        {useRealGPS && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Avg Accuracy:</span>
            <span className="text-orange-300">
              ±{metrics.averageAccuracy.toFixed(1)}m
            </span>
          </div>
        )}
      </div>
    </div>
  );
};