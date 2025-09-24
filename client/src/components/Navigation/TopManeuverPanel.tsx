
import React from 'react';
import { Navigation, ArrowRight, ArrowLeft, ArrowUp } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface TopManeuverPanelProps {
  instruction: string;
  distance: string;
  maneuverType?: string;
}

export const TopManeuverPanel: React.FC<TopManeuverPanelProps> = ({ 
  instruction, 
  distance,
  maneuverType 
}) => {
  const { t, translateText } = useLanguage();
  
  // 🚨 DEBUG: Log received props for turn-by-turn debugging
  console.log('🧭 TURN-BY-TURN PANEL: Received props:', {
    instruction: instruction,
    distance: distance,
    maneuverType: maneuverType,
    timestamp: new Date().toISOString()
  });
  
  // Get appropriate icon based on maneuver type
  const getManeuverIcon = () => {
    if (maneuverType?.includes('right') || maneuverType?.includes('rechts')) {
      return <ArrowRight className="w-6 h-6" />;
    }
    if (maneuverType?.includes('left') || maneuverType?.includes('links')) {
      return <ArrowLeft className="w-6 h-6" />;
    }
    if (maneuverType === 'arrive') {
      return <Navigation className="w-6 h-6" />;
    }
    return <ArrowUp className="w-6 h-6" />; // Default for straight/continue
  };

  // Format instruction for better turn-by-turn display
  const formatInstruction = (inst: string, dist: string) => {
    // If this is a total destination instruction, convert to next maneuver format
    if (inst.includes('zum Ziel') || inst.includes('to destination')) {
      const formatted = `Weiter geradeaus für ${dist}`;
      console.log('🧭 INSTRUCTION FORMAT: Destination instruction formatted:', {
        original: inst,
        formatted: formatted
      });
      return formatted;
    }
    const translated = translateText(inst);
    console.log('🧭 INSTRUCTION TRANSLATE:', {
      original: inst,
      translated: translated,
      language: 'current'
    });
    return translated;
  };

  return (
    <div
      className="absolute top-4 left-4 right-4 z-30 flex items-center gap-3 h-16 px-4"
      style={{
        background: 'rgba(26, 115, 232, 0.95)', // Google Maps Blue with transparency
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        color: 'white',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(26, 115, 232, 0.3), 0 1px 3px rgba(0, 0, 0, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
      }}
    >
      <div className="flex-shrink-0 bg-white/20 rounded-full p-2">
        {getManeuverIcon()}
      </div>
      <div className="flex-grow min-w-0">
        <div className="text-base font-bold leading-tight truncate mb-1">
          {formatInstruction(instruction, distance)}
        </div>
        <div className="text-sm font-medium opacity-90 leading-tight">
          In {distance}
        </div>
      </div>
    </div>
  );
};
