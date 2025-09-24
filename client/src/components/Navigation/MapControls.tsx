import { useState, useEffect } from 'react';
import { Plus, Minus, Crosshair, Navigation as NavigationIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GPSToggle } from './GPSToggle';

interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCenterOnLocation: () => void;
  useRealGPS: boolean;
  onToggleGPS: () => void;
  mapOrientation: 'north' | 'driving';
  onToggleOrientation: () => void;
}

interface CompassProps {
  heading: number;
}

const CompassIcon = ({ heading }: CompassProps) => (
  <div className="relative w-8 h-8">
    <div className="absolute inset-0 rounded-full border-2 border-gray-400"></div>
    <div 
      className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-0 h-0 border-l-2 border-r-2 border-b-4 border-l-transparent border-r-transparent border-b-red-600 transition-transform duration-200"
      style={{ transform: `translate(-50%, -50%) rotate(${heading}deg)` }}
    ></div>
    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 text-xs font-bold text-red-600">
      N
    </div>
  </div>
);

export const MapControls = ({ 
  onZoomIn, 
  onZoomOut, 
  onCenterOnLocation, 
  useRealGPS, 
  onToggleGPS,
  mapOrientation,
  onToggleOrientation
}: MapControlsProps) => {
  const [heading, setHeading] = useState(0);

  useEffect(() => {
    if ('DeviceOrientationEvent' in window) {
      const handleOrientation = (event: DeviceOrientationEvent) => {
        const alpha = event.alpha;
        if (alpha !== null) {
          setHeading(360 - alpha);
        }
      };

      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        (DeviceOrientationEvent as any).requestPermission()
          .then((response: string) => {
            if (response === 'granted') {
              window.addEventListener('deviceorientation', handleOrientation);
            }
          })
          .catch(() => {});
      } else {
        window.addEventListener('deviceorientation', handleOrientation);
      }

      return () => {
        window.removeEventListener('deviceorientation', handleOrientation as any);
      };
    }
  }, []);

  return (
    <div 
      className="absolute left-4 top-16 flex flex-col items-center space-y-3 z-30"
    >
      

      {/* Center on Location Button */}
      <button 
        onClick={onCenterOnLocation}
        className="w-12 h-12 rounded-full bg-white/90 hover:bg-white border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center text-gray-600 hover:scale-105 active:scale-95"
        title="Center on Location"
      >
        <Crosshair className="w-5 h-5" />
      </button>

      {/* GPS Toggle */}
      <button
        onClick={onToggleGPS}
        className={`w-12 h-12 rounded-full border-2 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center hover:scale-105 active:scale-95 ${
          useRealGPS
            ? 'bg-green-500 hover:bg-green-600 text-white border-green-400'
            : 'bg-gray-500 hover:bg-gray-600 text-white border-gray-400'
        }`}
        title={useRealGPS ? 'Live GPS Active' : 'Mock GPS Active'}
      >
        <NavigationIcon className="w-5 h-5" />
      </button>

      {/* Compass/Orientation Toggle */}
      <button
        onClick={onToggleOrientation}
        className="w-12 h-12 rounded-full bg-white/90 hover:bg-white border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center hover:scale-105 active:scale-95"
        title={mapOrientation === 'north' ? 'Switch to Driving Mode' : 'Switch to North Up'}
      >
        {mapOrientation === 'north' ? (
          <CompassIcon heading={heading} />
        ) : (
          <NavigationIcon className="w-5 h-5 text-blue-600" />
        )}
      </button>

      
    </div>
  );
};