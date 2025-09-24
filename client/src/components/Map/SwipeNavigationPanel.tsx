import { useState } from 'react';
import { ChevronLeft, ChevronRight, Map, Navigation, Settings, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';

interface SwipeNavigationPanelProps {
  onNavigateLeft: () => void;
  onNavigateRight: () => void;
  currentPanel: 'map' | 'search' | 'navigation' | 'settings';
}

const panels = [
  { id: 'search', label: 'search', icon: Search },
  { id: 'map', label: 'map', icon: Map },
  { id: 'navigation', label: 'navigate', icon: Navigation },
  { id: 'settings', label: 'settings', icon: Settings }
] as const;

export const SwipeNavigationPanel = ({ 
  onNavigateLeft, 
  onNavigateRight, 
  currentPanel 
}: SwipeNavigationPanelProps) => {
  const { t } = useLanguage();
  const currentIndex = panels.findIndex(panel => panel.id === currentPanel);

  return (
    <div className="absolute bottom-4 left-4 right-4 z-30">
      <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/30 p-2">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-full bg-white/60 hover:bg-white/80"
            onClick={onNavigateLeft}
            disabled={currentIndex <= 0}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="flex items-center space-x-4">
            {panels.map((panel, index) => {
              const Icon = panel.icon;
              const isActive = panel.id === currentPanel;
              const isAdjacent = Math.abs(index - currentIndex) <= 1;
              
              return (
                <div
                  key={panel.id}
                  className={`
                    flex flex-col items-center space-y-1 transition-all duration-300
                    ${isActive ? 'scale-110' : isAdjacent ? 'scale-100 opacity-60' : 'scale-75 opacity-30'}
                  `}
                >
                  <div className={`
                    p-2 rounded-full transition-colors duration-300
                    ${isActive 
                      ? 'bg-blue-500 text-white shadow-lg' 
                      : 'bg-white/60 text-gray-600'
                    }
                  `}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`
                    text-xs font-medium transition-colors duration-300
                    ${isActive ? 'text-blue-600' : 'text-gray-500'}
                  `}>
                    {t(`navigation.${panel.label}`)}
                  </span>
                </div>
              );
            })}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-full bg-white/60 hover:bg-white/80"
            onClick={onNavigateRight}
            disabled={currentIndex >= panels.length - 1}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Panel Indicators */}
        <div className="flex justify-center mt-2 space-x-2">
          {panels.map((_, index) => (
            <div
              key={index}
              className={`
                h-1.5 rounded-full transition-all duration-300
                ${index === currentIndex 
                  ? 'w-6 bg-blue-500' 
                  : 'w-1.5 bg-gray-300'
                }
              `}
            />
          ))}
        </div>
      </div>
    </div>
  );
};