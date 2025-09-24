import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { usePOICategories } from '@/hooks/usePOICategories';
import { usePOI } from '@/hooks/usePOI';
import { useSiteManager } from '@/lib/siteManager';

interface LightweightPOIButtonsProps {
  onCategorySelect: (category: string) => void;
  activeCategories?: string[]; // Changed to array for multiple selections
  selectedPOI?: boolean; // Add prop to know when POI is selected
}



// POI categories for Kamperland location - camping/recreation focused
const KAMPERLAND_POI_BUTTONS = [
  { category: 'toilets', icon: '🚽', label: 'Toiletten', color: 'bg-blue-500' },
  { category: 'food-drink', icon: '🍽️', label: 'Gastronomie', color: 'bg-orange-500' },
  { category: 'parking', icon: '🅿️', label: 'Parkplätze', color: 'bg-gray-500' },
  { category: 'leisure', icon: '🏊', label: 'Freizeit', color: 'bg-green-500' },
  { category: 'bungalows', icon: '🏘️', label: 'Bungalows', color: 'bg-green-600' },
  { category: 'beach_houses', icon: '🏖️', label: 'Strandhäuser', color: 'bg-cyan-500' },
  { category: 'lodge', icon: '🏝️', label: 'Water Village Lodges', color: 'bg-teal-500' },
  { category: 'bungalows_water', icon: '🏝️', label: 'Water Village Bungalows', color: 'bg-teal-600' }
];

// POI categories for Zuhause location - EXACT implementation of analyzed concept
const ZUHAUSE_POI_BUTTONS = [
  { category: 'parking', icon: '🚗', label: 'Verkehr & Parken', color: 'bg-blue-500' }, // 580 POIs - 45%
  { category: 'gastronomie', icon: '🍽️', label: 'Gastronomie', color: 'bg-orange-500' }, // 25 POIs - 2%
  { category: 'accommodation', icon: '🏨', label: 'Übernachten', color: 'bg-green-600' }, // 58 POIs - 4%
  { category: 'services', icon: 'ℹ️', label: 'Info & Services', color: 'bg-purple-500' }, // 80 POIs - 6%
  { category: 'kultur', icon: '⛪', label: 'Kultur & Religion', color: 'bg-amber-800' }, // 36 POIs - 3%
  { category: 'sport', icon: '🏃', label: 'Sport & Freizeit', color: 'bg-red-500' }, // 120 POIs - 9%
  { category: 'shopping', icon: '🛒', label: 'Einkaufen', color: 'bg-yellow-500' }, // 50 POIs - 4%
  { category: 'gesundheit', icon: '🏥', label: 'Gesundheit & Bildung', color: 'bg-teal-600' } // 28 POIs - 2%
];

