import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Site } from '@/types/navigation';
import { useSiteManager } from '@/lib/siteManager';

// Site configuration for display
const SITE_DISPLAY = {
  kamperland: { name: 'Kamperland' },
  zuhause: { name: 'Zuhause' }
} as const;

interface SiteSelectorProps {
  // No props needed - component manages its own state via SiteManager
}

export const SiteSelector = ({}: SiteSelectorProps) => {
  const { config, setSite } = useSiteManager();
  const currentSite = config.site;

  return (
    <div className="flex space-x-2">
      {Object.entries(SITE_DISPLAY).map(([key, siteInfo]) => {
        const siteKey = key as Site;
        return (
          <Button
            key={siteKey}
            variant={currentSite === siteKey ? "default" : "outline"}
            size="sm"
            onClick={() => {
              console.log(`🔄 Site selector: ${currentSite} → ${siteKey}`);
              setSite(siteKey);
            }}
            className="text-xs"
          >
            <MapPin className="w-3 h-3 mr-1" />
            {siteInfo.name}
          </Button>
        );
      })}
    </div>
  );
};