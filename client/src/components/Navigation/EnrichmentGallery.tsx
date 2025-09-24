
import React, { useState } from 'react';
import { useScreenSize } from '@/hooks/use-mobile';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildImageUrl } from '@/lib/utils';

interface EnrichmentGalleryProps {
  images: {
    primary?: {
      image_id: string;
      local_path: string;
      category: string;
      dimensions: { width: number; height: number };
    };
    gallery?: Array<{
      image_id: string;
      local_path: string;
      category: string;
      dimensions: { width: number; height: number };
    }>;
  };
  name: string;
}

export const EnrichmentGallery: React.FC<EnrichmentGalleryProps> = ({ images, name }) => {
  const screenSize = useScreenSize();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showFullscreen, setShowFullscreen] = useState(false);

  const allImages = [
    ...(images.primary ? [images.primary] : []),
    ...(images.gallery || [])
  ];

  if (allImages.length === 0) return null;


  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  const galleryClasses = {
    mobile: "w-full h-48 rounded-lg overflow-hidden relative",
    tablet: "w-full h-64 rounded-lg overflow-hidden relative",
    desktop: "w-full h-80 rounded-lg overflow-hidden relative"
  };

  return (
    <>
      <div className={galleryClasses[screenSize]}>
        <img
          src={buildImageUrl(allImages[currentImageIndex].local_path)}
          alt={`${name} - ${allImages[currentImageIndex].category}`}
          className="w-full h-full object-cover cursor-pointer"
          onClick={() => setShowFullscreen(true)}
        />
        
        {allImages.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white"
              onClick={prevImage}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white"
              onClick={nextImage}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
              {allImages.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full cursor-pointer ${
                    index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                  }`}
                  onClick={() => setCurrentImageIndex(index)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Fullscreen Modal */}
      {showFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={() => setShowFullscreen(false)}
          >
            <X className="w-6 h-6" />
          </Button>
          <img
            src={buildImageUrl(allImages[currentImageIndex].local_path)}
            alt={`${name} - ${allImages[currentImageIndex].category}`}
            className="max-w-[90vw] max-h-[90vh] object-contain"
          />
          {allImages.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white/20"
                onClick={prevImage}
              >
                <ChevronLeft className="w-8 h-8" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white/20"
                onClick={nextImage}
              >
                <ChevronRight className="w-8 h-8" />
              </Button>
            </>
          )}
        </div>
      )}
    </>
  );
};
