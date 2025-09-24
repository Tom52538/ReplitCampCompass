import React from 'react';
import { POI } from '@/types/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navigation as NavigationIcon, X, MapPin, Phone, Globe, Clock, Star, Euro, Users, Wifi, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { buildImageUrl } from '@/lib/utils';



interface EnhancedPOIDialogProps {
  poi: POI | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (poi: POI) => void;
}

interface EnrichmentData {
  accommodation_id: string;
  name: string;
  description: string;
  features: string[];
  price_info: string;
  url?: string;
  capacity?: {
    max_persons: number;
  };
  images?: {
    primary?: {
      local_path: string;
      category: string;
    };
    gallery?: Array<{
      local_path: string;
      category: string;
    }>;
  };
}

export const EnhancedPOIDialog = ({ poi, isOpen, onClose, onNavigate }: EnhancedPOIDialogProps) => {
  const { t, translateText, currentLanguage } = useLanguage();
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  const [isImageExpanded, setIsImageExpanded] = React.useState(false);
  const [enrichmentData, setEnrichmentData] = React.useState<EnrichmentData | null>(null);
  const [isLoadingEnrichment, setIsLoadingEnrichment] = React.useState(false);

  // Check if this is an accommodation type that shouldn't show operating hours
  const isAccommodationType = poi?.category?.includes('beach_house') ||
                             poi?.category?.includes('beach_houses') ||
                             poi?.category?.includes('bungalow') ||
                             poi?.category?.includes('chalet') ||
                             poi?.category?.includes('lodge') ||
                             poi?.category?.includes('accommodation') ||
                             poi?.name.toLowerCase().includes('beach house') ||
                             poi?.name.toLowerCase().includes('strandhaus') ||
                             poi?.name.toLowerCase().includes('lodge');
  const [touchStart, setTouchStart] = React.useState<number | null>(null);
  const [touchEnd, setTouchEnd] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (poi && isOpen) {
      setCurrentImageIndex(0); // Reset image index

      // Check if POI already has enrichment data (from new /api/pois/:id endpoint)
      // Prioritize normalized primaryImage/imageGallery over raw images when available
      if (poi.enriched && (poi.primaryImage || poi.imageGallery)) {
        // FORCE GERMAN CONTENT if user language is German
        let processedDescription = poi.description || '';
        let processedFeatures = poi.features || [];
        let processedPriceInfo = poi.price_info || '';

        if (currentLanguage === 'de') {
          // Force German description for all accommodation types
          if (processedDescription.includes('Modern beach house')) {
            processedDescription = 'Modernes Strandhaus mit Premium-Ausstattung, ideal für Familien, die einen komfortablen Küstenurlaub suchen.';
          } else if (processedDescription.includes('Comfortable lodge accommodation')) {
            processedDescription = 'Komfortable Lodge-Unterkunft im Water Village, perfekt für Familien, die ein einzigartiges wasserbezogenes Camping-Erlebnis suchen.';
          } else if (processedDescription.includes('Comfortable beach house')) {
            processedDescription = 'Komfortables Strandhaus mit modernen Annehmlichkeiten, perfekt für Familien, die einen entspannten Küstenurlaub suchen.';
          } else if (processedDescription.includes('Cozy beach house')) {
            processedDescription = 'Gemütliches Strandhaus perfekt für kleinere Familien, mit modernen Annehmlichkeiten und direktem Strandzugang.';
          }

          // Force German features
          const germanFeatureMap: Record<string, string> = {
            'WiFi': 'WLAN',
            'Premium Terrace': 'Premium-Terrasse',
            'Dishwasher': 'Spülmaschine',
            'Smart TV': 'Smart TV',
            'Private Parking': 'Privater Parkplatz',
            'Garden': 'Garten',
            'Sea View': 'Meerblick'
          };

          processedFeatures = processedFeatures.map(feature => 
            germanFeatureMap[feature] || feature
          );

          // Force German price info
          if (processedPriceInfo.includes('from €')) {
            processedPriceInfo = processedPriceInfo.replace('from €', 'ab €').replace('per night', 'pro Nacht');
          }
        }

        // Convert POI enrichment data to EnrichmentData format using normalized image fields
        const enrichedData: EnrichmentData = {
          accommodation_id: poi.accommodation_id || poi.id,
          name: poi.name,
          description: processedDescription,
          features: processedFeatures,
          price_info: processedPriceInfo,
          capacity: poi.capacity,
          images: {
            primary: poi.primaryImage ? { local_path: poi.primaryImage, category: 'primary' } : undefined,
            gallery: (poi.imageGallery || []).map(img => ({ 
              local_path: img.url,
              category: img.category || 'unknown'
            }))
          }
        };

        setEnrichmentData(enrichedData);
        setIsLoadingEnrichment(false);
      } else if (poi.enriched && poi.images) {
        // Process enrichment data with correct language
        let processedDescription = poi.description || '';
        let processedFeatures = poi.features || [];
        let processedPriceInfo = poi.price_info || '';

        // Force German translations if user language is German
        if (currentLanguage === 'de') {
          // Translate description to German for all accommodation types
          if (processedDescription.includes('Modern beach house')) {
            processedDescription = 'Modernes Strandhaus mit Premium-Ausstattung, ideal für Familien, die einen komfortablen Küstenurlaub suchen.';
          } else if (processedDescription.includes('Comfortable lodge accommodation')) {
            processedDescription = 'Komfortable Lodge-Unterkunft im Water Village, perfekt für Familien, die ein einzigartiges wasserbezogenes Camping-Erlebnis suchen.';
          } else if (processedDescription.includes('Comfortable beach house')) {
            processedDescription = 'Komfortables Strandhaus mit modernen Annehmlichkeiten, perfekt für Familien, die einen entspannten Küstenurlaub suchen.';
          } else if (processedDescription.includes('Cozy beach house')) {
            processedDescription = 'Gemütliches Strandhaus perfekt für kleinere Familien, mit modernen Annehmlichkeiten und direktem Strandzugang.';
          }

          // Translate features to German
          const germanFeatureMap: Record<string, string> = {
            'WiFi': 'WLAN',
            'Premium Terrace': 'Premium-Terrasse',
            'Dishwasher': 'Spülmaschine',
            'Smart TV': 'Smart TV',
            'Private Parking': 'Privater Parkplatz',
            'Garden': 'Garten',
            'Sea View': 'Meerblick'
          };

          processedFeatures = processedFeatures.map(feature => 
            germanFeatureMap[feature] || feature
          );

          // Translate price info to German
          if (processedPriceInfo.includes('from €')) {
            processedPriceInfo = processedPriceInfo.replace('from €', 'ab €').replace('per night', 'pro Nacht');
          }
        }

        // Fallback to raw poi.images for backward compatibility
        const enrichedData: EnrichmentData = {
          accommodation_id: poi.accommodation_id || poi.id,
          name: poi.name,
          description: processedDescription,
          features: processedFeatures,
          price_info: processedPriceInfo,
          capacity: poi.capacity,
          images: poi.images
        };

        setEnrichmentData(enrichedData);
        setIsLoadingEnrichment(false);
      } else {
        fetchEnrichmentData();
      }
    }
  }, [poi?.id, isOpen]);

  // Swipe detection
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (enrichmentData?.images) {
      const allImages = [
        ...(enrichmentData.images.primary ? [enrichmentData.images.primary] : []),
        ...(enrichmentData.images.gallery || [])
      ];

      if (isLeftSwipe && currentImageIndex < allImages.length - 1) {
        setCurrentImageIndex(prev => prev + 1);
      }
      if (isRightSwipe && currentImageIndex > 0) {
        setCurrentImageIndex(prev => prev - 1);
      }
    }
  };

  const nextImage = () => {
    if (enrichmentData?.images) {
      const allImages = [
        ...(enrichmentData.images.primary ? [enrichmentData.images.primary] : []),
        ...(enrichmentData.images.gallery || [])
      ];
      if (currentImageIndex < allImages.length - 1) {
        setCurrentImageIndex(prev => prev + 1);
      }
    }
  };

  const prevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(prev => prev - 1);
    }
  };

  // Preload images when enrichment data is available - STABLE VERSION
  React.useEffect(() => {
    if (enrichmentData?.images && enrichmentData.accommodation_id) {
      // Preload primary image
      if (enrichmentData.images.primary) {
        const img = new Image();
        img.src = buildImageUrl(enrichmentData.images.primary.local_path);
      }

      // Preload gallery images
      if (enrichmentData.images.gallery) {
        enrichmentData.images.gallery.slice(0, 4).forEach((image) => {
          const img = new Image();
          img.src = buildImageUrl(image.local_path);
        });
      }
    }
  }, [enrichmentData?.accommodation_id]);

  const fetchEnrichmentData = async () => {
    if (!poi) return;

    setIsLoadingEnrichment(true);
    try {
      // Check if POI already has enrichment data (from Navigation.tsx API call)
      if (poi.enriched && (poi.capacity || poi.price_info || poi.imageGallery || poi.primaryImage)) {
        // Use existing processed content from enrichment
        const processedDescription = poi.description || '';
        const processedFeatures = poi.features || [];
        const processedPriceInfo = poi.price_info || '';
      } else if (poi.enriched && poi.images) {
        // Process enrichment data with correct language
        let processedDescription = poi.description || '';
        let processedFeatures = poi.features || [];
        let processedPriceInfo = poi.price_info || '';

        // Force German translations if user language is German
        if (currentLanguage === 'de') {
          // Translate description to German for all accommodation types
          if (processedDescription.includes('Modern beach house')) {
            processedDescription = 'Modernes Strandhaus mit Premium-Ausstattung, ideal für Familien, die einen komfortablen Küstenurlaub suchen.';
          } else if (processedDescription.includes('Comfortable lodge accommodation')) {
            processedDescription = 'Komfortable Lodge-Unterkunft im Water Village, perfekt für Familien, die ein einzigartiges wasserbezogenes Camping-Erlebnis suchen.';
          } else if (processedDescription.includes('Comfortable beach house')) {
            processedDescription = 'Komfortables Strandhaus mit modernen Annehmlichkeiten, perfekt für Familien, die einen entspannten Küstenurlaub suchen.';
          } else if (processedDescription.includes('Cozy beach house')) {
            processedDescription = 'Gemütliches Strandhaus perfekt für kleinere Familien, mit modernen Annehmlichkeiten und direktem Strandzugang.';
          }

          // Translate features to German
          const germanFeatureMap: Record<string, string> = {
            'WiFi': 'WLAN',
            'Premium Terrace': 'Premium-Terrasse',
            'Dishwasher': 'Spülmaschine',
            'Smart TV': 'Smart TV',
            'Private Parking': 'Privater Parkplatz',
            'Garden': 'Garten',
            'Sea View': 'Meerblick'
          };

          processedFeatures = processedFeatures.map(feature => 
            germanFeatureMap[feature] || feature
          );

          // Translate price info to German
          if (processedPriceInfo.includes('from €')) {
            processedPriceInfo = processedPriceInfo.replace('from €', 'ab €').replace('per night', 'pro Nacht');
          }
        }

        // Fallback to raw poi.images for backward compatibility
        const processedData = {
          ...poi, // Spread existing poi properties
          name: poi.name,
          description: processedDescription,
          features: processedFeatures,
          price_info: processedPriceInfo,
          images: poi.images
        };

        setEnrichmentData(processedData);
        setIsLoadingEnrichment(false);
        return;
      }


      // Fallback: Try the old enrichment search API (for backward compatibility)
      const response = await fetch(`/api/enrichment/search?q=${encodeURIComponent(poi.name)}&poi_id=${encodeURIComponent(poi.id)}`);
      if (response.ok) {
        const data = await response.json();

        if (data && Object.keys(data).length > 0) {
          // Get the first enrichment match
          const firstKey = Object.keys(data)[0];
          const enrichment = data[firstKey];

          // Process the enrichment data for current language - USE CURRENT LANGUAGE FROM HOOK
          const userLang = translateText('test') === 'test' ? 'en' : 'de'; // Simple detection

          const processedData = {
            ...enrichment,
            name: enrichment.name?.[userLang] || enrichment.name?.en || enrichment.name || poi.name,
            description: enrichment.description?.[userLang] || enrichment.description?.en || enrichment.description || '',
            features: enrichment.features?.[userLang] || enrichment.features?.en || enrichment.features || [],
            price_info: enrichment.price_info?.[userLang] || enrichment.price_info?.en || enrichment.price_info || ''
          };

          setEnrichmentData(processedData);
        } else {
          setEnrichmentData(null);
        }
      } else {
        setEnrichmentData(null);
      }
    } catch (error) {
      setEnrichmentData(null);
    } finally {
      setIsLoadingEnrichment(false);
    }
  };

  if (!poi) return null;


  const renderEnrichmentContent = () => {
    if (isLoadingEnrichment) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading details...</span>
        </div>
      );
    }

    if (!enrichmentData) {
      return (
        <div className="text-center py-4">
          <p className="text-gray-600">No additional details available</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Image Gallery with Swipe */}
        {enrichmentData.images && (() => {
          const allImages = [
            ...(enrichmentData.images.primary ? [enrichmentData.images.primary] : []),
            ...(enrichmentData.images.gallery || [])
          ];

          if (allImages.length === 0) return null;

          return (
            <div className="relative">
              {/* Main Image Display */}
              <div
                className="relative w-full h-40 sm:h-48 md:h-56 lg:h-64 rounded-lg overflow-hidden shadow-md bg-gray-100"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
              >
                {/* Loading spinner */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
                <img
                  src={buildImageUrl(allImages[currentImageIndex].local_path)}
                  alt={`${poi.name} - ${allImages[currentImageIndex].category}`}
                  className="w-full h-full object-cover transition-opacity duration-300"
                  crossOrigin="anonymous"
                  loading="eager"
                  onLoad={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const errorDiv = e.currentTarget.nextElementSibling;
                    if (errorDiv && errorDiv.classList.contains('error-placeholder')) {
                      (errorDiv as HTMLElement).style.display = 'flex';
                    }
                  }}
                  style={{ opacity: 0 }}
                />
                <div
                  className="error-placeholder w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm absolute inset-0"
                  style={{ display: 'none' }}
                >
                  <div className="text-center">
                    <div className="mb-2">📷</div>
                    <div>Image not available</div>
                  </div>
                </div>

                {/* Navigation Arrows - only show if multiple images */}
                {allImages.length > 1 && (
                  <>
                    {/* Left Arrow */}
                    {currentImageIndex > 0 && (
                      <button
                        onClick={prevImage}
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-all"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    )}

                    {/* Right Arrow */}
                    {currentImageIndex < allImages.length - 1 && (
                      <button
                        onClick={nextImage}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-all"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}

                    {/* Image Counter */}
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      {currentImageIndex + 1} / {allImages.length}
                    </div>
                  </>
                )}
              </div>

              {/* Thumbnail Navigation - only show if multiple images */}
              {allImages.length > 1 && (
                <div className="flex gap-1 mt-1.5 overflow-x-auto pb-1">
                  {allImages.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18 rounded overflow-hidden border-2 transition-all ${
                        index === currentImageIndex
                          ? 'border-blue-500 ring-1 ring-blue-300'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={buildImageUrl(image.local_path)}
                        alt={`${poi.name} thumbnail ${index + 1}`}
                        className="w-full h-full object-cover transition-opacity duration-200"
                        crossOrigin="anonymous"
                        loading="lazy"
                        onLoad={(e) => {
                          e.currentTarget.style.opacity = '1';
                        }}
                        onError={(e) => {
                          e.currentTarget.style.opacity = '0.3';
                          e.currentTarget.style.filter = 'grayscale(1)';
                        }}
                        style={{ opacity: 0 }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Enhanced Description */}
        {enrichmentData.description && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center text-base md:text-lg">
              <Star className="w-5 h-5 mr-2 text-yellow-500" />
              {t('accommodation.about')}
            </h4>
            <div
              className="rounded-lg p-4 md:p-5"
              style={{
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
              }}
            >
              <p className="text-gray-900 leading-relaxed font-medium text-sm md:text-base">{enrichmentData.description}</p>
            </div>
          </div>
        )}

        {/* Capacity & Pricing */}
        {(enrichmentData.capacity || enrichmentData.price_info) && (
          <div
            className="rounded-lg p-4 md:p-5 space-y-3"
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
            }}
          >
            {enrichmentData.capacity && (
              <div className="flex items-center">
                <Users className="w-5 h-5 mr-3 text-blue-600" />
                <span className="text-gray-900 font-medium text-sm md:text-base">
                  {t('accommodation.upTo')} <strong>{enrichmentData.capacity.max_persons}</strong> {t('accommodation.guestsCount')}
                </span>
              </div>
            )}

            {enrichmentData.price_info && (
              <div className="flex items-center">
                <Euro className="w-5 h-5 mr-3 text-green-600" />
                <span className="text-gray-900 font-medium text-sm md:text-base">{enrichmentData.price_info}</span>
              </div>
            )}
          </div>
        )}

        {/* Website URL */}
        {enrichmentData.url && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center text-base md:text-lg">
              <Globe className="w-5 h-5 mr-2 text-blue-500" />
              {t('accommodation.website')}
            </h4>
            <div
              className="rounded-lg p-4 md:p-5"
              style={{
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
              }}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(enrichmentData.url, '_blank', 'noopener,noreferrer')}
                className="h-8 px-3 text-blue-600 border-blue-600 hover:bg-blue-50 hover:text-blue-700"
              >
                <Globe className="w-3 h-3 mr-1" />
                {t('accommodation.website')}
              </Button>
            </div>
          </div>
        )}

        {/* Features */}
        {enrichmentData.features && enrichmentData.features.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center text-base md:text-lg">
              <Wifi className="w-5 h-5 mr-2 text-green-500" />
              {t('accommodation.features')}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {enrichmentData.features.map((feature, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="justify-start p-3 text-gray-900 font-medium text-sm md:text-base h-auto"
                  style={{
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                  }}
                >
                  {feature}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-[95vw] sm:max-w-[90vw] md:max-w-2xl lg:max-w-3xl max-h-[85vh] sm:max-h-[80vh] md:max-h-[85vh] overflow-y-auto border-0 m-1 sm:m-2 p-3 sm:p-4 md:p-6"
        style={{
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(40px) saturate(200%)',
          WebkitBackdropFilter: 'blur(40px) saturate(200%)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        }}
      >
        <DialogHeader className="space-y-2 pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 break-words">
              {poi.name}
            </DialogTitle>
              <div className="flex items-center mt-2 space-x-2">
                <Badge variant="outline" className="text-sm bg-white/50 px-2 py-1">
                  {poi.category === 'lodge' && currentLanguage === 'de' ? 'Lodge' :
                   poi.category === 'beach_house' && currentLanguage === 'de' ? 'Strandhaus' :
                   poi.category === 'bungalow' && currentLanguage === 'de' ? 'Bungalow' :
                   poi.roompot_category || translateText(poi.category) || 'Location'}
                </Badge>
                {poi.distance && (
                  <div className="flex items-center text-sm text-gray-500">
                    <MapPin className="w-4 h-4 mr-1" />
                    {poi.distance} {t('poi.away')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Basic POI Info */}
        {poi.description && !enrichmentData && (
          <div className="border-t pt-2">
            <p className="text-gray-600 text-sm leading-relaxed">{translateText(poi.description || '')}</p>
          </div>
        )}

        {/* Contact Info */}
        {(poi.phone || poi.opening_hours) && (
          <div className="border-t pt-1.5 space-y-1">
            {poi.phone && (
              <div className="flex items-center text-xs">
                <Phone className="w-3 h-3 mr-1.5 text-gray-500 flex-shrink-0" />
                <span className="text-gray-700 truncate">{poi.phone}</span>
              </div>
            )}
            {poi.opening_hours && (
              <div className="flex items-center text-xs">
                <Clock className="w-3 h-3 mr-1.5 text-gray-500 flex-shrink-0" />
                <span className="text-gray-700 truncate">{translateText(poi.opening_hours)}</span>
              </div>
            )}
          </div>
        )}

        {/* Operational Info Section - Enhanced */}
        {(poi.opening_hours || poi.hours || (poi.amenities && poi.amenities.length > 0)) && !isAccommodationType && (
          <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-200/40">
            <h4 className="text-sm font-semibold text-amber-800 mb-2 flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              {t('poi.operationalInfo')}
            </h4>
            {(poi.opening_hours || poi.hours) && (
              <div className="text-sm text-amber-700 mb-1">
                <span className="font-medium">{t('poi.hours')}: </span>
                {translateText(poi.opening_hours || poi.hours || '')}
              </div>
            )}
            {poi.amenities?.filter(amenity => !amenity.toLowerCase().includes('website') && !amenity.toLowerCase().includes('phone')).map((amenity, index) => (
              <div key={index} className="text-sm text-amber-700">
                {translateText(amenity)}
              </div>
            ))}
          </div>
        )}

        {/* Enrichment Content */}
        <div className="border-t pt-1">
          {renderEnrichmentContent()}
        </div>

        {/* Basic Amenities */}
        {poi.amenities && poi.amenities.length > 0 && !enrichmentData && (
          <div className="border-t pt-1.5">
            <h4 className="font-semibold text-gray-800 mb-1 text-sm">Amenities</h4>
            <div className="flex flex-wrap gap-1">
              {poi.amenities.map((amenity, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {translateText(amenity)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Website Button at Bottom */}
        {(() => {
          // Check if this POI is enrichment-eligible
          const isEnrichmentEligible = !!(
            (poi as any)?.roompot_category || 
            (poi as any)?.building_type || 
            poi?.name?.toLowerCase().includes('lodge') ||
            poi?.name?.toLowerCase().includes('beach house') ||
            poi?.name?.toLowerCase().includes('bungalow') ||
            poi?.name?.toLowerCase().includes('strandhaus')
          );

          // Determine final URL from all sources
          const finalUrl = enrichmentData?.url || 
                           (poi as any)?.url || 
                           (poi as any)?.website ||
                           (poi as any)?.accommodationUrl ||
                           (poi as any)?.roompot_url;

          // Validate URL scheme for security
          const isValidUrl = finalUrl && (
            finalUrl.startsWith('http://') || 
            finalUrl.startsWith('https://') ||
            finalUrl.startsWith('www.')
          );

          // Normalize URL - add https if missing
          const safeUrl = finalUrl && !finalUrl.startsWith('http') ? `https://${finalUrl}` : finalUrl;

          // Always show button for enrichment-eligible POIs or POIs with URLs
          if (isEnrichmentEligible || finalUrl) {
            const isDisabled = isLoadingEnrichment || !isValidUrl;

            const buttonText = isLoadingEnrichment 
              ? translateText('Loading website information...') 
              : isValidUrl 
                ? translateText('Visit website') 
                : translateText('Website not available');

            return (
              <div className="border-t pt-4 mt-4">
                <Button
                  disabled={isDisabled}
                  variant={isDisabled ? "outline" : "default"}
                  onClick={() => {
                    if (safeUrl && isValidUrl) {
                      window.open(safeUrl, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  className={`w-full h-12 md:h-14 shadow-lg flex items-center justify-center mb-2 ${
                    isDisabled 
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                  size="lg"
                >
                  {isLoadingEnrichment ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400 mr-2"></div>
                  ) : (
                    <Globe className="w-5 h-5 mr-2" />
                  )}
                  <span className="text-sm md:text-base font-semibold">{buttonText}</span>
                </Button>
                {safeUrl && !isLoadingEnrichment && (
                  <p className="text-xs text-gray-500 text-center break-all mb-2">
                    {safeUrl}
                  </p>
                )}
              </div>
            );
          }

          return null;
        })()}

        {/* Navigation Button at Bottom */}
        {onNavigate && (
          <div className={!enrichmentData && !isLoadingEnrichment ? "border-t pt-4 mt-4" : "mt-2"}>
            <Button
              onClick={() => onNavigate(poi)}
              className="w-full bg-green-600 hover:bg-green-700 shadow-lg h-12 md:h-14"
              size="lg"
            >
              <NavigationIcon className="w-5 h-5" />
              <span className="text-sm md:text-base font-semibold">{t('navigation.navigateHere')}</span>
            </Button>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
};