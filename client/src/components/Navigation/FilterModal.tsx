import { POI_CATEGORIES, POICategory } from '@/types/poi-categories';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredCategories: string[];
  onToggleCategory: (category: string) => void;
}

const getEmojiForCategory = (iconName: string) => {
  switch (iconName) {
    case 'Utensils': return '🍽️';
    case 'Building2': return '🏢';
    case 'Waves': return '🌊';
    case 'Car': return '🚗';
    case 'Building': return '🏗️';
    case 'Campground': return '🏕️';
    case 'Activity': return '🔥';
    default: return '📍';
  }
};

export const FilterModal = ({ isOpen, onClose, filteredCategories, onToggleCategory }: FilterModalProps) => {
  const categories = Object.entries(POI_CATEGORIES) as [POICategory, typeof POI_CATEGORIES[POICategory]][];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800">Filter Places</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-1"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="p-4 space-y-3">
          {categories.map(([key, category]) => {
            const isActive = filteredCategories.includes(key);
            const emoji = getEmojiForCategory(category.icon);
            
            return (
              <Button
                key={key}
                variant={isActive ? "default" : "outline"}
                onClick={() => onToggleCategory(key)}
                className="w-full justify-start space-x-3 h-12"
              >
                <span className="text-lg">{emoji}</span>
                <span>{category.label}</span>
              </Button>
            );
          })}
        </div>
        
        <div className="p-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full"
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};