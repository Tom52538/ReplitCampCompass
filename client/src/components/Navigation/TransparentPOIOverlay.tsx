import React from 'react';
import { POI } from '@/types/navigation';
import { POI_CATEGORIES } from '@/types/poi-categories';
import { Button } from '@/components/ui/button';
import { X, Navigation, Clock, Phone, Globe, Mail, Building, MapPin } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface TransparentPOIOverlayProps {
  poi: POI;
  onNavigate: (poi: POI) => void;
  onClose: () => void;
}

export const TransparentPOIOverlay: React.FC<TransparentPOIOverlayProps> = ({
  poi,
  onNavigate,
  onClose
}) => {
  const { t, translateText } = useLanguage();

  console.log('🔍 TransparentPOIOverlay rendered for:', poi.name);

  const category = POI_CATEGORIES[poi.category as keyof typeof POI_CATEGORIES];

  // Extract address information from various sources
  const addressInfo = {
    street: poi['addr:street'] || poi.street,
    housenumber: poi['addr:housenumber'] || poi.housenumber,
    city: poi['addr:city'] || poi.city,
    postcode: poi['addr:postcode'] || poi.postcode,
    country: poi['addr:country'] || poi.country
  };

  const hasAddress = addressInfo.street || addressInfo.city;
  const fullAddress = [
    addressInfo.housenumber && addressInfo.street ? `${addressInfo.housenumber} ${addressInfo.street}` : addressInfo.street,
    addressInfo.postcode && addressInfo.city ? `${addressInfo.postcode} ${addressInfo.city}` : addressInfo.city,
    addressInfo.country
  ].filter(Boolean).join(', ');

  // Extract contact information
  const contactInfo = {
    phone: poi.phone,
    website: poi.website || poi.url,
    email: poi.email
  };

  // Extract operational information
  const operationalInfo = {
    hours: poi.hours || poi.opening_hours || poi['opening_hours:restaurant'],
    operator: poi.operator,
    building_type: poi.building_type,
    roompot_category: poi.roompot_category
  };

  const getEmojiForCategory = (category: string): string => {
    switch (category) {
      case 'food-drink': return '🍽️';
      case 'services': return '🛠️';
      case 'toilets': return '🚻';
      case 'parking': return '🅿️';
      case 'bungalows': return '🏡';
      case 'chalets': return '🏔️';
      case 'lodges': return '⭐';
      case 'camping': return '🏕️';
      case 'beach_houses': return '🏖️';
      case 'facilities': return '🚿';
      case 'leisure': return '🛝';
      default: return '📍';
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] pointer-events-none">
      {/* Background overlay */}
      <div
        className="absolute inset-0 bg-black/20 pointer-events-auto cursor-pointer"
        onClick={onClose}
      />

      {/* POI Detail Card */}
      <div className="absolute bottom-20 left-4 right-4 max-w-md mx-auto pointer-events-auto">
        <div
          className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl border border-white/20 overflow-hidden"
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          }}
        >
          {/* Header */}
          <div className="flex items-start space-x-4 p-4 pb-3">
            <div className={`${category?.color || 'bg-gray-500'} rounded-xl p-3 flex-shrink-0`}>
              <div className="text-white text-xl">
                {getEmojiForCategory(poi.category)}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-gray-800 mb-1 truncate">{poi.name}</h3>
              
              {poi.distance && (
                <div className="flex items-center text-sm text-gray-500">
                  <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                  <span>{poi.distance} {t('poi.away')}</span>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Address Section */}
          {hasAddress && (
            <div className="mx-4 mb-3 p-3 bg-blue-50/80 rounded-lg border border-blue-200/50">
              <div className="flex items-start mb-2">
                <MapPin className="w-4 h-4 mr-2 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-blue-800 mb-1">{t('poi.address')}</h4>
                  <p className="text-gray-700 text-sm leading-relaxed">{fullAddress}</p>
                </div>
              </div>
            </div>
          )}

          {/* Contact Information */}
          {(contactInfo.phone || contactInfo.website || contactInfo.email) && (
            <div className="mx-4 mb-3 p-3 bg-green-50/80 rounded-lg border border-green-200/50">
              <h4 className="text-sm font-semibold text-green-800 mb-2 flex items-center">
                <Phone className="w-4 h-4 mr-2" />
                {t('poi.contactInformation')}
              </h4>
              <div className="space-y-2">
                {contactInfo.phone && (
                  <div className="flex items-center text-sm">
                    <Phone className="w-3 h-3 mr-2 text-green-600 flex-shrink-0" />
                    <a href={`tel:${contactInfo.phone}`} className="text-blue-600 hover:text-blue-800 underline">
                      {contactInfo.phone}
                    </a>
                  </div>
                )}
                {contactInfo.website && (
                  <div className="flex items-center text-sm">
                    <Globe className="w-3 h-3 mr-2 text-green-600 flex-shrink-0" />
                    <a
                      href={contactInfo.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline truncate"
                    >
                      {contactInfo.website}
                    </a>
                  </div>
                )}
                {contactInfo.email && (
                  <div className="flex items-center text-sm">
                    <Mail className="w-3 h-3 mr-2 text-green-600 flex-shrink-0" />
                    <a href={`mailto:${contactInfo.email}`} className="text-blue-600 hover:text-blue-800 underline">
                      {contactInfo.email}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Operational Info */}
          {(poi.hours || poi.opening_hours || poi.operator || poi.data_source) && (
            <div className="mx-4 mb-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <h4 className="text-sm font-semibold text-amber-800 mb-2">{t('poi.operationalInfo')}</h4>
              <div className="space-y-2">
                {(poi.hours || poi.opening_hours) && (
                  <div className="flex items-center text-sm">
                    <Clock className="w-4 h-4 mr-2 text-amber-600" />
                    <span className="text-amber-700">{t('poi.hours')}: {poi.hours || poi.opening_hours}</span>
                  </div>
                )}
                {poi.operator && (
                  <div className="flex items-center text-sm">
                    <Building className="w-4 h-4 mr-2 text-amber-600" />
                    <span className="text-amber-700">{t('poi.operator')}: {poi.operator}</span>
                  </div>
                )}
                {poi.data_source && (
                  <div className="flex items-center text-sm">
                    <MapPin className="w-4 h-4 mr-2 text-amber-600" />
                    <span className="text-amber-700">{t('poi.source')}: {poi.data_source.toUpperCase()}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Amenities */}
          {(poi.amenities && poi.amenities.length > 0) || poi['sup:rental'] || poi['surfboard:rental'] || poi.shop === 'rental' && (
            <div className="mx-4 mb-3">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <Building className="w-4 h-4" />
                {t('poi.servicesAndEquipment')}
              </h4>
              <div className="grid gap-2">
                {/* Rental Services */}
                {poi.shop === 'rental' && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />
                    <span className="font-medium text-blue-700">{t('poi.equipmentRentalService')}</span>
                  </div>
                )}
                {poi['sup:rental'] === 'yes' && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0" />
                    <span className="text-gray-600">{t('poi.supBoardRentalAvailable')}</span>
                  </div>
                )}
                {poi['surfboard:rental'] === 'yes' && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0" />
                    <span className="text-gray-600">{t('poi.surfboardRentalAvailable')}</span>
                  </div>
                )}

                {/* Standard Amenities */}
                {poi.amenities?.map((amenity, index) => {
                  const isClickableLink = amenity.startsWith('Website:') || amenity.startsWith('Email:');
                  const content = amenity.split(': ');

                  if (isClickableLink && content.length === 2) {
                    const [label, value] = content;
                    return (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        {label === 'Website' && <Globe className="w-4 h-4 text-blue-600" />}
                        {label === 'Email' && <Mail className="w-4 h-4 text-green-600" />}
                        <span className="font-medium">{label}:</span>
                        {label === 'Website' ? (
                          <a
                            href={value.startsWith('http') ? value : `https://${value}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline"
                          >
                            {value}
                          </a>
                        ) : label === 'Email' ? (
                          <a
                            href={`mailto:${value}`}
                            className="text-green-600 hover:text-green-800 underline"
                          >
                            {value}
                          </a>
                        ) : (
                          <span className="text-gray-600">{value}</span>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />
                      {amenity}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Description */}
          {poi.description && (
            <div className="mx-4 mb-3">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">{t('poi.description')}</h4>
              <p className="text-gray-600 text-sm leading-relaxed">{poi.description}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="p-4 pt-2">
            <div className="flex space-x-3">
              <Button
                className="flex-1 h-12"
                onClick={() => onNavigate(poi)}
              >
                <Navigation className="w-4 h-4 mr-2" />
                {t('navigation.navigateHere')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};