import React from 'react';
import { Site, Coordinates } from '@/types/navigation';

/**
 * SiteManager - Single Source of Truth for Site Management
 * Prevents the chaos of multiple localStorage reads and inconsistent state
 */

export interface SiteConfiguration {
  site: Site;
  coordinates: Coordinates;
  useRealGPS: boolean;
  isValid: boolean;
  validationMessage?: string;
}

class SiteManagerClass {
  private currentSite: Site;
  private listeners: Set<(config: SiteConfiguration) => void> = new Set();
  
  // Site-specific mock coordinates
  private readonly mockCoordinates = {
    kamperland: { lat: 51.5896335, lng: 3.7216451 }, // Starting Point POI on road network
    zuhause: { lat: 51.00169448656764, lng: 6.051019009670205 }
  } as const;

  constructor() {
    this.currentSite = this.loadSiteFromStorage();
    console.log(`🎯 SITE MANAGER: Initialized with site "${this.currentSite}"`);
    
    // Listen to storage changes from other tabs
    window.addEventListener('storage', this.handleStorageChange.bind(this));
  }

  private loadSiteFromStorage(): Site {
    const storedSite = localStorage.getItem('selected-site');
    const validSite = storedSite === 'kamperland' || storedSite === 'zuhause';
    
    if (!validSite) {
      console.log(`🎯 SITE MANAGER: Invalid stored site "${storedSite}", defaulting to "zuhause"`);
      localStorage.setItem('selected-site', 'zuhause');
      return 'zuhause';
    }
    
    return storedSite as Site;
  }

  private handleStorageChange(event: StorageEvent) {
    if (event.key === 'selected-site' && event.newValue) {
      const newSite = event.newValue;
      if (newSite !== this.currentSite && (newSite === 'kamperland' || newSite === 'zuhause')) {
        console.log(`🎯 SITE MANAGER: External storage change detected: ${this.currentSite} → ${newSite}`);
        this.currentSite = newSite as Site;
        this.notifyListeners();
      }
    }
  }

  /**
   * Get current site configuration with validation
   */
  getCurrentConfiguration(): SiteConfiguration {
    const site = this.currentSite;
    const coordinates = site === 'kamperland' 
      ? this.mockCoordinates.kamperland 
      : this.mockCoordinates.zuhause;
    const useRealGPS = false; // For now, keeping mock GPS for testing
    
    return {
      site,
      coordinates,
      useRealGPS,
      isValid: true,
      validationMessage: `Valid configuration: ${site} with mock coordinates`
    };
  }

  /**
   * Change the current site and notify all components
   */
  setSite(newSite: Site): void {
    if (newSite === this.currentSite) {
      console.log(`🎯 SITE MANAGER: Site already set to "${newSite}", no change needed`);
      return;
    }

    if (newSite !== 'kamperland' && newSite !== 'zuhause') {
      console.error(`🎯 SITE MANAGER: Invalid site "${newSite}", must be "kamperland" or "zuhause"`);
      return;
    }

    console.log(`🎯 SITE MANAGER: Changing site: ${this.currentSite} → ${newSite}`);
    
    this.currentSite = newSite;
    localStorage.setItem('selected-site', newSite);
    
    this.notifyListeners();
  }

  /**
   * Subscribe to site changes
   */
  subscribe(listener: (config: SiteConfiguration) => void): () => void {
    this.listeners.add(listener);
    
    // Immediately notify with current configuration
    listener(this.getCurrentConfiguration());
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const config = this.getCurrentConfiguration();
    console.log(`🎯 SITE MANAGER: Notifying ${this.listeners.size} listeners of configuration change:`, config);
    
    this.listeners.forEach(listener => {
      try {
        listener(config);
      } catch (error) {
        console.error('🎯 SITE MANAGER: Listener error:', error);
      }
    });
  }

  /**
   * Get site-specific data paths (for future network/POI file management)
   */
  getDataPaths(site: Site = this.currentSite) {
    return {
      pois: site === 'kamperland' 
        ? 'combined_pois_roompot.geojson' 
        : 'zuhause_pois.geojson',
      network: site === 'kamperland' 
        ? 'roompot_routing_network.geojson' 
        : 'zuhause_routing_network.geojson'
    };
  }

  /**
   * Validate if a position matches the current site (for future GPS auto-detection)
   */
  validatePositionForSite(position: Coordinates, site: Site = this.currentSite): boolean {
    const siteCoords = this.mockCoordinates[site];
    const distance = this.calculateDistance(position, siteCoords);
    
    // Consider within 10km as valid for the site
    return distance < 10;
  }

  private calculateDistance(pos1: Coordinates, pos2: Coordinates): number {
    const R = 6371; // Earth's radius in km
    const dLat = (pos2.lat - pos1.lat) * Math.PI / 180;
    const dLng = (pos2.lng - pos1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(pos1.lat * Math.PI / 180) * Math.cos(pos2.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  /**
   * Debug information
   */
  getDebugInfo() {
    return {
      currentSite: this.currentSite,
      localStorage: localStorage.getItem('selected-site'),
      listenerCount: this.listeners.size,
      configuration: this.getCurrentConfiguration()
    };
  }
}

// Export singleton instance
export const SiteManager = new SiteManagerClass();

// React hook for components
export function useSiteManager() {
  const [config, setConfig] = React.useState<SiteConfiguration>(
    SiteManager.getCurrentConfiguration()
  );

  React.useEffect(() => {
    return SiteManager.subscribe(setConfig);
  }, []);

  return {
    config,
    setSite: SiteManager.setSite.bind(SiteManager),
    debugInfo: SiteManager.getDebugInfo()
  };
}