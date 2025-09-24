import { NavigationRoute, Coordinates } from '@/types/navigation';
import { Navigation, MapPin, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavigationContentProps {
  route: NavigationRoute;
  currentPosition: Coordinates;
  onEndNavigation?: () => void;
}

export const NavigationContent = ({ route, currentPosition, onEndNavigation }: NavigationContentProps) => {
  const nextInstruction = route.nextInstruction || route.instructions[0];

  return (
    <div className="h-full overflow-y-auto space-y-3">
      {/* Current Navigation Instruction - Compact glassmorphism */}
      <div className="p-3 bg-blue-500/20 backdrop-blur-sm rounded-xl border border-white/30">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600/80 backdrop-blur-sm rounded-full p-2 flex-shrink-0">
            <Navigation className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-blue-900 leading-tight">
              {typeof nextInstruction?.instruction === 'string' ? nextInstruction.instruction : 'Continue straight'}
            </h3>
            <div className="flex items-center text-xs text-blue-700 space-x-3 mt-1">
              {nextInstruction?.distance && (
                <div className="flex items-center space-x-1">
                  <MapPin className="w-3 h-3" />
                  <span>{typeof nextInstruction.distance === 'string' ? nextInstruction.distance : '0m'}</span>
                </div>
              )}
              {nextInstruction?.duration && (
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{typeof nextInstruction.duration === 'string' ? nextInstruction.duration : '0s'}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Combined Route Summary & ETA - Single line for space efficiency */}
      <div className="flex items-center justify-between p-2 bg-white/30 backdrop-blur-sm rounded-lg border border-white/20">
        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1 text-gray-700">
            <MapPin className="w-3 h-3" />
            <span>{route.totalDistance}</span>
          </div>
          <div className="flex items-center space-x-1 text-gray-700">
            <Clock className="w-3 h-3" />
            <span>{route.estimatedTime}</span>
          </div>
        </div>
        <div className="text-xs font-semibold text-gray-700">ETA {route.arrivalTime}</div>
      </div>

      {/* Upcoming Instructions - Compact layout */}
      <div className="space-y-1.5">
        <h4 className="text-xs font-semibold text-gray-700 px-1">Upcoming</h4>
        {route.instructions.slice(0, 3).map((instruction, index) => (
          <div key={index} className="flex items-center space-x-2 p-2 rounded-lg bg-white/40 backdrop-blur-sm border border-white/20">
            <div className="w-5 h-5 rounded-full bg-gray-500/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-medium text-gray-700">{index + 1}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-800 truncate leading-tight">{typeof instruction.instruction === 'string' ? instruction.instruction : 'Continue straight'}</p>
              <div className="flex items-center space-x-2 text-[10px] text-gray-600 mt-0.5">
                <span>{typeof instruction.distance === 'string' ? instruction.distance : '0m'}</span>
                <ArrowRight className="w-2 h-2" />
                <span>{typeof instruction.duration === 'string' ? instruction.duration : '0s'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Controls - Glassmorphism button */}
      {onEndNavigation && (
        <Button
          variant="outline"
          className="w-full min-h-[42px] bg-red-500/20 backdrop-blur-sm border-red-300/30 text-red-700 hover:bg-red-500/30 hover:border-red-300/50 transition-all duration-200"
          onClick={onEndNavigation}
        >
          <span className="font-semibold">End Navigation</span>
        </Button>
      )}
    </div>
  );
};