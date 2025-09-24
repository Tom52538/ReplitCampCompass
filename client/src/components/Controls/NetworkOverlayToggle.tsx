import React from 'react';
import { Button } from '../ui/button';
import { Network } from 'lucide-react';

interface NetworkOverlayToggleProps {
  visible: boolean;
  onToggle: () => void;
}

export const NetworkOverlayToggle: React.FC<NetworkOverlayToggleProps> = ({ 
  visible, 
  onToggle 
}) => {
  return (
    <Button
      onClick={onToggle}
      variant={visible ? "default" : "outline"}
      size="sm"
      className={`
        fixed bottom-20 right-4 z-50
        w-12 h-12 rounded-full shadow-lg
        transition-all duration-300 ease-in-out
        ${visible 
          ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-500' 
          : 'bg-white/80 hover:bg-white/90 text-gray-700 border-gray-300'
        }
        backdrop-blur-sm hover:scale-105
      `}
      title={visible ? 'Hide Network Overlay' : 'Show Network Overlay'}
    >
      <Network className="w-6 h-6" />
    </Button>
  );
};