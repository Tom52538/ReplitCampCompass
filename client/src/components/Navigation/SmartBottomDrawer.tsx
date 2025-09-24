import { useState, useCallback, useEffect } from 'react';
import { ChevronUp, ChevronDown, X, Navigation, MapPin, Search, Settings } from 'lucide-react';
import { POI, NavigationRoute } from '@/types/navigation';
import { useLanguage } from '@/hooks/useLanguage';
import { formatDistance } from '@/lib/mapUtils';

interface SmartBottomDrawerProps {
  mode: 'search' | 'poi-info' | 'navigation' | 'settings';
  searchResults?: POI[];
  selectedPOI?: POI | null;
  currentRoute?: NavigationRoute | null;
  onPOISelect?: (poi: POI) => void;
  onNavigateToPOI?: (poi: POI) => void;
  onClose?: () => void;
}

type DrawerHeight = 'peek' | 'half' | 'full';

export const SmartBottomDrawer = ({
  mode,
  searchResults = [],
  selectedPOI,
  currentRoute,
  onPOISelect,
  onNavigateToPOI,
  onClose
}: SmartBottomDrawerProps) => {
  const { t } = useLanguage();
  const [height, setHeight] = useState<DrawerHeight>('peek');
  const [isVisible, setIsVisible] = useState(true);

  // Auto-adjust height based on content
  useEffect(() => {
    if (mode === 'navigation' && currentRoute) {
      setHeight('peek');
    } else if (mode === 'poi-info' && selectedPOI) {
      setHeight('half');
    } else if (mode === 'search' && searchResults.length > 0) {
      setHeight('half');
    } else {
      setHeight('peek');
    }
  }, [mode, currentRoute, selectedPOI, searchResults.length]);

  const getDrawerHeight = () => {
    switch (height) {
      case 'peek': return '80px';
      case 'half': return '40vh';
      case 'full': return '80vh';
      default: return '80px';
    }
  };

  const toggleHeight = useCallback(() => {
    if (height === 'peek') {
      setHeight('half');
    } else if (height === 'half') {
      setHeight('full');
    } else {
      setHeight('peek');
    }
  }, [height]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    onClose?.();
  }, [onClose]);

  if (!isVisible) return null;

  return (
    <div 
      className="fixed left-0 right-0 z-40 transition-all duration-300 ease-in-out"
      style={{
        bottom: '0px',
        height: getDrawerHeight(),
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%)',
        backdropFilter: 'blur(16px) saturate(180%)',
        borderTopLeftRadius: '20px',
        borderTopRightRadius: '20px',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        borderBottom: 'none',
        boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.5)'
      }}
    >
      {/* Drawer Handle */}
      <div 
        className="flex items-center justify-center py-3 cursor-pointer"
        onClick={toggleHeight}
      >
        <div className="w-12 h-1 bg-gray-300 rounded-full opacity-60"></div>
        {height === 'peek' ? (
          <ChevronUp className="w-5 h-5 text-gray-500 ml-2" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500 ml-2" />
        )}
      </div>

      {/* Content Area */}
      <div className="px-4 pb-4 overflow-y-auto" style={{ height: 'calc(100% - 48px)' }}>
        {/* Navigation Mode */}
        {mode === 'navigation' && currentRoute && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Navigation className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-gray-900">{t('navigation.active')}</span>
              </div>
              <button
                onClick={handleClose}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">{currentRoute.totalDistance}</div>
                <div className="text-sm text-gray-600">{t('navigation.distance')}</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">{currentRoute.estimatedTime}</div>
                <div className="text-sm text-gray-600">{t('navigation.time')}</div>
              </div>
            </div>

            {currentRoute.nextInstruction && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-900">
                  {typeof currentRoute.nextInstruction.instruction === 'string' ? currentRoute.nextInstruction.instruction : 'Continue straight'}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  {t('navigation.in')} {currentRoute.nextInstruction.distance}
                </p>
              </div>
            )}
          </div>
        )}

        {/* POI Info Mode */}
        {mode === 'poi-info' && selectedPOI && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-gray-900">{selectedPOI.name}</span>
              </div>
              <button
                onClick={handleClose}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="space-y-2">
              
              
              {selectedPOI.distance && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">{t('poi.distance')}:</span>
                  <span className="text-sm font-medium text-gray-900">{selectedPOI.distance}</span>
                </div>
              )}

              {selectedPOI.description && (
                <div className="mt-3">
                  <p className="text-sm text-gray-700">{selectedPOI.description}</p>
                </div>
              )}

              {selectedPOI.amenities && selectedPOI.amenities.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-gray-900 mb-2">{t('poi.amenities')}:</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedPOI.amenities.map((amenity, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => onNavigateToPOI?.(selectedPOI)}
              className="w-full mt-4 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              {t('navigation.navigateTo')}
            </button>
          </div>
        )}

        {/* Search Results Mode */}
        {mode === 'search' && searchResults.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Search className="w-5 h-5 text-purple-600" />
                <span className="font-semibold text-gray-900">
                  {t('search.results')} ({searchResults.length})
                </span>
              </div>
              <button
                onClick={handleClose}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="space-y-2">
              {searchResults.map((poi) => (
                <div
                  key={poi.id}
                  className="p-3 bg-white bg-opacity-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-opacity-70 transition-all"
                  onClick={() => onPOISelect?.(poi)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{poi.name}</h4>
                      <p className="text-sm text-gray-600 capitalize">{poi.category}</p>
                    </div>
                    {poi.distance && (
                      <span className="text-sm font-medium text-blue-600">{poi.distance}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings Mode */}
        {mode === 'settings' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Settings className="w-5 h-5 text-gray-600" />
                <span className="font-semibold text-gray-900">{t('settings.title')}</span>
              </div>
              <button
                onClick={handleClose}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            
            <div className="text-center py-8">
              <p className="text-gray-600">{t('settings.comingSoon')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};