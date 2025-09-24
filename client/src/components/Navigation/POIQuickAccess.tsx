import { useCallback } from 'react';
import { useLanguage } from '@/hooks/useLanguage';

interface POIQuickAccessProps {
  onCategorySelect: (category: string) => void;
  selectedCategories: string[];
}

const POIButton = ({ category, icon, label, isActive, onClick }: {
  category: string;
  icon: string;
  label: string;
  isActive: boolean;
  onClick: (category: string) => void;
}) => {
  return (
    <button
      onClick={() => onClick(category)}
      className="flex-1 h-16 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg"
      style={{
        background: isActive 
          ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.95), rgba(16, 185, 129, 0.95))' 
          : 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(12px)',
        border: isActive 
          ? '1px solid rgba(34, 197, 94, 0.4)' 
          : '1px solid rgba(255, 255, 255, 0.4)',
        boxShadow: isActive
          ? '0 8px 25px rgba(34, 197, 94, 0.3), 0 3px 10px rgba(0, 0, 0, 0.1)'
          : '0 4px 15px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)',
        minWidth: '70px',
        maxWidth: '90px'
      }}
    >
      <div 
        className="text-lg mb-1 transform transition-transform duration-200"
        style={{
          filter: isActive ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' : 'none',
          transform: isActive ? 'scale(1.1)' : 'scale(1)'
        }}
      >
        {icon}
      </div>
      <span 
        className="text-[10px] font-bold text-center leading-tight tracking-wide uppercase"
        style={{
          color: isActive ? 'white' : '#374151',
          textShadow: isActive 
            ? '0 1px 2px rgba(0, 0, 0, 0.3)' 
            : '0 1px 2px rgba(255, 255, 255, 0.8)',
          letterSpacing: '0.3px'
        }}
      >
        {label}
      </span>
    </button>
  );
};

export const POIQuickAccess = ({ onCategorySelect, selectedCategories }: POIQuickAccessProps) => {
  const { t } = useLanguage();

  console.log('🎯 POI QUICK ACCESS DEBUG: Component rendering started');

  // Reorganized POI categories for three-row layout with 2 buttons each
  const firstRowPOIs = [
    { 
      category: 'toilets', 
      icon: '🚿', 
      label: 'Restrooms'
    },
    { 
      category: 'food-drink', 
      icon: '🍽️', 
      label: 'Food'
    }
  ];

  const secondRowPOIs = [
    { 
      category: 'leisure', 
      icon: '🔥', 
      label: 'Leisure'
    },
    { 
      category: 'services', 
      icon: '🥾', 
      label: 'Services'
    }
  ];

  const thirdRowPOIs = [
    { 
      category: 'beach_houses', 
      icon: '🏖️', 
      label: 'Beach Houses'
    },
    { 
      category: 'accommodation', 
      icon: '🏡', 
      label: 'Accommodations'
    }
  ];

  const handleCategoryClick = useCallback((category: string) => {
    console.log(`🎯 POI Category clicked: ${category}`);

    // Clear other categories when selecting a new one to reduce clutter
    onCategorySelect(category);
  }, [onCategorySelect]);

  console.log('🎯 POI QUICK ACCESS DEBUG: Data prepared:', {
    firstRowPOIs: firstRowPOIs.length,
    secondRowPOIs: secondRowPOIs.length,
    thirdRowPOIs: thirdRowPOIs.length,
    selectedCategories,
    firstRowDetails: firstRowPOIs.map(p => p.label),
    secondRowDetails: secondRowPOIs.map(p => p.label),
    thirdRowDetails: thirdRowPOIs.map(p => p.label)
  });

  return (
    <div className="absolute top-20 left-3 right-3 z-20">
      <div className="space-y-2">
        {/* First row - 2 buttons */}
        <div className="flex justify-between space-x-2">
          {firstRowPOIs.map((poi, index) => {
            const isActive = selectedCategories.includes(poi.category);
            console.log('🎯 POI QUICK ACCESS DEBUG: Rendering first row button:', poi.label, 'active:', isActive);
            return (
              <POIButton
                key={`first-${poi.category}-${index}`}
                category={poi.category}
                icon={poi.icon}
                label={poi.label}
                isActive={isActive}
                onClick={handleCategoryClick}
              />
            );
          })}
        </div>

        {/* Second row - 2 buttons */}
        <div className="flex justify-between space-x-2">
          {secondRowPOIs.map((poi, index) => {
            const isActive = selectedCategories.includes(poi.category);
            console.log('🎯 POI QUICK ACCESS DEBUG: Rendering second row button:', poi.label, 'active:', isActive);
            return (
              <POIButton
                key={`second-${poi.category}-${index}`}
                category={poi.category}
                icon={poi.icon}
                label={poi.label}
                isActive={isActive}
                onClick={handleCategoryClick}
              />
            );
          })}
        </div>

        {/* Third row - 2 buttons */}
        <div className="flex justify-between space-x-2">
          {thirdRowPOIs.map((poi, index) => {
            const isActive = selectedCategories.includes(poi.category);
            console.log('🎯 POI QUICK ACCESS DEBUG: Rendering third row button:', poi.label, 'active:', isActive);
            return (
              <POIButton
                key={`third-${poi.category}-${index}`}
                category={poi.category}
                icon={poi.icon}
                label={poi.label}
                isActive={isActive}
                onClick={handleCategoryClick}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};