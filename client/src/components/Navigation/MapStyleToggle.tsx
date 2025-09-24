import { Layers, Mountain, Navigation, Satellite } from 'lucide-react';

interface MapStyleToggleProps {
  currentStyle: 'outdoors' | 'satellite' | 'streets' | 'navigation';
  onStyleChange: (style: 'outdoors' | 'satellite' | 'streets' | 'navigation') => void;
}

const STYLE_CONFIG = {
  outdoors: {
    icon: Mountain,
    label: 'Outdoor',
    description: 'Best for camping - shows trails and terrain'
  },
  satellite: {
    icon: Satellite,
    label: 'Satellite',
    description: 'Aerial view of campgrounds'
  },
  streets: {
    icon: Layers,
    label: 'Streets',
    description: 'Standard street map'
  },
  navigation: {
    icon: Navigation,
    label: 'Navigation',
    description: 'Optimized for turn-by-turn directions'
  }
};

export const MapStyleToggle = ({ currentStyle, onStyleChange }: MapStyleToggleProps) => {
  const styles = Object.keys(STYLE_CONFIG) as Array<keyof typeof STYLE_CONFIG>;
  const currentIndex = styles.indexOf(currentStyle);
  
  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const nextIndex = (currentIndex + 1) % styles.length;
    const nextStyle = styles[nextIndex];
    
    console.log('🗺️ DEBUG - MapStyleToggle clicked:', {
      currentStyle,
      currentIndex,
      nextStyle,
      nextIndex,
      allStyles: styles,
      isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    });
    
    // Test if the callback is working
    try {
      onStyleChange(nextStyle);
      console.log('🗺️ DEBUG - onStyleChange called successfully');
    } catch (error) {
      console.error('🗺️ ERROR - onStyleChange failed:', error);
    }
  };

  const CurrentIcon = STYLE_CONFIG[currentStyle].icon;

  return (
    <div 
      className="w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95"
      style={{
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        minWidth: '48px',
        minHeight: '48px',
        // Enhanced touch target for mobile
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent'
      }}
      onClick={handleToggle}
      onTouchStart={(e) => {
        // Prevent iOS bounce and improve touch responsiveness
        e.preventDefault();
        console.log('🗺️ DEBUG - Touch start on map style toggle');
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        console.log('🗺️ DEBUG - Touch end on map style toggle');
        handleToggle(e as any);
      }}
      title={`${STYLE_CONFIG[currentStyle].label} - ${STYLE_CONFIG[currentStyle].description}`}
    >
      <CurrentIcon 
        className="w-5 h-5" 
        style={{ 
          color: currentStyle === 'outdoors' ? '#059669' : 
                 currentStyle === 'satellite' ? '#0ea5e9' :
                 currentStyle === 'navigation' ? '#dc2626' : '#374151',
          pointerEvents: 'none' // Prevent icon from intercepting touch events
        }} 
      />
    </div>
  );
};