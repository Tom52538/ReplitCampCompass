import { Satellite, MapPin } from 'lucide-react';

interface GPSToggleProps {
  useRealGPS: boolean;
  onToggle: () => void;
}

export const GPSToggle = ({ useRealGPS, onToggle }: GPSToggleProps) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🛰️ GPS toggle clicked, current mode:', useRealGPS ? 'Real' : 'Mock');
    onToggle();
  };

  return (
    <div 
      className="w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95"
      style={{
        background: useRealGPS ? 'rgba(34, 197, 94, 0.9)' : 'rgba(59, 130, 246, 0.9)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        minWidth: '48px',
        minHeight: '48px'
      }}
      onClick={handleClick}
      title={useRealGPS ? 'Real GPS Active - Click for Mock GPS' : 'Mock GPS Active (Testing Mode) - Click for Real GPS'}
    >
      {useRealGPS ? (
        <Satellite className="w-5 h-5 text-white" />
      ) : (
        <MapPin className="w-5 h-5 text-white" />
      )}
    </div>
  );
};