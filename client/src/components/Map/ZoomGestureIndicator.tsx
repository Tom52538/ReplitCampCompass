import { useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

interface ZoomGestureIndicatorProps {
  isVisible: boolean;
  gestureType: 'pinch-in' | 'pinch-out' | 'rotate' | null;
  intensity?: number;
}

export const ZoomGestureIndicator = ({ 
  isVisible, 
  gestureType, 
  intensity = 0.5 
}: ZoomGestureIndicatorProps) => {
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    if (isVisible && gestureType) {
      setShowIndicator(true);
      const timer = setTimeout(() => setShowIndicator(false), 1500);
      return () => clearTimeout(timer);
    } else {
      setShowIndicator(false);
    }
  }, [isVisible, gestureType]);

  if (!showIndicator || !gestureType) return null;

  const getIcon = () => {
    switch (gestureType) {
      case 'pinch-in':
        return ZoomOut;
      case 'pinch-out':
        return ZoomIn;
      case 'rotate':
        return RotateCw;
      default:
        return ZoomIn;
    }
  };

  const getLabel = () => {
    switch (gestureType) {
      case 'pinch-in':
        return 'Zoom Out';
      case 'pinch-out':
        return 'Zoom In';
      case 'rotate':
        return 'Rotate';
      default:
        return 'Zoom';
    }
  };

  const Icon = getIcon();
  const scale = 1 + (intensity * 0.5);

  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
      <div 
        className={`
          bg-black/80 backdrop-blur-sm rounded-2xl p-4 text-white
          transition-all duration-300 ease-out
          ${showIndicator ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}
        `}
        style={{ transform: `scale(${scale})` }}
      >
        <div className="flex flex-col items-center space-y-2">
          <Icon className="w-8 h-8" />
          <span className="text-sm font-medium">{getLabel()}</span>
          
          {/* Intensity bar */}
          <div className="w-16 h-1 bg-white/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-200"
              style={{ width: `${intensity * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};