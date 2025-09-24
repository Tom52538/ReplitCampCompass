import { POI } from '@/types/navigation';
import { POI_CATEGORIES } from '@/types/poi-categories';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navigation, X, MapPin, Phone, Globe, Clock, Users, Euro, Star, Wifi, ExternalLink } from 'lucide-react';
import { cn, buildImageUrl } from '@/lib/utils';
import { useLanguage } from '@/hooks/useLanguage'; // Assuming useLanguage is in '@/hooks/useLanguage'

interface POIDetailContentProps {
  poi: POI;
  onNavigate?: (poi: POI) => void;
  onClose?: () => void;
  layoutMode?: 'mobile' | 'tablet' | 'desktop';
  enrichmentData?: any;
  isLoadingEnrichment?: boolean;
}

export const POIDetailContent = ({ 
  poi, 
  onNavigate, 
  onClose, 
  layoutMode = 'mobile',
  enrichmentData,
  isLoadingEnrichment = false
}: POIDetailContentProps) => {
  const { t, translateText, currentLanguage } = useLanguage(); // Use destructuring to get translateText and currentLanguage
  const category = POI_CATEGORIES[poi.category as keyof typeof POI_CATEGORIES];

  // Comprehensive URL debugging
  console.log('🔗 POIDetailContent URL Debug:', {
    poi_name: poi.name,
    poi_url: poi.url,
    poi_website: poi.website,
    poi_accommodationUrl: (poi as any).accommodationUrl,
    poi_roompot_url: (poi as any).roompot_url,
    enrichment_url: enrichmentData?.url,
    enrichment_website: enrichmentData?.website,
    enrichment_roompot_url: enrichmentData?.roompot_url,
    all_poi_props: Object.keys(poi),
    all_enrichment_props: enrichmentData ? Object.keys(enrichmentData) : null,
    poi_enriched: (poi as any).enriched,
    isLoadingEnrichment: isLoadingEnrichment,
    hasEnrichmentData: !!enrichmentData
  });

  // Extract address information from various sources
  const poiAny = poi as any; // Type assertion to access dynamic properties
  const addressInfo = {
    street: poiAny['addr:street'] || poiAny.street,
    housenumber: poiAny['addr:housenumber'] || poiAny.housenumber,
    city: poiAny['addr:city'] || poiAny.city,
    postcode: poiAny['addr:postcode'] || poiAny.postcode,
    country: poiAny['addr:country'] || poiAny.country
  };

  const hasAddress = addressInfo.street || addressInfo.city;
  const fullAddress = [
    addressInfo.housenumber && addressInfo.street ? `${addressInfo.housenumber} ${addressInfo.street}` : addressInfo.street,
    addressInfo.postcode && addressInfo.city ? `${addressInfo.postcode} ${addressInfo.city}` : addressInfo.city,
    addressInfo.country
  ].filter(Boolean).join(', ');

  // Extract contact information with comprehensive URL detection
  const websiteUrl = enrichmentData?.url || 
                     enrichmentData?.website || 
                     enrichmentData?.roompot_url || 
                     poi.website || 
                     poi.url || 
                     poiAny.url || 
                     poiAny.accommodationUrl || 
                     poiAny.roompot_url;

  console.log('🔗 Final website URL determined:', websiteUrl);
  console.log('🔗 All URL sources:', {
    enrichment_url: enrichmentData?.url,
    enrichment_website: enrichmentData?.website,
    enrichment_roompot_url: enrichmentData?.roompot_url,
    poi_website: poi.website,
    poi_url: poi.url,
    websiteUrl: websiteUrl
  });

  const contactInfo = {
    phone: poi.phone,
    website: websiteUrl,
    email: poiAny.email
  };

  // Extract operational information
  const operationalInfo = {
    hours: poiAny.hours || poi.openingHours || poiAny['opening_hours:restaurant'],
    operator: poiAny.operator,
    building_type: poiAny.building_type,
    roompot_category: poiAny.roompot_category
  };

  const containerClasses = {
    mobile: "h-full overflow-y-auto",
    tablet: "h-full overflow-y-auto max-h-[70vh]",
    desktop: "h-full overflow-y-auto max-h-[80vh] grid grid-cols-1 lg:grid-cols-2 gap-6"
  };

  const imageGalleryClasses = {
    mobile: "mb-4",
    tablet: "mb-4", 
    desktop: "lg:col-span-2 mb-6"
  };

  return (
    <div className="space-y-4 poi-detail-container max-w-full overflow-hidden">
      {/* POI Header */}
      <div className="flex items-start space-x-4 mb-6">
        <div className={`${category?.color || 'bg-gray-500'} rounded-xl p-3 flex-shrink-0`}>
          <div className="text-white text-xl">
            {category?.icon === 'fas fa-utensils' && '🍽️'}
            {category?.icon === 'fas fa-swimming-pool' && '🏊'}
            {category?.icon === 'fas fa-restroom' && '🚻'}
            {category?.icon === 'fas fa-info-circle' && 'ℹ️'}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold text-gray-800 mb-1 break-words">{poi.name}</h3>
          
          {poi.distance && (
            <div className="flex items-center text-sm text-gray-500">
              <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
              {/* Translated Distance */}
              <span className="break-words">{Math.round(poi.distance)}m {t('poi.away')}</span>
            </div>
          )}
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Address Section */}
      {hasAddress && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200 max-w-full overflow-hidden">
          <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center">
            <MapPin className="w-4 h-4 mr-2 text-blue-600 flex-shrink-0" />
            {t('poi.address')}
          </h4>
          <p 
            className="text-gray-700 text-sm leading-relaxed pl-6"
            style={{
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              maxWidth: '100%'
            }}
          >
            {fullAddress}
          </p>
        </div>
      )}

      {/* Contact Information */}
      {(contactInfo.phone || contactInfo.website || contactInfo.email) && (
        <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200 max-w-full overflow-hidden">
          <h4 className="text-sm font-semibold text-green-800 mb-2 flex items-center">
            <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
            {t('poi.contactInformation')}
          </h4>
          <div className="space-y-3">
            {contactInfo.phone && (
              <div className="text-sm">
                <div className="flex items-center mb-1">
                  <Phone className="w-3 h-3 mr-2 text-green-600 flex-shrink-0" />
                  <span className="font-medium text-gray-700">{t('poi.phone')}</span>
                </div>
                <a href={`tel:${contactInfo.phone}`} className="text-blue-600 hover:text-blue-800 underline ml-5">
                  {contactInfo.phone}
                </a>
              </div>
            )}
            {(() => {
              const website = contactInfo.website;
              console.log('🔗 CONTACT INFO: Website detected but delegated to main Website Button:', website);
              // Note: Website button is now handled by the main Website Button section
              // to prevent duplication and maintain consistent security/loading behavior
              return website && (
                <div className="text-sm">
                  <div className="flex items-center mb-1">
                    <Globe className="w-3 h-3 mr-2 text-green-600 flex-shrink-0" />
                    <span className="font-medium text-gray-700">{t('poi.website')}</span>
                  </div>
                  <div className="ml-5">
                    <p className="text-xs text-gray-500 break-all" style={{ wordBreak: 'break-all', overflowWrap: 'break-word' }}>
                      {website}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Use the "Website besuchen" button below to visit this site
                    </p>
                  </div>
                </div>
              );
            })()}
            {contactInfo.email && (
              <div className="text-sm">
                <div className="flex items-center mb-1">
                  <span className="w-3 h-3 mr-2 text-green-600 flex-shrink-0">📧</span>
                  <span className="font-medium text-gray-700">{t('poi.email')}</span>
                </div>
                <a href={`mailto:${contactInfo.email}`} className="text-blue-600 hover:text-blue-800 underline ml-5">
                  {contactInfo.email}
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Website Button - Fixed race condition with stable rendering and loading states */}
      {(() => {
        console.log('🔗 MAIN WEBSITE BUTTON CHECK: Starting render check');
        console.log('🔗 MAIN WEBSITE BUTTON CHECK: isLoadingEnrichment:', isLoadingEnrichment);
        console.log('🔗 MAIN WEBSITE BUTTON CHECK: enrichmentData:', enrichmentData);
        console.log('🔗 MAIN WEBSITE BUTTON CHECK: websiteUrl:', websiteUrl);

        // Extract description for potential translation override
        let description = '';
        if (enrichmentData?.description) {
          if (typeof enrichmentData.description === 'object') {
            description = enrichmentData.description[currentLanguage] || enrichmentData.description.en || '';
          } else {
            description = enrichmentData.description;
          }
        } else if (poi.description) {
          description = poi.description;
        }

        // Check if this POI is enrichment-eligible (has accommodation properties)
        const isEnrichmentEligible = !!(
          (poi as any).roompot_category || 
          (poi as any).building_type || 
          poi.name?.toLowerCase().includes('lodge') ||
          poi.name?.toLowerCase().includes('beach house') ||
          poi.name?.toLowerCase().includes('bungalow') ||
          poi.name?.toLowerCase().includes('strandhaus')
        );

        // Determine final URL from all sources
        const finalUrl = websiteUrl || 
                         enrichmentData?.url || 
                         enrichmentData?.website || 
                         poi.url || 
                         poi.website ||
                         (poi as any).accommodationUrl ||
                         (poi as any).roompot_url;

        // Validate URL scheme for security
        const isValidUrl = finalUrl && (
          finalUrl.startsWith('http://') || 
          finalUrl.startsWith('https://') ||
          finalUrl.startsWith('www.')
        );

        // Normalize URL - add https if missing
        const safeUrl = finalUrl && !finalUrl.startsWith('http') ? `https://${finalUrl}` : finalUrl;

        console.log('🔗 MAIN WEBSITE BUTTON CHECK: isEnrichmentEligible:', isEnrichmentEligible);
        console.log('🔗 MAIN WEBSITE BUTTON CHECK: Final URL determined:', finalUrl);
        console.log('🔗 MAIN WEBSITE BUTTON CHECK: Safe URL:', safeUrl);
        console.log('🔗 MAIN WEBSITE BUTTON CHECK: isValidUrl:', isValidUrl);

        // Always show button for enrichment-eligible POIs or POIs with URLs
        // This prevents race condition by maintaining stable UI
        if (isEnrichmentEligible || finalUrl) {
          const isDisabled = isLoadingEnrichment || !isValidUrl;
          const buttonText = isLoadingEnrichment 
            ? t('poi.loadingWebsite') 
            : isValidUrl 
              ? (currentLanguage === 'de' ? 'Website besuchen' : t('poi.websiteButton'))
              : t('poi.websiteNotAvailable');

          console.log('🔗 MAIN WEBSITE BUTTON CHECK: RENDERING STABLE BUTTON - disabled:', isDisabled);

          return (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <Button
                disabled={isDisabled}
                variant={isDisabled ? "outline" : "default"}
                size="sm"
                onClick={() => {
                  if (safeUrl && isValidUrl) {
                    console.log('🔗 MAIN WEBSITE BUTTON: Clicking with URL:', safeUrl);
                    window.open(safeUrl, '_blank', 'noopener,noreferrer');
                  }
                }}
                className={`w-full h-10 flex items-center justify-center ${
                  isDisabled 
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isLoadingEnrichment ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2"></div>
                ) : (
                  <Globe className="w-4 h-4 mr-2" />
                )}
                {buttonText}
              </Button>
              {safeUrl && !isLoadingEnrichment && (
                <p className="text-xs text-gray-500 mt-2 break-all">
                  {safeUrl}
                </p>
              )}
            </div>
          );
        }

        console.log('🔗 MAIN WEBSITE BUTTON CHECK: NO BUTTON - Not enrichment eligible and no URL');
        return null;
      })()}

      {/* Quick Actions Row */}
      <div className="flex space-x-2 mb-4">
        {onNavigate && (
          <Button
            className="flex-1 min-h-[48px]"
            onClick={() => onNavigate(poi)}
          >
            <Navigation className="w-4 h-4 mr-2" />
            {t('poi.navigateHere')}
          </Button>
        )}
      </div>

      {/* Operational Information */}
      {(operationalInfo.hours || operationalInfo.operator) && (
        <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-200/40 mb-4">
          <h4 className="text-sm font-semibold text-amber-800 mb-2 flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            {t('poi.operationalInfo')}
          </h4>
          <div className="space-y-2">
            {operationalInfo.hours && (
              <div className="text-sm text-amber-700 mb-1">
                <span className="font-medium">{t('poi.hours')}: </span>
                {translateText(operationalInfo.hours)}
              </div>
            )}
            {operationalInfo.operator && (
              <div className="text-sm">
                <span className="font-medium text-gray-700">{t('poi.operator')}:</span>
                <span 
                  className="ml-2 text-gray-600"
                  style={{
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                  }}
                >
                  {operationalInfo.operator}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Categorization & Type Info */}
      {(operationalInfo.building_type || operationalInfo.roompot_category) && (
        <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
          <h4 className="text-sm font-semibold text-purple-800 mb-2">{t('poi.categoryDetails')}</h4>
          <div className="space-y-1">
            {operationalInfo.building_type && (
              <Badge variant="outline" className="text-xs mr-2">
                {t('poi.type')}: {operationalInfo.building_type}
              </Badge>
            )}
            {operationalInfo.roompot_category && (
              <Badge variant="outline" className="text-xs">
                {t('poi.roompot')}: {operationalInfo.roompot_category}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Amenities - COMPLETELY REMOVE ALL URLs and contact info */}
      {poi.amenities && poi.amenities.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">{t('poi.amenities')}</h4>
          <div className="flex flex-wrap gap-2">
            {poi.amenities
              .filter(amenity => {
                const cleanAmenity = amenity.toLowerCase().trim();
                // Remove ANYTHING that looks like a URL or contact info
                return (
                  !cleanAmenity.includes('website') && 
                  !cleanAmenity.includes('http') && 
                  !cleanAmenity.includes('www.') &&
                  !cleanAmenity.includes('.com') &&
                  !cleanAmenity.includes('.de') &&
                  !cleanAmenity.includes('.nl') &&
                  !cleanAmenity.includes('.org') &&
                  !cleanAmenity.includes('.eu') &&
                  !cleanAmenity.includes('.be') &&
                  !cleanAmenity.includes('.fr') &&
                  !cleanAmenity.includes('roompot') &&
                  !cleanAmenity.includes('://') &&
                  !cleanAmenity.includes('phone') &&
                  !cleanAmenity.includes('email') &&
                  !cleanAmenity.includes('tel:') &&
                  !cleanAmenity.includes('mailto:') &&
                  !cleanAmenity.includes('+31') &&
                  !cleanAmenity.includes('@') &&
                  !cleanAmenity.match(/\b\d{3}[-\s]?\d{3}[-\s]?\d{3}\b/) && // Phone patterns
                  cleanAmenity.length > 2 && // Remove very short strings
                  !cleanAmenity.match(/^https?:\/\//) // Direct URL check
                );
              })
              .map((amenity, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {translateText(amenity)}
                </Badge>
              ))}
          </div>
        </div>
      )}

      {/* Description */}
      {poi.description && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">⭐</span>
            <h3 className="text-lg font-semibold text-gray-800">{currentLanguage === 'de' ? 'Über diese Unterkunft' : t('poi.description')}</h3>
          </div>
          <p className="text-gray-600 leading-relaxed">
            {currentLanguage === 'de' && poi.description.includes('Comfortable lodge accommodation') 
              ? 'Komfortable Lodge-Unterkunft im Water Village, perfekt für Familien, die ein einzigartiges wasserbasiertes Camping-Erlebnis suchen.'
              : translateText(poi.description) || t('poi.noInfo')
            }
          </p>
        </div>
      )}

      {/* Enrichment Data Loading */}
      {isLoadingEnrichment && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">{t('accommodation.loadingDetails')}</span>
        </div>
      )}

      {/* Enrichment Data Display */}
      {enrichmentData && (
        <div className="space-y-4 mt-6">
          {/* Enhanced Description */}
          {enrichmentData.description && (
            <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <h4 className="text-sm font-semibold text-yellow-800 mb-2 flex items-center">
                <Star className="w-4 h-4 mr-2 text-yellow-600" />
                {currentLanguage === 'de' ? 'Über diese Unterkunft' : t('accommodation.about')}
              </h4>
              <p className="text-gray-700 text-sm leading-relaxed">
                {(() => {
                  const { translateText: translate } = useLanguage();
                  let description = '';

                  if (typeof enrichmentData.description === 'object') {
                    description = enrichmentData.description[useLanguage().currentLanguage] || 
                                 enrichmentData.description.en || 
                                 enrichmentData.description;
                  } else {
                    description = enrichmentData.description;
                  }

                  // Force translation of the description
                  return translateText(description);
                })()}
              </p>
            </div>
          )}

          {/* Capacity & Pricing */}
          {(enrichmentData.capacity || enrichmentData.price_info) && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">
                {t('accommodation.details')}
              </h4>
              <div className="space-y-2">
                {enrichmentData.capacity && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>
                      {currentLanguage === 'de' ? 'Bis zu' : t('accommodation.upTo')} {enrichmentData?.capacity?.max_persons || 4} {currentLanguage === 'de' ? 'Gäste' : t('accommodation.guestsCount')}
                    </span>
                  </div>
                )}
                {enrichmentData.price_info && (
                  <div className="flex items-center gap-2 text-green-600 font-semibold">
                    <Euro className="w-4 h-4" />
                    <span>
                      {currentLanguage === 'de' && enrichmentData.price_info.includes('from €149 per night')
                        ? 'ab €149 pro Nacht'
                        : translateText(enrichmentData.price_info)
                      }
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Features */}
          {enrichmentData.features && enrichmentData.features.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-800 mb-2">{currentLanguage === 'de' ? 'Ausstattung' : t('accommodation.features')}</h4>
              <div className="flex flex-wrap gap-2">
                {(Array.isArray(enrichmentData.features) 
                  ? enrichmentData.features 
                  : enrichmentData.features[currentLanguage] || enrichmentData.features.en || []
                ).map((feature, index) => {
                  let translatedFeature = feature;
                  if (currentLanguage === 'de') {
                    const featureTranslations: Record<string, string> = {
                      'WiFi': 'WLAN',
                      'Water View': 'Wasserblick',
                      'Modern Kitchen': 'Moderne Küche',
                      'TV': 'Fernseher',
                      'Parking': 'Parkplatz',
                      'Waterfront Access': 'Wasserzugang'
                    };
                    translatedFeature = featureTranslations[feature] || feature;
                  }

                  return (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="justify-start text-xs bg-white/80 text-gray-700"
                    >
                      {translatedFeature}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}



          {/* Images */}
          {enrichmentData.images && (enrichmentData.images.primary || (enrichmentData.images.gallery && enrichmentData.images.gallery.length > 0)) && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-800 mb-3">
                {t('accommodation.images')}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {enrichmentData.images.primary && (
                  <div className="relative">
                    <img
                      src={buildImageUrl(enrichmentData.images.primary.local_path)}
                      alt="Primary"
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <Badge className="absolute top-1 left-1 text-xs bg-blue-600 text-white">
                      {enrichmentData.images.primary.category}
                    </Badge>
                  </div>
                )}
                {enrichmentData.images.gallery && enrichmentData.images.gallery.slice(0, 3).map((image: any, index: number) => (
                  <div key={index} className="relative">
                    <img
                      src={buildImageUrl(image.local_path)}
                      alt={image.category}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <Badge className="absolute top-1 left-1 text-xs bg-gray-600 text-white">
                      {image.category}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};