import { Car, Bike, PersonStanding } from 'lucide-react';

interface TravelModeSelectorProps {
  currentMode: 'car' | 'bike' | 'pedestrian';
  onModeChange: (mode: 'car' | 'bike' | 'pedestrian') => void;
}

const TRAVEL_MODES = {
  car: {
    icon: Car,
    label: 'Auto',
    description: 'Fahren mit dem Auto',
    color: '#dc2626',
    speedKmh: 15    // Campground speed: 15 km/h
  },
  bike: {
    icon: Bike,
    label: 'Fahrrad',
    description: 'Radfahren',
    color: '#059669',
    speedKmh: 7.2   // Campground speed: 7.2 km/h
  },
  pedestrian: {
    icon: PersonStanding,
    label: 'Zu Fuß',
    description: 'Gehen',
    color: '#2563eb',
    speedKmh: 3.6   // Campground speed: 3.6 km/h
  }
};

export const TravelModeSelector = ({ currentMode, onModeChange }: TravelModeSelectorProps) => {
  const modes = Object.keys(TRAVEL_MODES) as Array<keyof typeof TRAVEL_MODES>;

  return (
    <div className="flex flex-col space-y-0.5 p-1 rounded-lg shadow-lg" style={{
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.4)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      width: '44px'
    }}>
      {modes.map(mode => {
        const config = TRAVEL_MODES[mode];
        const Icon = config.icon;
        const isSelected = currentMode === mode;

        return (
          <button
            key={mode}
            onClick={() => onModeChange(mode)}
            className="flex flex-col items-center p-1 rounded transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              background: isSelected 
                ? `${config.color}25` 
                : 'transparent',
              border: isSelected 
                ? `1.5px solid ${config.color}` 
                : '1.5px solid transparent',
              color: isSelected ? config.color : '#6b7280',
              width: '36px',
              height: '36px'
            }}
            title={`${config.label} - ${config.description} (~${config.speedKmh} km/h)`}
          >
            <Icon 
              className="w-3.5 h-3.5 mb-0.5" 
              style={{ 
                color: isSelected ? config.color : '#6b7280'
              }} 
            />
            <span 
              className="text-[9px] font-medium leading-none"
              style={{ 
                color: isSelected ? config.color : '#6b7280'
              }}
            >
              {config.label === 'Fahrrad' ? 'Rad' : config.label === 'Zu Fuß' ? 'Fuß' : config.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};