export const LightweightPOIButtons = ({ onCategorySelect, activeCategories = [], selectedPOI }: LightweightPOIButtonsProps) => {
  const [visibleTooltip, setVisibleTooltip] = useState<string | null>(null);
  const tooltipTimeoutRef = useRef<number | null>(null);
  const { t, currentLanguage } = useLanguage(); // Assuming currentLanguage is available from useLanguage hook

  // SiteManager - Single Source of Truth! No more localStorage polling!
  const { config: siteConfig } = useSiteManager();
  const currentSite = siteConfig.site;

  console.log('🎯 POI BUTTONS: Using SiteManager:', { currentSite, isValid: siteConfig.isValid });

  // No POI fetching needed - buttons are hardcoded, dynamic categories disabled

  // SiteManager handles all site changes automatically - no polling needed!

  // Always use hardcoded buttons - dynamic categories are disabled
  const POI_BUTTONS = currentSite === 'zuhause' ? ZUHAUSE_POI_BUTTONS : KAMPERLAND_POI_BUTTONS;

  console.log(`🔍 POI BUTTON DEBUG: Erkannte Site: "${currentSite}", verwende ${POI_BUTTONS.length} Buttons für ${currentSite}`);

  const handleCategoryClick = useCallback((category: string) => {
    console.log(`🔍 POI BUTTON DEBUG: ===========================================`);
    console.log(`🔍 POI BUTTON DEBUG: Category button clicked: "${category}" for site: ${currentSite}`);
    console.log(`🔍 POI BUTTON DEBUG: Previous active categories:`, activeCategories);
    console.log(`🔍 POI BUTTON DEBUG: Button category type:`, typeof category, category);

    // CRITICAL FIX: Always call onCategorySelect with the BUTTON category name
    // The parent component will handle the mapping to OSM categories internally
    console.log(`🔍 POI BUTTON DEBUG: Calling onCategorySelect with BUTTON category: "${category}"`);
    console.log(`🔍 POI BUTTON DEBUG: Expected button to become active: "${category}"`);
    
    onCategorySelect(category);
    setVisibleTooltip(category);

    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }

    tooltipTimeoutRef.current = window.setTimeout(() => {
      setVisibleTooltip(null);
      console.log(`🔍 POI BUTTON DEBUG: Cleared visible tooltip`);
    }, 2000);
  }, [onCategorySelect, activeCategories, currentSite]);

  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

  // Helper function to translate text
  const translateText = (text: string, language: string): string => {
    // In a real app, this would involve a more robust translation mechanism
    // For now, we'll just return the text with a placeholder for the language
    // This simulates fetching translated text
    if (language === 'en') return text; // Default to English if no specific translation found
    return `${text} (translated to ${language})`;
  };

  const renderVerticalButton = (poi: any, index: number) => {
    // Enhanced debugging for active state
    console.log(`🔍 BUTTON RENDER DEBUG: Button ${index} - Category: "${poi.category}", Active categories:`, activeCategories);
    
    // CRITICAL FIX: Check if this button's category is in the activeCategories array
    // activeCategories now contains the button category names directly
    const isButtonActive = activeCategories.includes(poi.category);
    
    console.log(`🔍 BUTTON ACTIVE DEBUG: Button "${poi.category}" - isActive: ${isButtonActive}`, {
      buttonCategory: poi.category,
      activeCategories: activeCategories,
      includes: activeCategories.includes(poi.category)
    });
    
    const displayIcon = poi.icon;
    const displayLabel = poi.label; // Use German labels directly from button definition

    return (
      <div key={poi.category || index} className="relative mb-1">
        <button
          onClick={() => handleCategoryClick(poi.category as string)}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 focus:outline-none
            ${isButtonActive ? 'poi-button--active' : 'poi-button--inactive'}
            hover:scale-105 active:scale-95`}
          style={{
            background: isButtonActive
              ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.95), rgba(16, 185, 129, 0.95))'
              : 'rgba(255, 255, 255, 0.2)',
            border: isButtonActive 
              ? '2px solid rgba(34, 197, 94, 0.8)' 
              : '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: isButtonActive 
              ? '0 0 20px rgba(34, 197, 94, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.3)' 
              : 'none',
            transform: isButtonActive ? 'translateZ(0)' : 'none',
            // Force repaint to ensure styles are applied
            willChange: 'background, border, box-shadow, transform'
          }}
          aria-label={displayLabel}
          onMouseEnter={() => {
            console.log(`🔍 POI BUTTON DEBUG: Zeige ${poi.category?.toLowerCase() || 'unbekannte Kategorie'}: ${displayLabel}`);
            setVisibleTooltip(poi.category);
          }}
          onMouseLeave={() => {
            if (tooltipTimeoutRef.current) {
              clearTimeout(tooltipTimeoutRef.current);
            }
            setVisibleTooltip(null);
            console.log(`🔍 POI BUTTON DEBUG: Mouse left ${poi.category}`);
          }}
        >
          <span 
            className="text-sm transition-all duration-200"
            style={{
              filter: isButtonActive 
                ? 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3)) brightness(1.1)' 
                : 'none',
              textShadow: isButtonActive 
                ? '0 1px 2px rgba(0, 0, 0, 0.2)' 
                : 'none',
              // Force repaint for icon styles too
              willChange: 'filter, text-shadow'
            }}
          >
            {displayIcon}
          </span>
        </button>
        {visibleTooltip === poi.category && createPortal(
          <div style={{
            position: 'fixed',
            left: '70px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 999999,
            padding: '6px 10px',
            background: 'rgba(17, 24, 39, 0.95)',
            color: 'white',
            borderRadius: '6px',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            fontSize: '11px',
            fontWeight: '500'
          }}>
            {displayLabel}
          </div>,
          document.body
        )}
      </div>
    );
  };

  // Debug logging for button configuration and active state
  console.log(`🔍 BUTTON PANEL DEBUG: Rendering ${POI_BUTTONS.length} buttons for site: ${currentSite}`);
  console.log(`🔍 BUTTON PANEL DEBUG: Active categories:`, activeCategories);
  console.log(`🔍 BUTTON PANEL DEBUG: Button categories:`, POI_BUTTONS.map(btn => btn.category));

  return (
    <div
      className="poi-left-panel"
      style={{
        position: 'fixed',
        left: '16px',
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        zIndex: 1000,
        padding: '8px',
        opacity: selectedPOI ? 0.3 : 1,
        transition: 'opacity 0.3s ease-in-out',
        pointerEvents: selectedPOI ? 'none' : 'auto',
      }}
    >
      <div className="flex flex-col">
        {/* Render all POI category buttons (including the rolling accommodation button) */}
        {POI_BUTTONS.map((poi, index) => {
          console.log(`🔍 MAPPING DEBUG: Rendering button ${index}: category="${poi.category}", active=${activeCategories.includes(poi.category)}`);
          return renderVerticalButton(poi, index);
        })}
      </div>
      <style>{`
        .poi-left-panel {
          animation: slideInFromLeft 0.3s ease-out;
        }
        @keyframes slideInFromLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .poi-button--inactive:hover {
          background: rgba(255, 255, 255, 0.3) !important;
        }
      `}</style>
    </div>
  );
};