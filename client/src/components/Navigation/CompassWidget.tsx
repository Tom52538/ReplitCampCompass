import { useState, useEffect } from 'react';

export const CompassWidget = () => {
  const [heading, setHeading] = useState(0);

  useEffect(() => {
    let watchId: number;

    if ('DeviceOrientationEvent' in window) {
      const handleOrientation = (event: DeviceOrientationEvent) => {
        const alpha = event.alpha;
        if (alpha !== null) {
          setHeading(360 - alpha);
        }
      };

      // Request permission for iOS
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        (DeviceOrientationEvent as any).requestPermission()
          .then((response: string) => {
            if (response === 'granted') {
              window.addEventListener('deviceorientation', handleOrientation);
            }
          })
          .catch(() => {
            // Permission denied, use fallback
          });
      } else {
        // For non-iOS devices
        window.addEventListener('deviceorientation', handleOrientation);
      }
    }

    return () => {
      if (watchId) {
        window.removeEventListener('deviceorientation', handleOrientation as any);
      }
    };
  }, []);

  return (
    <div className="absolute top-36 left-4 z-20">
      <div className="floating-button w-16 h-16">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-2 border-gray-200"></div>
          <div 
            className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-0 h-0 border-l-2 border-r-2 border-b-4 border-l-transparent border-r-transparent border-b-red-600 transition-transform duration-200"
            style={{ transform: `translate(-50%, -50%) rotate(${heading}deg)` }}
          ></div>
          <div className="absolute top-1 left-1/2 transform -translate-x-1/2 text-xs font-bold text-red-600">
            N
          </div>
        </div>
      </div>
    </div>
  );
};
