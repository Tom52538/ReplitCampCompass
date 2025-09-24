import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Layers, Navigation, Car, Bike, PersonStanding, Compass, Settings, Mic } from 'lucide-react';
import { GPSToggle } from './GPSToggle';
import { VoiceSelection } from './VoiceSelection';
import { VoiceControlPanel } from './VoiceControlPanel';

interface EnhancedMapControlsProps {
  onToggleVoice: () => void;
  onMapStyleChange: (style: 'outdoors' | 'satellite' | 'streets' | 'navigation') => void;
  isVoiceEnabled: boolean;
  mapStyle: 'outdoors' | 'satellite' | 'streets' | 'navigation';
  useRealGPS: boolean;
  onToggleGPS: () => void;
  travelMode: 'car' | 'bike' | 'pedestrian';
  onTravelModeChange: (mode: 'car' | 'bike' | 'pedestrian') => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCenterOnLocation: () => void;
  compassMode: 'north' | 'bearing';
  onToggleCompass: () => void;
  showNetworkOverlay: boolean;
  onToggleNetworkOverlay: () => void;
}

const mapStyleConfig = {
  outdoors: { label: '🗺️', title: 'Outdoor Map' },
  satellite: { label: '🛰️', title: 'Satellite View' },
  streets: { label: '🏙️', title: 'Street Map' },
  navigation: { label: '🧭', title: 'Navigation Mode' }
};

const travelModeConfig = {
  car: { icon: Car, label: 'Auto', color: 'bg-blue-500' },
  bike: { icon: Bike, label: 'Fahrrad', color: 'bg-green-500' },
  pedestrian: { icon: PersonStanding, label: 'Zu Fuß', color: 'bg-orange-500' }
};

export const EnhancedMapControls: React.FC<EnhancedMapControlsProps> = ({
  onToggleVoice,
  onMapStyleChange,
  isVoiceEnabled,
  mapStyle,
  useRealGPS,
  onToggleGPS,
  travelMode,
  onTravelModeChange,
  onZoomIn,
  onZoomOut,
  onCenterOnLocation,
  compassMode,
  onToggleCompass,
  showNetworkOverlay,
  onToggleNetworkOverlay
}) => {
  const [showVoicePanel, setShowVoicePanel] = useState(false);
  const mapStyleOptions = Object.entries(mapStyleConfig) as [keyof typeof mapStyleConfig, typeof mapStyleConfig[keyof typeof mapStyleConfig]][];
  const travelModeOptions = Object.entries(travelModeConfig) as [keyof typeof travelModeConfig, typeof travelModeConfig[keyof typeof travelModeConfig]][];

  const renderControlButton = (
    onClick: () => void,
    children: React.ReactNode,
    title: string,
    isActive: boolean = false
  ) => (
    <div className="relative mb-1">
      <button
        onClick={onClick}
        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 focus:outline-none
          ${isActive ? 'control-button--active' : 'control-button--inactive'}
          hover:scale-105 active:scale-95`}
        style={{
          background: isActive
            ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.7), rgba(59, 130, 246, 0.7))'
            : 'rgba(255, 255, 255, 0.2)',
          border: isActive ? 'none' : '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: isActive ? '0 3px 12px rgba(34, 197, 94, 0.3)' : 'none',
          backdropFilter: 'blur(20px) saturate(180%)',
        }}
        title={title}
      >
        {children}
      </button>
    </div>
  );

  return (
    <div
      className="enhanced-map-controls"
      style={{
        position: 'fixed',
        right: '16px',
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        zIndex: 1000,
        padding: '8px',
      }}
    >
      <div className="flex flex-col">
        {/* Voice Selection */}
        {renderControlButton(
          () => setShowVoicePanel(true),
          <Mic className="w-5 h-5 text-white" />,
          'Stimmen-Auswahl öffnen',
          showVoicePanel
        )}

        {/* Map Style Toggle */}
        {renderControlButton(
          () => {
            const currentIndex = mapStyleOptions.findIndex(([key]) => key === mapStyle);
            const nextIndex = (currentIndex + 1) % mapStyleOptions.length;
            const nextStyle = mapStyleOptions[nextIndex][0];
            onMapStyleChange(nextStyle);
          },
          <span className="text-sm">{mapStyleConfig[mapStyle].label}</span>,
          `${mapStyleConfig[mapStyle].title} - Tippen zum Wechseln`
        )}

        {/* GPS Toggle */}
        {renderControlButton(
          () => {
            if (onToggleGPS) {
              onToggleGPS();
            }
          },
          <span className="text-sm">{useRealGPS ? '📡' : '📍'}</span>,
          useRealGPS ? 'GPS aus' : 'GPS ein',
          useRealGPS
        )}

        {/* Travel Mode Toggle */}
        {renderControlButton(
          () => {
            const currentIndex = travelModeOptions.findIndex(([key]) => key === travelMode);
            const nextIndex = (currentIndex + 1) % travelModeOptions.length;
            const nextMode = travelModeOptions[nextIndex][0];
            onTravelModeChange(nextMode);
          },
          React.createElement(travelModeConfig[travelMode].icon, {
            className: "w-5 h-5 text-gray-700"
          }),
          `${travelModeConfig[travelMode].label} - Tippen zum Wechseln`
        )}

        {/* Zoom Controls */}
        {renderControlButton(
          onZoomIn,
          <span className="text-lg font-bold text-gray-700">+</span>,
          'Vergrößern'
        )}

        {renderControlButton(
          onZoomOut,
          <span className="text-lg font-bold text-gray-700">-</span>,
          'Verkleinern'
        )}

        {/* Center on Location */}
        {renderControlButton(
          onCenterOnLocation,
          <Navigation className="w-5 h-5 text-gray-600" />,
          'Zu meiner Position'
        )}

        {/* Compass Toggle */}
        {renderControlButton(
          onToggleCompass,
          compassMode === 'north' ? (
            <Compass className="w-5 h-5 text-blue-600" />
          ) : (
            <Navigation className="w-5 h-5 text-orange-600" style={{ transform: 'rotate(45deg)' }} />
          ),
          compassMode === 'north' ? 'Nord-Modus (Karte zeigt nach Norden)' : 'Fahrtrichtung (Karte folgt Bewegung)',
          true
        )}

        {/* Network Overlay Toggle */}
        {renderControlButton(
          onToggleNetworkOverlay,
          <Layers className="w-5 h-5 text-white" />,
          showNetworkOverlay ? 'Netzwerk-Overlay ausblenden' : 'Netzwerk-Overlay anzeigen',
          showNetworkOverlay
        )}
      </div>

      <style>{`
        .enhanced-map-controls {
          animation: slideInFromRight 0.3s ease-out;
        }
        @keyframes slideInFromRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .control-button--inactive:hover {
          background: rgba(255, 255, 255, 0.3) !important;
        }
      `}</style>

      {/* Voice Control Panel Overlay */}
      {showVoicePanel && (
        <div
          style={{
            position: 'fixed',
            right: '80px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 1001,
          }}
        >
          <VoiceControlPanel
            isVoiceEnabled={isVoiceEnabled}
            onToggleVoice={onToggleVoice}
            className="z-50"
            onClose={() => setShowVoicePanel(false)}
          />
        </div>
      )}
    </div>
  );
};