import React from 'react';
import { POI } from '@/types/navigation';
import { useScreenSize } from '@/hooks/use-mobile';
import { POIDetailContent } from '@/components/UI/DrawerContent/POIDetailContent';
import { TransparentPOIOverlay } from './TransparentPOIOverlay';
import { EnhancedPOIDialog } from './EnhancedPOIDialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

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

interface ResponsivePOIDetailProps {
  poi: POI | null;
  isOpen: boolean;
  onNavigate: (poi: POI) => void;
  onClose: () => void;
  enrichmentData?: any;
}

export const ResponsivePOIDetail: React.FC<ResponsivePOIDetailProps> = ({
  poi,
  isOpen,
  onNavigate,
  onClose,
  enrichmentData: propEnrichmentData
}) => {
  const screenSize = useScreenSize();
  const [enrichmentData, setEnrichmentData] = React.useState<EnrichmentData | null>(propEnrichmentData || null);
  const [isLoadingEnrichment, setIsLoadingEnrichment] = React.useState(false);

  // Check if this is an accommodation type that should fetch enrichment data
  const isAccommodationType = poi?.category?.includes('beach_house') ||
                             poi?.category?.includes('beach_houses') ||
                             poi?.category?.includes('bungalow') ||
                             poi?.category?.includes('chalet') ||
                             poi?.category?.includes('lodge') ||
                             poi?.category?.includes('accommodation') ||
                             poi?.name.toLowerCase().includes('beach house') ||
                             poi?.name.toLowerCase().includes('strandhaus') ||
                             poi?.name.toLowerCase().includes('lodge');

  const fetchEnrichmentData = async () => {
    if (!poi || !isAccommodationType) return;

    setIsLoadingEnrichment(true);
    try {
      console.log('🔍 Fetching enrichment for POI:', poi.name, 'ID:', poi.id);

      const response = await fetch(`/api/enrichment/search?q=${encodeURIComponent(poi.name)}&poi_id=${encodeURIComponent(poi.id)}`);
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Enrichment API response:', data);

        if (data && Object.keys(data).length > 0) {
          const firstKey = Object.keys(data)[0];
          const enrichment = data[firstKey];

          // Process the enrichment data for current language
          const userLang = navigator.language.split('-')[0] || 'en';
          console.log('🔍 User language detected:', userLang);

          const processedData = {
            ...enrichment,
            name: enrichment.name?.[userLang] || enrichment.name?.en || enrichment.name || poi.name,
            description: enrichment.description?.[userLang] || enrichment.description?.en || enrichment.description || '',
            features: enrichment.features?.[userLang] || enrichment.features?.en || enrichment.features || [],
            price_info: enrichment.price_info?.[userLang] || enrichment.price_info?.en || enrichment.price_info || ''
          };

          console.log('🔍 Processed enrichment data:', processedData);
          setEnrichmentData(processedData);
        } else {
          console.log('🔍 No enrichment data found');
          setEnrichmentData(null);
        }
      } else {
        console.log('🔍 Enrichment API request failed:', response.status);
        setEnrichmentData(null);
      }
    } catch (error) {
      console.error('Failed to fetch enrichment data:', error);
      setEnrichmentData(null);
    } finally {
      setIsLoadingEnrichment(false);
    }
  };

  React.useEffect(() => {
    if (poi && isOpen && isAccommodationType) {
      fetchEnrichmentData();
    }
  }, [poi, isOpen, isAccommodationType]);

  if (!poi || !isOpen) return null;

  // Mobile: Simple bottom sheet - let shadcn/ui handle everything
  if (screenSize === 'mobile') {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="bottom" className="p-0 max-h-[90vh]">
          <div className="overflow-y-auto">
            <SheetHeader className="px-4 pt-4 pb-2">
              <SheetTitle className="text-xl font-bold text-left">
                {poi.name}
              </SheetTitle>
              <SheetDescription className="text-left text-gray-600">
                {poi.category?.replace('_', ' ')}
              </SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-4 max-w-full overflow-hidden">
              <POIDetailContent
                poi={poi}
                onNavigate={onNavigate}
                onClose={onClose}
                layoutMode="mobile"
                enrichmentData={enrichmentData}
                isLoadingEnrichment={isLoadingEnrichment}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Tablet: Medium overlay
  if (screenSize === 'tablet') {
    return (
      <TransparentPOIOverlay
        poi={poi}
        onNavigate={onNavigate}
        onClose={onClose}
      />
    );
  }

  // Desktop: Large dialog with enhanced layout
  return (
    <EnhancedPOIDialog
      poi={poi}
      isOpen={isOpen}
      onClose={onClose}
      onNavigate={onNavigate}
    />
  );
};