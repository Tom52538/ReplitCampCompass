
import React from 'react';
import { Button } from '@/components/ui/button';
import { Square } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface BottomSummaryPanelProps {
  timeRemaining: string;
  distanceRemaining: string;
  eta: string;
  onEndNavigation: () => void;
}

export const BottomSummaryPanel: React.FC<BottomSummaryPanelProps> = ({ 
  timeRemaining, 
  distanceRemaining, 
  eta, 
  onEndNavigation 
}) => {
  const { t } = useLanguage();
  
  // 🚨 DEBUG: Log received props for ETA debugging
  console.log('📊 BOTTOM PANEL: Received props (ETA Updates):', {
    timeRemaining: timeRemaining,
    distanceRemaining: distanceRemaining,
    eta: eta,
    timestamp: new Date().toISOString()
  });
  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-30 flex items-center justify-between h-14 px-4"
      style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* Left: Time and Distance - Compact horizontal layout */}
      <div className="flex items-center space-x-4 flex-grow min-w-0">
        <div className="text-center min-w-0">
          <div className="text-lg font-bold text-green-600 leading-none">{timeRemaining}</div>
          <div className="text-xs text-gray-500 leading-none mt-0.5">{distanceRemaining}</div>
        </div>
        <div className="w-px h-8 bg-gray-300"></div>
        <div className="text-center min-w-0">
          <div className="text-sm font-semibold text-gray-800 leading-none">{eta}</div>
          <div className="text-xs text-gray-500 leading-none mt-0.5">{t('navigation.eta')}</div>
        </div>
      </div>

      {/* Right: Test Button and End Button */}
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            // Scroll up to simulator controls
            const simulatorElement = document.querySelector('.fixed.top-4.left-4.right-4.z-40');
            if (simulatorElement) {
              simulatorElement.scrollIntoView({ behavior: 'smooth' });
              console.log('📱 Scrolled to Navigation Simulator Controls');
            } else {
              console.log('🧪 Quick Voice Test - Use Simulator Controls above for full navigation simulation');
              
              // Quick voice test as fallback
              if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance('Navigations-Simulator verfügbar - verwenden Sie die Steuerung oben');
                utterance.lang = 'de-DE';
                utterance.rate = 0.9;
                window.speechSynthesis.speak(utterance);
              }
            }
          }}
          className="h-8 px-3 bg-blue-50/80 border-blue-200 text-blue-700 hover:bg-blue-100 flex-shrink-0 rounded-lg"
          title="Test Navigation Voice - Click to test German voice announcements"
        >
          <span className="text-xs font-bold">🧪</span>
        </Button>
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={onEndNavigation} 
          className="h-8 px-3 bg-red-50/80 border-red-200 text-red-700 hover:bg-red-100 flex-shrink-0 rounded-lg"
        >
          <Square className="w-3 h-3 mr-1.5" />
          <span className="text-xs font-semibold">{t('navigation.endNavigation')}</span>
        </Button>
      </div>
    </div>
  );
};
