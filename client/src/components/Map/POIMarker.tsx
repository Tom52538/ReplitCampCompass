import { useState, useMemo } from 'react';
import { Marker } from 'react-leaflet';
import { divIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { POI_CATEGORIES } from '@/types/poi-categories';
import { POI } from '@/types/navigation';
import { useLanguage } from '@/hooks/useLanguage';
import { translateText } from '@/lib/i18n';

interface POIMarkerProps {
  poi: POI;
  isSelected: boolean;
  onClick: () => void;
  onNavigate?: (poi: POI) => void;
  showHoverTooltip?: boolean;
}

const getEmojiForCategory = (category: string, subCategory?: string): string => {
    switch (category) {
      case 'food-drink': return '🍽️';
      case 'services': return '🛠️';
      case 'toilets': return '🚻';
      case 'parking': return '🚗';
      case 'bungalows': return '🏡';
      case 'chalets': return '🏔️';
      case 'lodge': return '🏘️';
      case 'lodges': return '🏘️';
      case 'camping': return '🏕️';
      case 'beach_houses': return '🏖️';
      case 'facilities': return '🚿';
      case 'leisure': return '🏃';
      case 'religious': return '⛪';
      case 'shopping': return '🛒';
      case 'healthcare': return '🏥';
      // Handle OpenStreetMap categories for Zuhause location
      case 'amenity': return '🏢';
      case 'tourism': return '🏨';
      case 'shop': return '🛒';
      default: return '📍';
    }
  };

export const POIMarker = ({ poi, isSelected, onClick, onNavigate, showHoverTooltip = true }: POIMarkerProps) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const { language } = useLanguage();

  // Enhanced debug logging
  console.log(`🔍 POIMarker RENDER START:`, {
    name: poi.name,
    id: poi.id,
    coordinates: poi.coordinates,
    category: poi.category,
    isSelected,
    hasOnClick: !!onClick
  });

  const category = POI_CATEGORIES[poi.category as keyof typeof POI_CATEGORIES];
  const iconName = category?.icon || 'MapPin';
  const colorClass = category?.color || 'bg-gray-500';
  const emoji = getEmojiForCategory(poi.category, poi.subCategory);

  console.log(`🔍 POIMarker ICON DATA:`, {
    category: poi.category,
    iconName,
    colorClass,
    emoji,
    categoryExists: !!category
  });

  const markerIcon = useMemo(() => {
    const isBeachHouse6b = poi.category === 'beach_houses' && poi.subCategory === 'beach_house_6b';
    const isBeachHouse6a = poi.category === 'beach_houses' && poi.subCategory === 'beach_house_6a';
    const isBeachHouse4 = poi.category === 'beach_houses' && poi.subCategory === 'beach_house_4';
    const isLodge = poi.category === 'lodge';

    let iconContent;
    let backgroundClass = colorClass;

    if (isLodge) {
      // Custom light teal house icon matching legend for Lodge 4
      iconContent = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L22 12H20V22H4V12H2L12 2Z" fill="#2DD4BF" stroke="#14B8A6" stroke-width="1"/>
          <rect x="9" y="16" width="3" height="6" fill="#0F766E"/>
          <rect x="14" y="9" width="3" height="3" fill="#FFFFFF" stroke="#14B8A6" stroke-width="0.5"/>
        </svg>
      `;
      backgroundClass = 'bg-teal-400';
    } else if (isBeachHouse6b) {
      // Custom yellow house icon for Beach House 6b
      iconContent = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L22 12H20V22H4V12H2L12 2Z" fill="#FCD34D" stroke="#F59E0B" stroke-width="1"/>
          <rect x="9" y="16" width="3" height="6" fill="#92400E"/>
          <rect x="14" y="9" width="3" height="3" fill="#3B82F6" stroke="#1E40AF" stroke-width="0.5"/>
        </svg>
      `;
      backgroundClass = 'bg-yellow-400';
    } else if (isBeachHouse6a) {
      // Custom green house icon for Beach House 6a
      iconContent = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L22 12H20V22H4V12H2L12 2Z" fill="#34D399" stroke="#10B981" stroke-width="1"/>
          <rect x="9" y="16" width="3" height="6" fill="#92400E"/>
          <rect x="14" y="9" width="3" height="3" fill="#3B82F6" stroke="#1E40AF" stroke-width="0.5"/>
        </svg>
      `;
      backgroundClass = 'bg-green-400';
    } else if (isBeachHouse4) {
      // Custom turquoise/blue house icon for Beach House 4
      iconContent = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L22 12H20V22H4V12H2L12 2Z" fill="#22D3EE" stroke="#06B6D4" stroke-width="1"/>
          <rect x="9" y="16" width="3" height="6" fill="#92400E"/>
          <rect x="14" y="9" width="3" height="3" fill="#3B82F6" stroke="#1E40AF" stroke-width="0.5"/>
        </svg>
      `;
      backgroundClass = 'bg-cyan-400';
    } else {
      iconContent = `<span style="font-size: 16px; line-height: 1;">${emoji}</span>`;
    }

    // Enhanced visual hierarchy for selected/destination POIs
    const isDestinationPOI = isSelected;
    const markerSize = isDestinationPOI ? 48 : 32;
    const iconSize = isDestinationPOI ? 'w-8 h-8' : 'w-6 h-6';
    const iconContentSize = isDestinationPOI ? '22px' : '16px';
    const pulseAnimation = isDestinationPOI ? 'animate-pulse' : '';
    const specialShadow = isDestinationPOI ? 'shadow-2xl ring-4 ring-blue-300/50' : 'shadow-md';
    const opacity = isDestinationPOI ? 'opacity-100' : 'opacity-80 hover:opacity-100';
    const zIndex = isDestinationPOI ? 'z-50' : 'z-20';

    const icon = divIcon({
      html: `
        <div class="poi-marker-wrapper ${pulseAnimation}" style="width: ${markerSize}px; height: ${markerSize}px; display: flex; align-items: center; justify-content: center;">
          <div class="${iconSize} rounded-full border-2 border-white ${specialShadow} flex items-center justify-center text-white text-xs font-bold cursor-pointer transition-all duration-300 hover:scale-125 ${zIndex} ${backgroundClass} ${opacity}" style="display: flex; align-items: center; justify-content: center; position: relative; z-index: ${isDestinationPOI ? '2000' : '1000'};">
            ${iconContent.includes('<svg') ? iconContent.replace('width="18"', `width="${iconContentSize}"`).replace('height="18"', `height="${iconContentSize}"`) : `<span style="font-size: ${iconContentSize}; line-height: 1;">${emoji}</span>`}
          </div>
        </div>
      `,
      className: `poi-marker-container ${isDestinationPOI ? 'destination-poi' : ''}`,
      iconSize: [markerSize, markerSize],
      iconAnchor: [markerSize/2, markerSize/2],
    });

    console.log(`🔍 POIMarker ICON CREATED for ${poi.name}`, {
      isBeachHouse6b,
      isBeachHouse6a,
      isBeachHouse4,
      subCategory: poi.subCategory,
      category: poi.category,
      backgroundClass
    });
    return icon;
  }, [poi.category, poi.subCategory, colorClass, emoji, isSelected, poi.name]);

  const eventHandlers = useMemo(() => ({
    click: (e: any) => {
      e.originalEvent?.stopPropagation();
      console.log(`🔍 POIMarker CLICKED: ${poi.name}`, { poi });
      console.log('🔍 POIMarker: About to call onClick for', poi.name);

      if (onClick) {
        console.log('🔍 POIMarker: Calling onClick with POI data:', poi);
        onClick(poi);
        console.log('🔍 POIMarker: onClick called successfully for', poi.name);
      } else {
        console.log('🔍 POIMarker: No onClick handler provided!');
      }
    },
    ...(showHoverTooltip && {
      mouseover: (e: any) => {
        console.log(`🔍 POIMarker HOVER: ${poi.name}`);
        const marker = e.target;
        const translatedName = translateText(poi.name, language);
        const translatedDescription = poi.description ? translateText(poi.description, language) : '';
        const translatedNavigateText = translateText('Click to select for navigation', language);

        const tooltipContent = `
          <div style="font-family: system-ui; font-size: 12px; line-height: 1.4; padding: 6px 8px;">
            ${poi.lodge_number ? `<div style="font-weight: 600; color: #1f2937; margin-bottom: 2px;">Lodge Nr. ${poi.lodge_number}</div>` : ''}
            <div style="font-weight: 600; color: #1f2937; margin-bottom: 4px;">${translatedName}</div>
            ${poi.distance ? `<div style="color: #059669; font-weight: 500; font-size: 11px;">📍 ${poi.distance}</div>` : ''}
            <div style="color: #3b82f6; font-size: 10px; margin-top: 4px; font-style: italic;">${translatedNavigateText}</div>
          </div>
        `;

        marker.bindTooltip(tooltipContent, {
          permanent: false,
          direction: 'top',
          offset: [0, -10],
          className: 'custom-poi-tooltip',
          opacity: 0.95
        }).openTooltip();
      },
      mouseout: (e: any) => {
        const marker = e.target;
        marker.closeTooltip();
      }
    })
  }), [poi.name, poi.category, poi.description, poi.distance, onClick, onNavigate, showHoverTooltip, language]);

  console.log(`🔍 POIMarker RENDER COMPLETE: ${poi.name}`);

  return (
    <Marker
      position={[poi.coordinates.lat, poi.coordinates.lng]}
      icon={markerIcon}
      eventHandlers={eventHandlers}
    />
  );
};