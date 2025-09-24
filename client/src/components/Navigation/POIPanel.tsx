import React from 'react';
import { POI } from '@/types/navigation';
import { POI_CATEGORIES } from '@/types/poi-categories';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navigation, X, MapPin } from 'lucide-react';
import { getEmojiForCategory, getColorForCategory } from '../../../../shared/emoji';

interface POIPanelProps {
  poi: POI | null;
  isVisible: boolean;
  onNavigate: (poi: POI) => void;
  onClose: () => void;
}

export const POIPanel = React.memo(({ poi, isVisible, onNavigate, onClose }: POIPanelProps) => {
  console.log('RENDERING: POIPanel', { poi: poi?.name, isVisible });
  if (!poi) return null;

  const category = POI_CATEGORIES[poi.category as keyof typeof POI_CATEGORIES];
  const emoji = getEmojiForCategory(poi.category);
  const bgColor = category?.color || getColorForCategory(poi.category);

  return (
    <div className={`navigation-panel z-30 ${!isVisible ? 'hidden' : ''}`}>
      {/* Panel Handle */}
      <div className="flex justify-center py-3">
        <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
      </div>
      
      {/* POI Details */}
      <div className="px-6 pb-6">
        <div className="flex items-start space-x-4 mb-4">
          <div className={`${bgColor} rounded-xl p-3`}>
            <div className="text-white text-xl">
              {emoji}
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-800 mb-1">{poi.name}</h3>
            <p className="text-gray-600 mb-2">{category?.name || poi.category}</p>
            {poi.distance && (
              <div className="flex items-center text-sm text-gray-500">
                <MapPin className="w-4 h-4 mr-1" />
                <span>{poi.distance} away</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Amenities */}
        {poi.amenities && poi.amenities.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Amenities</h4>
            <div className="flex flex-wrap gap-2">
              {poi.amenities.map((amenity, index) => (
                <Badge key={index} variant="secondary">
                  {amenity}
                </Badge>
              ))}
            </div>
          </div>
        )}
        

        {/* Description */}
        {poi.description && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Description</h4>
            <p className="text-gray-600 text-sm">{poi.description}</p>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex space-x-3">
          <Button
            className="flex-1"
            onClick={() => onNavigate(poi)}
          >
            <Navigation className="w-4 h-4 mr-2" />
            Navigate Here
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
});
