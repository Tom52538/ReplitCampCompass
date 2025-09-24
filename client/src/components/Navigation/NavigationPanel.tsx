import { NavigationRoute } from '@/types/navigation';
import { Button } from '@/components/ui/button';
import { Navigation, Square, Volume2 } from 'lucide-react';
import { DynamicETADisplay } from './DynamicETADisplay';


interface NavigationPanelProps {
  route: NavigationRoute | null;
  isVisible: boolean;
  onEndNavigation: () => void;
  onToggleVoice: () => void;
}

export const NavigationPanel = ({ 
  route, 
  isVisible, 
  onEndNavigation, 
  onToggleVoice 
}: NavigationPanelProps) => {
  if (!route) return null;

  return (
    <div className={`navigation-panel z-40 ${!isVisible ? 'hidden' : ''}`}>
      {/* Panel Handle */}
      <div className="flex justify-center py-3">
        <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
      </div>

      {/* Current Navigation Display */}
      <div className="px-6 pb-6">
        <div className="flex items-center space-x-4 mb-4">
          <div className="bg-blue-600 rounded-xl p-3">
            <Navigation className="text-white w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="text-lg font-bold text-gray-800">
              {typeof route.nextInstruction?.instruction === 'string' ? route.nextInstruction.instruction : 'Continue straight'}
            </div>
            <div className="text-sm text-gray-500">
              {route.nextInstruction?.distance || 'Keep going'}
            </div>
          </div>
        </div>

        {/* Route Summary */}
        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <div className="flex justify-between items-center">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-800">{route.totalDistance}</div>
              <div className="text-xs text-gray-500">Distance</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-800">{route.estimatedTime}</div>
              <div className="text-xs text-gray-500">Est. Time</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-800">{route.arrivalTime}</div>
              <div className="text-xs text-gray-500">Arrival</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <Button
            variant="destructive"
            className="flex-1"
            onClick={onEndNavigation}
          >
            <Square className="w-4 h-4 mr-2" />
            End Route
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onToggleVoice}
          >
            <Volume2 className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};