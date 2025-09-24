import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { MapContainer } from '@/components/Map/MapContainer';
import { MapControls } from '@/components/Navigation/MapControls';
import { LightweightPOIButtons } from '@/components/Navigation/LightweightPOIButtons';
import { EnhancedMapControls } from '@/components/Navigation/EnhancedMapControls';
import { CampingWeatherWidget } from '@/components/Navigation/CampingWeatherWidget';
import { TransparentOverlay } from '@/components/UI/TransparentOverlay';
import { TransparentPOIOverlay } from '@/components/Navigation/TransparentPOIOverlay';
import { TopManeuverPanel } from '@/components/Navigation/TopManeuverPanel';
import { BottomSummaryPanel } from '@/components/Navigation/BottomSummaryPanel';
import { PermanentHeader } from '@/components/UI/PermanentHeader';
import { TravelModeSelector } from '@/components/Navigation/TravelModeSelector';
import { CampgroundRerouteDetector } from '@/lib/campgroundRerouting';
import { useLocation } from '@/hooks/useLocation';
import { usePOI, useSearchPOI } from '@/hooks/usePOI';
import { useRouting } from '@/hooks/useRouting';
import { useWeather } from '@/hooks/useWeather';
import { useLanguage } from '@/hooks/useLanguage';
import { useNavigationTracking } from '@/hooks/useNavigationTracking';
import { useSiteManager } from '@/lib/siteManager';
import { mobileLogger } from '@/utils/mobileLogger';
import { POI, RouteResponse, TestSite, TEST_SITES, Coordinates, Site } from '@/types/navigation';
import { calculateDistance, formatDistance, calculateBearing } from '@/lib/mapUtils';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Settings } from 'lucide-react';
import { SecureTTSClient } from '@/services/secureTTSClient';
import { RouteTracker } from '@/lib/routeTracker';
import { GestureEnhancedMap } from '@/components/Map/GestureEnhancedMap';
import { EnhancedPOIDialog } from '@/components/Navigation/EnhancedPOIDialog';
import { POILocalizationDebugger } from '@/components/Navigation/POILocalizationDebugger';
import { POILocalizationTestPanel } from '@/components/Navigation/POILocalizationTestPanel';
import { VoiceControlPanel } from '@/components/Navigation/VoiceControlPanel';
import { ErrorBoundary } from '@/components/ErrorBoundary';
// Removed SmartBottomDrawer - POIs show directly on map
import { TopBar } from '@/components/Navigation/TopBar'; // Assuming TopBar is imported for the new structure
import MobileMemoryMonitor from '@/components/UI/MobileMemoryMonitor'; // Assuming MobileMemoryMonitor is available
// import { POIDataDebugger } from '@/components/Navigation/POIDataDebugger'; // Not used

// Helper function to safely normalize POI strings for logging and display
const normalizePoiString = (value: any): string => {
      if (typeof value === 'string') return value.toLowerCase().trim();
      if (typeof value === 'number') return String(value).toLowerCase().trim();
      if (value === null || value === undefined) return '';
      return String(value).toLowerCase().trim();
    };

// Assume isDev is available globally or imported
const isDev = process.env.NODE_ENV === 'development';

export default function Navigation() {
  // Use SiteManager as single source of truth for site management
  const { config, setSite } = useSiteManager();
  const currentSite = config.site;
  const { currentPosition, useRealGPS, toggleGPS } = useLocation({ currentSite });
  const { data: allPOIs = [], isLoading: poisLoading } = usePOI(currentSite);

  // Debug: Log the site synchronization - now using SiteManager
  console.log(`🔍 SITE SYNC DEBUG: Navigation.tsx currentSite=${currentSite}, SiteManager config=${JSON.stringify(config)}`);
  const { data: weather } = useWeather(currentPosition.lat, currentPosition.lng);
  const { getRoute } = useRouting();
  const { toast } = useToast();
  const { t } = useLanguage();

  // Map state - initialize with current position
  const [mapCenter, setMapCenter] = useState(currentPosition);
  const [mapZoom, setMapZoom] = useState(16);
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [currentRoute, setCurrentRoute] = useState<RouteResponse | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [filteredCategories, setFilteredCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [currentPanel, setCurrentPanel] = useState<'map' | 'search' | 'navigation' | 'settings'>('map');

  // New state for destination marker
  const [destinationMarker, setDestinationMarker] = useState<{ lat: number; lng: number } | null>(null);

  // Network overlay state
  const [showNetworkOverlay, setShowNetworkOverlay] = useState(false);

  // Drawer height state
  const [drawerHeight, setDrawerHeight] = useState<'peek' | 'half' | 'full'>('half');


  // Transparent Overlay UI state
  const [uiMode, setUIMode] = useState<'start' | 'search' | 'poi-info' | 'route-planning' | 'navigation'>('start');
  const [overlayStates, setOverlayStates] = useState({
    search: false,
    poiInfo: false,
    routePlanning: false,
    navigation: false
  });

  // Drawer and Weather Widget state (assuming these are used elsewhere and need to be managed)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showWeatherWidget, setShowWeatherWidget] = useState(false);


  // New state for POI Dialog visibility
  const [showPOIDialog, setShowPOIDialog] = useState(false);
  const [showPOIOverlay, setShowPOIOverlay] = useState(false);

  // Voice control state
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // Map orientation and style state
  const [mapOrientation, setMapOrientation] = useState<'north' | 'driving'>('north');
  const [mapStyle, setMapStyle] = useState<'outdoors' | 'satellite' | 'streets' | 'navigation'>('outdoors');
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  // Travel mode state for routing
  const [travelMode, setTravelMode] = useState<'car' | 'bike' | 'pedestrian'>('pedestrian');

  // Navigation tracking state - ElevenLabs TTS
  const secureTTSRef = useRef<SecureTTSClient | null>(null);
  const routeTrackerRef = useRef<RouteTracker | null>(null);
  const reroutingRef = useRef(false);
  const destinationRef = useRef<Coordinates | null>(null);
  const campgroundRerouteRef = useRef<CampgroundRerouteDetector | null>(null);
  const [currentInstruction, setCurrentInstruction] = useState<string>('');
  const [nextDistance, setNextDistance] = useState<string>('');
  const [routeProgress, setRouteProgress] = useState<any>(null);


  // Network Debugging State
  const [showNetworkDebug, setShowNetworkDebug] = useState(false);
  const [lastFailedRoute, setLastFailedRoute] = useState<{start: {lat: number, lng: number}, end: {lat: number, lng: number}} | null>(null);
  const [failedRoutingCoords, setFailedRoutingCoords] = useState<{start: {lat: number, lng: number}, end: {lat: number, lng: number}} | null>(null);
  const [showGridVisualization, setShowGridVisualization] = useState(false);
  const [routingResult, setRoutingResult] = useState<any>(null);


  // Initialize navigation tracking - but only when using real GPS
  const { currentPosition: livePosition, error: navigationError, isTracking } = useNavigationTracking(isNavigating, useRealGPS, currentPosition, {
    enableHighAccuracy: true,
    updateInterval: 1000,
    adaptiveTracking: true
  });


  // CRITICAL FIX: Properly set trackingPosition for navigation
  // Use live position when navigating with real GPS, otherwise use current position
  const trackingPosition = useMemo(() => {
    if (isNavigating) {
      if (useRealGPS && livePosition?.position) {
        console.log('🔍 TRACKING POSITION: Using live GPS position for navigation', livePosition.position);
        return livePosition.position;
      } else {
        console.log('🔍 TRACKING POSITION: Using mock position for navigation', currentPosition);
        return currentPosition;
      }
    }
    return null; // Not navigating
  }, [isNavigating, useRealGPS, livePosition?.position, currentPosition]);

  // Calculate bearing for driving direction mode
  const [currentBearing, setCurrentBearing] = useState(0);
  const [mapRotation, setMapRotation] = useState(0);
  const lastPositionRef = useRef<Coordinates | null>(null);

  useEffect(() => {
    if (mapOrientation === 'driving') {
      // Calculate bearing from movement when using real GPS
      if (useRealGPS && livePosition && lastPositionRef.current && isNavigating) {
        const bearing = calculateBearing(lastPositionRef.current, livePosition.position);
        if (!isNaN(bearing)) {
          console.log('📍 Calculated bearing from movement:', bearing);
          setCurrentBearing(bearing);
        }
      }
      // For mock GPS, use route direction if available or calculate from route geometry
      else if (!useRealGPS && currentRoute && currentRoute.geometry && currentRoute.geometry.length > 1) {
        // Calculate bearing from route geometry
        const [start, end] = currentRoute.geometry.slice(0, 2);
        const routeBearing = calculateBearing(
          { lat: start[1], lng: start[0] },
          { lat: end[1], lng: end[0] }
        );
        console.log('📍 Using route geometry bearing for mock GPS:', routeBearing);
        setCurrentBearing(routeBearing);
      } else {
        // Default driving direction simulation for testing
        setCurrentBearing(45); // Northeast direction for testing
        console.log('📍 Using default test bearing: 45 degrees');
      }
      // Store current position for next calculation
      if (livePosition) {
        lastPositionRef.current = livePosition.position;
      }
    }
  }, [livePosition, mapOrientation, useRealGPS, currentRoute, isNavigating]);

  // NEW: Synchronize driving mode with map rotation - Debug Added
  useEffect(() => {
    console.log('🧭 MAP ROTATION EFFECT: mapOrientation =', mapOrientation, 'currentBearing =', currentBearing);
    if (mapOrientation === 'driving') {
      // Rotate map against the bearing so "driving direction is up"
      const newRotation = -currentBearing;
      setMapRotation(newRotation);
      console.log('🧭 DRIVING MODE: Map rotation set to', newRotation, 'degrees (bearing:', currentBearing, ')');
      console.log('🧭 ROTATION STATE: mapRotation will be:', newRotation);
    } else if (mapOrientation === 'north') {
      setMapRotation(0);
      console.log('🧭 NORTH MODE: Map rotation reset to 0 degrees');
    }
  }, [mapOrientation, currentBearing]);

  // Debug logging for position tracking
  useEffect(() => {
    console.log(`🔍 NAVIGATION DEBUG: Position tracking - isNavigating: ${isNavigating}, useRealGPS: ${useRealGPS}, livePosition:`, livePosition, 'trackingPosition:', trackingPosition);

    if (isNavigating && !useRealGPS) {
      console.log(`🔍NAVIGATION DEBUG: Navigation started with MOCK GPS - position should stay locked to:`, currentPosition);
    }

    if (isNavigating && useRealGPS) {
      console.log(`🔍NAVIGATION DEBUG: Navigation started with REAL GPS - using live tracking`);
    }
  }, [isNavigating, useRealGPS, livePosition, trackingPosition, currentPosition]);

  // Auto-adjust drawer height for navigation mode
  useEffect(() => {
    if (uiMode === 'navigation' && isNavigating) {
      setDrawerHeight('half'); // Show enough content for navigation instructions
    } else if (uiMode === 'start') {
      setDrawerHeight('peek'); // Minimize drawer when not in use
    }
  }, [uiMode, isNavigating]);

  // Search functionality - include category filter for search
  const selectedCategory = filteredCategories.length === 1 ? filteredCategories[0] : undefined;
  const { data: searchResults = [] } = useSearchPOI(searchQuery, currentSite, selectedCategory);

  // Determine which POIs to display
  let displayPOIs: POI[] = [];

  if (searchQuery.trim().length > 0) {
    // Use search results (already filtered by category if single category selected)
    displayPOIs = searchResults;
    console.log(`🔍 DISPLAY POIs: Showing ${searchResults.length} search results for "${searchQuery}"`);

    // If search is active but no results, show message
    if (searchResults.length === 0) {
      console.log(`🔍 DISPLAY POIs: No search results found for "${searchQuery}" - API may have failed`);
    }
  } else if (filteredCategories.length > 0 && allPOIs) {
    // Debug: Show actual categories in the POI data
    if (allPOIs.length > 0) {
      const actualCategories = Array.from(new Set(allPOIs.map(poi => poi.category))).sort();
      console.log(`🔍 FILTERING DEBUG: Available categories in POI data:`, actualCategories);
      console.log(`🔍 FILTERING DEBUG: Selected categories:`, filteredCategories);

      // Show sample POIs for debugging
      const samplePOIs = allPOIs.slice(0, 5);
      console.log(`🔍 FILTERING DEBUG: Sample POIs:`, samplePOIs.map(poi => ({ name: poi.name, category: poi.category })));
    }

    // Filter POIs directly when categories are selected
    displayPOIs = allPOIs.filter(poi => {
      if (!poi || !poi.category) {
        return false;
      }

      // Ensure all POI properties are safely converted to strings
      const poiCategory = normalizePoiString(poi.category).toLowerCase();
      const poiName = normalizePoiString(poi.name).toLowerCase();
      const description = normalizePoiString(poi.description).toLowerCase();

      const matchesCategory = filteredCategories.some(buttonCategory => {
        console.log(`🔍 FILTER MATCH DEBUG: Checking POI "${normalizePoiString(poi.name)}" (category: "${normalizePoiString(poi.category)}") against BUTTON filter "${buttonCategory}"`);

        // CRITICAL FIX: Map button categories to OSM filtering logic
        if (currentSite === 'zuhause') {
          // Map button categories to actual POI filtering
          switch(buttonCategory) {
            case 'parking':
              return poi.amenity === 'parking' || poi.amenity === 'parking_space' ||
                     poiName.includes('parking') || poiName.includes('parkplatz');
            
            case 'gastronomie':
              const isGastronomie = poi.amenity === 'restaurant' ||
                                   poi.amenity === 'cafe' ||
                                   poi.amenity === 'pub' ||
                                   poi.amenity === 'fast_food' ||
                                   poi.amenity === 'biergarten' ||
                                   poiName.includes('restaurant') ||
                                   poiName.includes('cafe') ||
                                   poiName.includes('gasthof') ||
                                   poiName.includes('gasterie') ||
                                   poiName.includes('kebap') ||
                                   poiName.includes('pizzeria') ||
                                   poiName.includes('sushi') ||
                                   poiName.includes('grill');
              if (isGastronomie) {
                console.log(`✅ GASTRONOMIE MATCH: ${normalizePoiString(poi.name)} (${poi.amenity})`);
              }
              return isGastronomie;
            
            case 'accommodation':
              return poi.tourism === 'camp_pitch' || poi.tourism === 'apartment' ||
                     poi.tourism === 'guest_house' || poi.tourism === 'chalet' ||
                     poiName.includes('camping') || poiName.includes('ferienwohnung');
            
            case 'services':
              return poi.tourism === 'information' || poi.amenity === 'post_box' ||
                     poi.amenity === 'atm' || poi.amenity === 'post_office' ||
                     poi.amenity === 'townhall' || poi.amenity === 'police' ||
                     poiName.includes('info') || poiName.includes('rathaus');
            
            case 'kultur':
              return poi.amenity === 'place_of_worship' || poi.building === 'church' ||
                     poiName.includes('kirche') || poiName.includes('kapelle');
            
            case 'sport':
              return poi.leisure === 'pitch' || poi.leisure === 'playground' ||
                     poi.leisure === 'stadium' || poi.leisure === 'swimming_pool' ||
                     poi.sport || poiName.includes('sportplatz') || poiName.includes('spielplatz');
            
            case 'shopping':
              const isShop = poiCategory === 'shop' || !!poi.shop;
              if (isShop) {
                console.log(`✅ SHOP MATCH: ${normalizePoiString(poi.name)} (category: ${poi.category}, shop: ${poi.shop})`);
              }
              return isShop;
            
            case 'gesundheit':
              return poi.amenity === 'doctors' || poi.amenity === 'pharmacy' ||
                     poi.amenity === 'dentist' || poi.amenity === 'school' ||
                     poi.amenity === 'kindergarten' || poi.healthcare ||
                     poiName.includes('arzt') || poiName.includes('apotheke') || poiName.includes('schule');
            
            default:
              return false;
          }
        } else {
          // Kamperland logic - map button categories to POI properties
          const categoryMappings: Record<string, string[]> = {
            'leisure': ['leisure', 'entertainment', 'recreation', 'playground', 'sports', 'swimming', 'pool', 'wellness', 'spa', 'tennis', 'golf', 'volleyball', 'fitness'],
            'facilities': ['facilities', 'services', 'reception', 'swimming_pool', 'wellness', 'restaurant', 'shop', 'playground'],
            'services': ['services', 'reception', 'information', 'shop', 'supermarket', 'bike', 'laundry', 'medical'],
            'food-drink': ['food', 'drink', 'restaurant', 'bar', 'cafe', 'snack', 'pizzeria', 'ice_cream', 'beachclub', 'terrace'],
            'parking': ['parking', 'car', 'vehicle', 'parkeerterrein'],
            'toilets': ['toilet', 'wc', 'restroom', 'sanitair', 'sanitairgebouw'],
            'accommodation': ['accommodation', 'hotel', 'camping', 'lodge'],
            'beach_houses': ['beach', 'strand', 'rp4', 'rp6a', 'rp6b', 'rp6c'],
            'bungalows': ['bungalow', 'comfort', 'ba', 'bb', 'bc', 'bd', 'be', 'bf', 'bg', 'bh', 'na', 'poi'],
            'chalets': ['chalet', 'rpk4a', 'rpk4b', 'rp4a', 'rp4b', 'rp6a', 'rp6b', 'rp6c'],
            'campgrounds': ['campground', 'camping', 'caravan', 'kamperplaats', 'comfort'],
            'lodges_water': ['lodge', 'water', 'lodge 4', 'lodge4', 'watervilla', 'lodge4'],
            'bungalows_water': ['bungalow', 'water', 'watervilla', '4a', '4b', '6a', '6b']
          };

        // Get mapped categories for this button filter
          const mappedCategories = categoryMappings[buttonCategory] || [];

          // Check category matches first - be more flexible with matching
          const categoryMatch = mappedCategories.some(mapped =>
            poiCategory.includes(mapped) || mapped.includes(poiCategory)
          );

          // Check name matches for better detection
          const nameMatch = mappedCategories.some(mapped =>
            poiName.includes(mapped) || mapped.includes(poiName)
          );

          // Check description for additional context
          const descriptionMatch = mappedCategories.some(mapped =>
            description.includes(mapped)
          );

        // Handle special accommodation types for Kamperland
          if (buttonCategory === 'beach_houses') {
            const roompotCat = normalizePoiString(poi.roompot_category).toLowerCase();
            const safeName = normalizePoiString(poi.name).toLowerCase();
            const safeBuildingType = normalizePoiString(poi.building_type).toLowerCase();

            const hasBeachHouseBuildingType = safeBuildingType === 'beach house';
            const hasBeachHouseInName = safeName.includes('beach house') || safeName.includes('strandhaus');
            const hasBeachHouseInCategory = roompotCat.includes('beach house');

            const isActualBeachHouse = hasBeachHouseBuildingType || hasBeachHouseInName || hasBeachHouseInCategory;
            console.log(`🏖️ Beach house check for "${normalizePoiString(poi.name)}": ${isActualBeachHouse}`);
            return isActualBeachHouse;
          }

          // Handle other accommodation types for Kamperland
          if (buttonCategory === 'bungalows') {
            const safeBuildingType = normalizePoiString(poi.building_type).toLowerCase();
            const safeName = normalizePoiString(poi.name).toLowerCase();
            const roompotCat = normalizePoiString(poi.roompot_category).toLowerCase();

            return safeBuildingType === 'bungalow' ||
                   safeName.includes('bungalow') ||
                   roompotCat.includes('bungalow');
          }

          return categoryMatch || nameMatch || descriptionMatch;
        }

        // Special handling for accommodation types
        if (selectedCategory === 'beach_houses') {
          const roompotCat = normalizePoiString(poi.roompot_category).toLowerCase();
          const safeName = normalizePoiString(poi.name).toLowerCase();
          const safeBuildingType = normalizePoiString(poi.building_type).toLowerCase();

          const hasBeachHouseBuildingType = safeBuildingType === 'beach house';
          const hasBeachHouseInName = safeName.includes('beach house') || safeName.includes('strandhaus');
          const hasBeachHouseInCategory = roompotCat.includes('beach house');

          const isActualBeachHouse = hasBeachHouseBuildingType || hasBeachHouseInName || hasBeachHouseInCategory;
          console.log(`🏖️ Beach house check for "${normalizePoiString(poi.name)}": ${isActualBeachHouse}`);
          return isActualBeachHouse;
        }

        // Handle other accommodation types
        if (selectedCategory === 'bungalows') {
          const safeBuildingType = normalizePoiString(poi.building_type).toLowerCase();
          const safeName = normalizePoiString(poi.name).toLowerCase();
          const roompotCat = normalizePoiString(poi.roompot_category).toLowerCase();

          return safeBuildingType === 'bungalow' ||
                 safeName.includes('bungalow') ||
                 roompotCat.includes('bungalow');
        }

        if (selectedCategory === 'chalets') {
          const safeBuildingType = normalizePoiString(poi.building_type).toLowerCase();
          const safeName = normalizePoiString(poi.name).toLowerCase();
          const roompotCat = normalizePoiString(poi.roompot_category).toLowerCase();

          return safeBuildingType === 'chalet' ||
                 safeName.includes('chalet') ||
                 roompotCat.includes('chalet');
        }

        if (selectedCategory === 'campgrounds') {
          const safeBuildingType = normalizePoiString(poi.building_type).toLowerCase();
          const safeName = normalizePoiString(poi.name).toLowerCase();
          const roompotCat = normalizePoiString(poi.roompot_category).toLowerCase();

          return safeBuildingType.includes('caravan') ||
                 safeBuildingType.includes('camping') ||
                 safeName.includes('caravan') ||
                 safeName.includes('camping') ||
                 roompotCat.includes('camping');
        }

        // LODGE FILTER - EINFACH UND DIREKT
        if (selectedCategory === 'lodges') {
          const safeBuildingType = normalizePoiString(poi.building_type).toLowerCase();
          const safeName = normalizePoiString(poi.name).toLowerCase();
          const safeRoompotCategory = normalizePoiString(poi.roompot_category).toLowerCase();
          const isLodge = safeBuildingType === 'lodge' ||
                         safeName.includes('lodge') ||
                         safeRoompotCategory.includes('lodge');

          console.log('🏠 Lodge check: "${poi.name}" = ${isLodge}', {
            building_type: poi.building_type,
            roompot_category: poi.roompot_category,
            match: isLodge
          });

          return isLodge;
        }

        if (selectedCategory === 'bungalows_water') {
          const safeBuildingType = normalizePoiString(poi.building_type).toLowerCase();
          const safeName = normalizePoiString(poi.name).toLowerCase();
          const roompotCat = normalizePoiString(poi.roompot_category).toLowerCase();

          return (safeBuildingType === 'bungalow' ||
                  safeName.includes('bungalow') ||
                  roompotCat.includes('bungalow')) &&
                 (safeName.includes('water') || roompotCat.includes('water'));
        }

        // Fix POI filtering to work with actual OSM categories
        if (selectedCategory === 'parking') {
          return poi.amenity === 'parking' ||
                 normalizePoiString(poi.name).toLowerCase().includes('parkplatz') ||
                 normalizePoiString(poi.name).toLowerCase().includes('parking');
        }

        // Handle OSM category:value format (e.g., "amenity:parking")
        if (selectedCategory.includes(':')) {
          const [osmKey, osmValue] = selectedCategory.split(':');
          if (poi[osmKey] === osmValue) {
            console.log(`✅ DIRECT OSM MATCH: ${normalizePoiString(poi.name)} matches ${selectedCategory}`);
            return true;
          }
        }

        // Handle direct OSM category matches for Zuhause
        if (currentSite === 'zuhause') {
          // Check for gastronomie category - match all restaurant-related amenities
          if (selectedCategory === 'amenity:restaurant') {
            const isGastronomie = poi.amenity === 'restaurant' ||
                                 poi.amenity === 'cafe' ||
                                 poi.amenity === 'pub' ||
                                 poi.amenity === 'fast_food' ||
                                 poi.amenity === 'biergarten';

            if (isGastronomie) {
              console.log(`✅ GASTRONOMIE MATCH: ${normalizePoiString(poi.name)} (${poi.amenity})`);
              return true;
            }
          }

          // Special handling for shop category
          if (selectedCategory === 'shop') {
            const hasShopTag = !!poi.shop;
            if (hasShopTag) {
              console.log(`✅ SHOP TAG MATCH: ${normalizePoiString(poi.name)} (shop: ${poi.shop})`);
              return true;
            }
          }

          // For Zuhause, check raw OSM properties
          if (poi.amenity && selectedCategory === 'amenity') return true;
          if (poi.leisure && selectedCategory === 'leisure') return true;
          if (poi.shop && selectedCategory === 'services') return true;
          if (poi.tourism && selectedCategory === 'accommodation') return true;
          if (poi.amenity === 'parking' && selectedCategory === 'parking') return true;

          // Additional checks for common OSM tags
          if (poi.amenity === 'place_of_worship' && selectedCategory === 'amenity') return true;
          if (poi.amenity === 'fire_station' && selectedCategory === 'amenity') return true;
          if (poi.amenity === 'school' && selectedCategory === 'amenity') return true;
          if (poi.leisure === 'playground' && selectedCategory === 'leisure') return true;
        } else {
          // Original Kamperland logic
          if (poi.amenity === selectedCategory ||
              poi.leisure === selectedCategory ||
              poi.shop === selectedCategory ||
              poi.tourism === selectedCategory ||
              poi.building === selectedCategory ||
              poi.sport === selectedCategory ||
              poi.healthcare === selectedCategory) {
            return true;
          }
        }

        return categoryMatch || nameMatch || descriptionMatch;
      });

      return matchesCategory;
    });

    console.log(`🔍 DISPLAY POIs: Showing ${displayPOIs.length} POIs for categories:`, filteredCategories);

    // Debug: Show which POIs matched
    if (displayPOIs.length > 0) {
      console.log(`🔍 FILTERING DEBUG: Matched POIs:`, displayPOIs.slice(0, 5).map(poi => ({ name: normalizePoiString(poi.name), category: normalizePoiString(poi.category) })));

      // Special debug for shop filter
      if (filteredCategories.includes('shop')) {
        const shopPOIs = allPOIs.filter(poi => poi.shop);
        console.log(`🛒 SHOP DEBUG: Found ${shopPOIs.length} POIs with shop tag`);
        console.log(`🛒 SHOP DEBUG: Sample shop POIs:`, shopPOIs.slice(0, 10).map(poi => ({
          name: normalizePoiString(poi.name),
          shop: poi.shop,
          category: poi.category
        })));
      }
    } else {
      console.log(`🔍 FILTERING DEBUG: No POIs matched filters. Analyzing...`);
      console.log(`🔍 FILTERING DEBUG: Filter categories:`, filteredCategories);
      console.log(`🔍 FILTERING DEBUG: Sample POI data:`, allPOIs.slice(0, 10).map(poi => ({
        name: normalizePoiString(poi.name),
        category: normalizePoiString(poi.category),
        description: normalizePoiString(poi.description)?.substring(0, 50) + '...'
      })));

      // Check for toilet-related POIs specifically
      const toiletPOIs = allPOIs.filter(poi => {
        const name = normalizePoiString(poi.name).toLowerCase();
        const cat = normalizePoiString(poi.category).toLowerCase();
        const desc = normalizePoiString(poi.description).toLowerCase();
        return name.includes('toilet') || name.includes('wc') || cat.includes('toilet') || desc.includes('toilet');
      });
      console.log(`🔍 FILTERING DEBUG: Found ${toiletPOIs.length} toilet-related POIs:`, toiletPOIs.slice(0, 3).map(poi => normalizePoiString(poi.name)));
    }
  } else {
    // CLEAN MAP: Hide POIs by default - user can search or filter to find what they need
    displayPOIs = [];
    console.log(`🔍 DISPLAY POIs: Clean map mode - no POIs shown (use search or filters to find destinations)`);
  }

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    // When search changes, show POIs on map immediately
    if (query.trim().length > 0) {
      setUIMode('search');
    } else {
      setUIMode('start');
    }
  }, []);

  // Removed hamburger menu - using permanent header approach

  const handleZoomIn = useCallback(() => {
    setMapZoom(prev => Math.min(prev + 1, 19));
  }, []);

  const handleZoomOut = useCallback(() => {
    setMapZoom(prev => Math.max(prev - 1, 1));
  }, []);

  const handleCenterOnLocation = useCallback(() => {
    if (currentPosition) {
      setMapCenter(currentPosition);
    }
  }, [currentPosition]);

  const handlePOIClick = useCallback(async (poi: POI) => {
    console.log('🔍 handlePOIClick called with:', poi);
    console.log('🔍 handlePOIClick POI details:', {
      id: poi?.id,
      name: normalizePoiString(poi?.name),
      category: normalizePoiString(poi?.category),
      hasCoordinates: !!(poi?.coordinates?.lat && poi?.coordinates?.lng)
    });

    if (!poi || !poi.id || !poi.name) {
      console.error('❌ handlePOIClick: Invalid POI data:', poi);
      return;
    }

    console.log('🔍 Setting POI states for:', normalizePoiString(poi.name));

    // Check if this is an enriched POI (accommodation types) that needs full data
    const isEnrichedPOI = normalizePoiString(poi.category).includes('beach_house') ||
                         normalizePoiString(poi.category).includes('beach_houses') ||
                         normalizePoiString(poi.name).toLowerCase().includes('beach house') ||
                         normalizePoiString(poi.name).toLowerCase().includes('strandhaus') ||
                         normalizePoiString(poi.category).includes('bungalow') ||
                         normalizePoiString(poi.category).includes('bungalows') ||
                         normalizePoiString(poi.name).toLowerCase().includes('bungalow') ||
                         normalizePoiString(poi.category).includes('chalet') ||
                         normalizePoiString(poi.category).includes('chalets') ||
                         normalizePoiString(poi.category).includes('lodge') ||
                         normalizePoiString(poi.category).includes('lodges') ||
                         normalizePoiString(poi.name).toLowerCase().includes('lodge');

    console.log('🔍 POI classification:', {
      isEnrichedPOI,
      poiName: normalizePoiString(poi.name),
      poiCategory: normalizePoiString(poi.category),
      nameIncludesBeachHouse: normalizePoiString(poi.name).toLowerCase().includes('beach house'),
      nameIncludesStrandhaus: normalizePoiString(poi.name).toLowerCase().includes('strandhaus')
    });

    let finalPOI = poi;

    // For accommodation types, fetch enriched data from the dedicated endpoint
    if (isEnrichedPOI) {
      console.log('🏠 Enriched POI detected, fetching full data for:', normalizePoiString(poi.name));
      try {
        const response = await fetch(`/api/pois/${poi.id}?site=kamperland`);
        if (response.ok) {
          const enrichedData = await response.json();
          console.log('🏠 FETCHED ENRICHED POI DATA:', enrichedData);
          finalPOI = enrichedData;
        } else {
          console.log('🔍 Failed to fetch enriched data, using basic POI data');
        }
      } catch (error) {
        console.error('🔍 Error fetching enriched POI data:', error);
      }
    }

    // Set selected POI with potentially enriched data
    setSelectedPOI(finalPOI);
    setMapCenter(finalPOI.coordinates);
    setUIMode('poi-info');
    setOverlayStates(prev => ({ ...prev, poiInfo: true, search: false }));

    if (isEnrichedPOI) {
      console.log('🏠 Enriched POI detected - showing enhanced dialog for:', normalizePoiString(finalPOI.name));
      setShowPOIDialog(true);
      setShowPOIOverlay(false);
    } else {
      console.log('📍 Regular POI detected - showing standard overlay for:', normalizePoiString(finalPOI.name));
      setShowPOIOverlay(true);
      setShowPOIDialog(false);
    }

    // Close other UI elements
    setIsDrawerOpen(false);
    setShowWeatherWidget(false);
  }, []);

  const handlePOISelect = useCallback((poi: POI) => {
    console.log(`🔍NAVIGATION: POI Selected: ${normalizePoiString(poi.name)}`);
    // Use the same logic as handlePOIClick for consistency
    handlePOIClick(poi);
  }, [handlePOIClick]);

  const handleMapClick = useCallback(() => {
    if (selectedPOI) {
      setSelectedPOI(null);
      setUIMode('start');
      setOverlayStates(prev => ({ ...prev, poiInfo: false }));
    }
  }, [selectedPOI]);

  // Handler for setting destination marker on long press
  const handleDestinationLongPress = useCallback((latlng: L.LatLng) => {
    console.log('🗺️ LONG PRESS DEBUG: Destination long press detected at', latlng);
    const newDestination = { lat: latlng.lat, lng: latlng.lng };
    console.log('🗺️ LONG PRESS DEBUG: Setting destination marker', newDestination);

    setDestinationMarker(newDestination);
    setMapCenter(newDestination); // Center map on the new destination
    setUIMode('route-planning');
    setOverlayStates(prev => ({ ...prev, routePlanning: true, search: false, poiInfo: false }));
    setCurrentRoute(null); // Clear existing route
    setIsNavigating(false); // Ensure we are not in navigating mode

    console.log('🗺️ LONG PRESS DEBUG: Destination marker state updated');

    toast({
      title: t('alerts.destinationSet'),
      description: `Tap "Start Navigation" to navigate to this location`,
      duration: 5000,
      action: (
        <Button
          variant="default"
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2"
          onClick={async () => {
            try {
              console.log('🗺️ LONG PRESS DEBUG: Starting route calculation');
              const profile = travelMode === 'car' ? 'driving' : travelMode === 'bike' ? 'cycling' : 'walking';
              const route = await getRoute.mutateAsync({
                from: currentPosition,
                to: newDestination,
                mode: profile
              });
              setCurrentRoute(route);

              // Initial voice announcement when navigation starts
              if (voiceEnabled && secureTTSRef.current && route?.instructions?.length > 0) {
                const firstInstruction = route.instructions[0];
                const initialText = `Navigation gestartet. ${firstInstruction.instruction || 'Geradeaus weiterfahren'}`;
                console.log('🎤 Initial navigation announcement:', initialText);
                secureTTSRef.current.speak(initialText, 'start');
              }

              setIsNavigating(true);
              setUIMode('navigation');
              setOverlayStates(prev => ({ ...prev, navigation: true, routePlanning: false }));
              toast({
                title: t('alerts.routeStarted'),
                description: "Follow the blue route on the map",
                duration: 3000
              });
            } catch (error) {
              console.error('🗺️ LONG PRESS DEBUG: Route calculation failed', error);
              // Track failed route for network debugging
              setLastFailedRoute({
                start: { lat: currentPosition.lat, lng: currentPosition.lng },
                end: { lat: newDestination.lat, lng: newDestination.lng }
              });
              // Auto-enable network debug visualization on routing failure
              setShowNetworkDebug(true);
              setFailedRoutingCoords({
                start: { lat: currentPosition.lat, lng: currentPosition.lng },
                end: { lat: newDestination.lat, lng: newDestination.lng }
              });
              toast({
                title: "Routing fehlgeschlagen",
                description: "Keine Route gefunden - Netzwerk-Disconnect sichtbar auf Karte",
                variant: "destructive",
              });
            }
          }}
        >
          Start Navigation
        </Button>
      ),
    });
  }, [toast, currentPosition, getRoute, travelMode, t]);

  // Handler for single tap - just close overlays if needed
  const handleMapSingleTap = useCallback(() => {
    console.log('🗺️ SINGLE TAP DEBUG: Single tap detected - handling map interaction');
    if (selectedPOI) {
      setSelectedPOI(null);
      setUIMode('start');
      setOverlayStates(prev => ({ ...prev, poiInfo: false }));
    }
  }, [selectedPOI]);


  const handleNavigateToPOI = useCallback(async (poi: POI) => {
    console.log('🧭 Navigation to POI requested:', normalizePoiString(poi.name));

    if (!currentPosition) { // Changed from 'position' to 'currentPosition' for clarity
      console.error('❌ No position available for navigation');
      return;
    }

    // Safety check for POI coordinates
    if (!poi || !poi.coordinates || typeof poi.coordinates.lat !== 'number' || typeof poi.coordinates.lng !== 'number') {
      console.error('❌ Invalid POI coordinates:', poi);
      return;
    }

    const destination = { lat: poi.coordinates.lat, lng: poi.coordinates.lng };
    
    // CRITICAL: Set destination for re-routing capability
    destinationRef.current = destination;

    const startTime = performance.now();
    mobileLogger.log('NAVIGATION', `Starting navigation to ${normalizePoiString(poi.name)} with mode: ${travelMode}`);

    try {
      // 1. IMMEDIATELY hide POI info box - FIRST ACTION
      setSelectedPOI(null);

      console.log('🚗 TRAVEL MODE DEBUG:', { selectedMode: travelMode, profileMapping: travelMode === 'pedestrian' ? 'walking' : travelMode === 'car' ? 'driving' : 'cycling' });
      setOverlayStates({ search: false, poiInfo: false, routePlanning: false, navigation: false });

      // Clear any existing route to force fresh calculation
      setCurrentRoute(null);

      // 2. Show calculating state
      setIsNavigating(false); // Clear any existing navigation

      // 3. Calculate route with selected travel mode
      const profile = travelMode === 'car' ? 'driving' : travelMode === 'bike' ? 'cycling' : 'walking';
      console.log('🚗 ROUTING WITH PROFILE:', profile, 'from travel mode:', travelMode);

      const route = await getRoute.mutateAsync({
        from: currentPosition, // Use currentPosition here
        to: destination,
        mode: profile
      });

      // Handle the case where no route is returned
      if (!route) {
        console.warn('No route received from server');
        // Track failed route for network debugging
        const failedCoords = {
          start: { lat: currentPosition.lat, lng: currentPosition.lng },
          end: { lat: destination.lat, lng: destination.lng }
        };
        setLastFailedRoute(failedCoords);
        setFailedRoutingCoords(failedCoords);
        // Auto-enable network debug visualization on routing failure
        setShowNetworkDebug(true);
        console.log('🔍 FAILED ROUTE DEBUG: Setting failed coordinates:', failedCoords);
        toast({
          title: "Routing fehlgeschlagen",
          description: "Keine Route gefunden - Netzwerk-Disconnect sichtbar auf Karte",
          variant: "destructive",
        });
        return;
      }

      // 4. Start navigation with panel at bottom
      setCurrentRoute(route);
      setDestinationMarker(destination); // Store destination for travel mode changes

      // Initial voice announcement when navigation starts
      if (voiceEnabled && secureTTSRef.current && route?.instructions?.length > 0) {
        const firstInstruction = route.instructions[0];
        const initialText = `Navigation gestartet. ${firstInstruction.instruction || 'Geradeaus weiterfahren'}`;
        console.log('🎤 Initial POI navigation announcement:', initialText);
        secureTTSRef.current.speak(initialText, 'start');
      }

      setIsNavigating(true);

      // Auto-switch to driving orientation during navigation
      setMapOrientation('driving');

      mobileLogger.logPerformance('Navigation setup', startTime);
      mobileLogger.log('NAVIGATION', `Navigation started successfully to ${normalizePoiString(poi.name)}`);
      setUIMode('navigation');
      setOverlayStates(prev => ({ ...prev, navigation: true }));

      // Navigation started - no confirmation dialog needed
      console.log('✅ POI Navigation successfully started with voice:', voiceEnabled);
    } catch (error) {
      console.error('🗺️ ROUTING ERROR:', error);
      // Track failed route for network debugging
      const failedCoords = {
        start: { lat: currentPosition.lat, lng: currentPosition.lat },
        end: { lat: destination.lat, lng: destination.lng }
      };
      setLastFailedRoute(failedCoords);
      setFailedRoutingCoords(failedCoords);
      // Auto-enable network debug visualization on routing failure
      setShowNetworkDebug(true);
      console.log('🔍 FAILED ROUTE DEBUG: Setting failed coordinates from catch:', failedCoords);
      toast({
        title: "Routing fehlgeschlagen",
        description: "Keine Route gefunden - Netzwerk-Disconnect sichtbar auf Karte",
        variant: "destructive",
      });
    }
  }, [currentPosition, getRoute, toast, travelMode]); // Added currentPosition to dependencies

  const handleEndNavigation = useCallback(() => {
    setIsNavigating(false);
    setCurrentRoute(null);
    setDestinationMarker(null);
    setCurrentInstruction('');
    // trackingPosition is now computed, no need to set it manually
    setUIMode('start'); // Changed from 'normal' to 'start' for consistency with initial UI state
    setOverlayStates(prev => ({ ...prev, navigation: false }));

    // CRITICAL: TTS Cache komplett leeren bei Navigation-Ende
    if (secureTTSRef.current) {
      secureTTSRef.current.clearCache();
      console.log('🧹NAVIGATION END: TTS Cache komplett geleert');
    }

    // Reset map orientation
    setMapOrientation('north');

    mobileLogger.log('NAVIGATION', 'Navigation ended by user');
    console.log('Navigation ended successfully');
  }, []); // No dependencies needed

  // This handler is likely intended to close the POI overlay/dialog.
  // Updated to also close the new dialog state.
  const handleClosePOI = useCallback(() => {
    console.log(`🔍 NAVIGATION: Closing POI overlay/dialog`);
    setSelectedPOI(null);
    setShowPOIOverlay(false);
    setShowPOIDialog(false);
  }, []);

  const handleCategoryFilter = useCallback((category: string) => {
    console.log('🔍 CATEGORY FILTER DEBUG: ==========================================');
    console.log('🔍 CATEGORY FILTER DEBUG: handleCategoryFilter called with:', category);
    console.log('🔍 CATEGORY FILTER DEBUG: Current filteredCategories before:', filteredCategories);

    // Debug available POI categories from actual data
    if (allPOIs && allPOIs.length > 0) {
      const actualCategories = Array.from(new Set(allPOIs.map(poi => poi.category))).sort();
      console.log('🔍 CATEGORY FILTER DEBUG: Available POI categories in data:', actualCategories);
    }

    setFilteredCategories(prev => {
      const isCurrentlySelected = prev.includes(category);
      const newCategories = isCurrentlySelected
        ? prev.filter(c => c !== category)
        : [...prev, category];

      console.log('🔍 CATEGORY FILTER DEBUG: UI State change:', {
        action: isCurrentlySelected ? 'REMOVE' : 'ADD',
        buttonCategory: category,
        previousState: prev,
        newState: newCategories,
        willShowPOIs: newCategories.length > 0,
        buttonWillBeActive: !isCurrentlySelected
      });

      return newCategories;
    });
  }, [allPOIs]);

  // Update map center when current position changes
  useEffect(() => {
    console.log('🗺️ MAP CENTER UPDATE: currentPosition changed to:', currentPosition);
    setMapCenter(currentPosition);
  }, [currentPosition]);

  // Listen for site changes and update local state
  useEffect(() => {
    const handleStorageChange = () => {
      const newSite = localStorage.getItem('selected-site') as TestSite;
      if (newSite && newSite !== currentSite) {
        console.log('📍 NAVIGATION: Site change detected:', currentSite, '->', newSite);
        // Instead of setting currentSite directly, use the setSite function from SiteManager
        // This ensures that any side effects of site changes are handled correctly.
        setSite(newSite);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(handleStorageChange, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [currentSite, setSite]); // Added setSite to dependencies

  const handleSiteChange = useCallback((site: Site) => {
    console.log(`🔄 Navigation: Site change requested - ${currentSite} -> ${site}`);

    // Use SiteManager setSite function (already extracted at component top-level)
    setSite(site);

    // Clear navigation state when changing sites
    setSelectedPOI(null);
    setCurrentRoute(null);
    setIsNavigating(false);

    // Update map view to new site's coordinates (SiteManager will handle coordinates)
    setMapZoom(16);
    setSearchQuery('');
    setFilteredCategories([]);
    setDestinationMarker(null); // Clear destination marker on site change

    // Also ensure overlays and dialogs are closed on site change
    setShowPOIOverlay(false);
    setShowPOIDialog(false);


    console.log(`🔄 Navigation: Site change completed - localStorage updated to: ${site}`);

    toast({
      title: t('alerts.siteChanged'),
      description: `${t('alerts.siteSwitched')} ${normalizePoiString(TEST_SITES.find(s => s.id === site)?.name) || site}`,
    });
  }, [toast, currentSite, t, setSite]);

  const handleClearPOIs = useCallback(() => {
    setSearchQuery('');
    setFilteredCategories([]);
    setSelectedPOI(null);
    setUIMode('start');
    setOverlayStates(prev => ({ ...prev, search: false, poiInfo: false }));
    setDestinationMarker(null); // Clear destination marker
    // Ensure dialogs are also closed
    setShowPOIOverlay(false);
    setShowPOIDialog(false);

    // CRITICAL: TTS Cache leeren bei POI Clear - jeder neue POI = neuer Start
    if (secureTTSRef.current) {
      secureTTSRef.current.clearCache();
      console.log('🧹 POI CLEAR: TTS Cache komplett geleert für neuen Start');
    }

    toast({
      title: t('alerts.poisCleared'),
      description: t('alerts.poisHidden'),
    });
  }, [toast, t]);

  // Handle travel mode changes and automatically recalculate route if we have one
  const handleTravelModeChange = async (newMode: 'car' | 'bike' | 'pedestrian') => {
    console.log(`🚗 TRAVEL MODE CHANGE: ${travelMode} → ${newMode}`);
    setTravelMode(newMode);

    // CRITICAL: Force immediate ETA recalculation with new travel mode
    if (isNavigating && routeTrackerRef.current && trackingPosition) {
      const updatedProgress = routeTrackerRef.current.updatePosition(trackingPosition, newMode);
      setRouteProgress(updatedProgress);
      console.log(`🎯 INSTANT ETA UPDATE: ${newMode} = ${Math.ceil(updatedProgress.dynamicETA?.estimatedTimeRemaining / 60)} min`);
    }

    // Immediately update ETA for current route with new travel mode
    if (currentRoute && routeProgress) {
      const speedTracker = new (await import('../lib/speedTracker')).SpeedTracker();
      const remainingDistance = routeProgress.distanceRemaining / 1000; // Convert to km
      const newETA = speedTracker.getETAForMode(remainingDistance, newMode);

      console.log(`🔄 DYNAMIC ETA UPDATE: ${newMode} mode - ${Math.ceil(newETA.estimatedTimeRemaining / 60)} min`);

      // Update route with new ETA information
      setCurrentRoute(prevRoute => ({
        ...prevRoute!,
        estimatedTime: Math.ceil(newETA.estimatedTimeRemaining / 60) >= 60
          ? `${Math.floor(newETA.estimatedTimeRemaining / 3600)}h ${Math.floor((newETA.estimatedTimeRemaining % 3600) / 60)}m`
          : `${Math.ceil(newETA.estimatedTimeRemaining / 60)} min`,
        durationSeconds: newETA.estimatedTimeRemaining,
        arrivalTime: newETA.estimatedArrival.toLocaleTimeString('de-DE', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })
      }));
    }

    // If we have a current route, recalculate with new travel mode
    // Use destinationMarker as fallback if selectedPOI was cleared
    const destination = selectedPOI?.coordinates || destinationMarker;

    if (currentRoute && destination) {
      const profile = newMode === 'car' ? 'driving' : newMode === 'bike' ? 'cycling' : 'walking';
      console.log('🔄 AUTO-RECALCULATING route with PROFILE:', profile, 'from mode:', newMode);
      console.log('🔍 Route request details:', {
        from: currentPosition,
        to: { lat: destination.lat, lng: destination.lng },
        profile,
        travelMode: newMode,
        usingDestination: selectedPOI ? 'selectedPOI' : 'destinationMarker'
      });

      try {
        const newRoute = await getRoute.mutateAsync({
          from: currentPosition,
          to: { lat: destination.lat, lng: destination.lng },
          mode: profile
        });
        setCurrentRoute(newRoute);
        console.log('✅ Route recalculated successfully with new mode:', newMode, 'profile:', profile);
      } catch (error) {
        console.error('❌ Failed to recalculate route with new travel mode:', error);
      }
    } else {
      console.log('🚫 NOT recalculating - missing requirements:', {
        hasRoute: !!currentRoute,
        hasPOI: !!selectedPOI,
        hasDestinationMarker: !!destinationMarker,
        hasAnyDestination: !!(selectedPOI?.coordinates || destinationMarker)
      });
    }
  };

  const handleCloseOverlay = useCallback(() => {
    setSelectedPOI(null);
    setUIMode('start');
    setOverlayStates(prev => ({ ...prev, search: false, poiInfo: false, routePlanning: false }));
    setDestinationMarker(null); // Clear destination marker
    // Ensure dialogs are also closed
    setShowPOIOverlay(false);
    setShowPOIDialog(false);
  }, []);

  // Gesture navigation handlers
  const handleNavigateLeft = useCallback(() => {
    const panels = ['search', 'map', 'navigation', 'settings'] as const;
    const currentIndex = panels.indexOf(currentPanel);
    if (currentIndex > 0) {
      setCurrentPanel(panels[currentIndex - 1]);
    }
  }, [currentPanel]);

  const handleNavigateRight = useCallback(() => {
    const panels = ['search', 'map', 'navigation', 'settings'] as const;
    const currentIndex = panels.indexOf(currentPanel);
    if (currentIndex < panels.length - 1) {
      setCurrentPanel(panels[currentIndex + 1]);
    }
  }, [currentPanel]);

  // POI Category Filter Handler for Quick Access (duplicate removed)

  // Voice toggle handler - ElevenLabs TTS
  const handleToggleVoice = useCallback(() => {
    const newVoiceState = !voiceEnabled;
    setVoiceEnabled(newVoiceState);

    console.log(`🎤 ElevenLabs TTS ${newVoiceState ? 'aktiviert' : 'deaktiviert'}`);
  }, [voiceEnabled]);

  // Enhanced map style change handler with Railway debugging
  const handleMapStyleChange = useCallback((style: 'outdoors' | 'satellite' | 'streets' | 'navigation') => {
    console.log('🗺️ DEBUG - Navigation.tsx handleMapStyleChange:', {
      newStyle: style,
      currentStyle: mapStyle,
      isNavigating,
      environment: import.meta.env.MODE,
      userAgent: navigator.userAgent.substring(0, 100),
      timestamp: new Date().toISOString()
    });

    try {
      setMapStyle(style);
      console.log('🗺️ DEBUG - setMapStyle completed successfully');

      // Auto-switch to driving orientation for navigation style when active navigation
      if (style === 'navigation' && isNavigating) {
        console.log('🗺️ DEBUG - Auto-switching to driving orientation for navigation style');
        setMapOrientation('driving');
      }

      // Force re-render of map component
      setTimeout(() => {
        console.log('🗺️ DEBUG - Map style change should be visible now');
      }, 100);

    } catch (error) {
      console.error('🗺️ ERROR - handleMapStyleChange failed:', error);
      // Fallback to default style if something goes wrong
      setMapStyle('outdoors');
    }
  }, [isNavigating, mapStyle]);

  // Get current language from hook
  const { currentLanguage } = useLanguage();

  // Initialize ElevenLabs TTS when component mounts
  useEffect(() => {
    try {
      if (!secureTTSRef.current) {
        secureTTSRef.current = new SecureTTSClient();
        console.log('🎤 ElevenLabs TTS Client initialisiert');
      }
    } catch (error) {
      console.error('ElevenLabs TTS initialization failed:', error);
      secureTTSRef.current = null;
    }
  }, []);

  // Language handled automatically by ElevenLabs German TTS
  useEffect(() => {
    console.log(`🎙️ Voice guidance language: ${currentLanguage} (ElevenLabs auto-deutsch)`);
  }, [currentLanguage]);

  // Voice enabled state managed by VoiceControlPanel
  useEffect(() => {
    console.log(`🎤 ElevenLabs TTS ${voiceEnabled ? 'aktiviert' : 'deaktiviert'}`);
  }, [voiceEnabled]);

  // Navigation tracking - Initialize route tracker when navigation starts
  useEffect(() => {
    if (isNavigating && currentRoute && trackingPosition) {
      console.log('Initializing route tracker for navigation');

      routeTrackerRef.current = new RouteTracker(
        currentRoute,
        (step) => {
          // Update current instruction when step changes
          if (currentRoute.instructions[step]) {
            const instruction = currentRoute.instructions[step].instruction;
            setCurrentInstruction(instruction);

            // Voice announcement mit ElevenLabs TTS
            if (secureTTSRef.current && voiceEnabled) {
              console.log('🎤 ElevenLabs Navigation:', instruction);
              secureTTSRef.current.speak(instruction, 'direction').catch(err =>
                console.error('TTS Error:', err)
              );
            }
          }
        },
        () => {
          // Navigation completed
          console.log('Navigation completed');
          if (secureTTSRef.current && voiceEnabled) {
            console.log('🎯 ElevenLabs Ziel erreicht');
            secureTTSRef.current.speak('Sie haben Ihr Ziel erreicht', 'arrival').catch(err =>
              console.error('TTS Error:', err)
            );
          }
          handleEndNavigation();
        },
        (offRouteDistance) => {
          // Off route detection with real re-routing
          console.log('Off route detected, distance:', offRouteDistance);

          // CRITICAL: Mock GPS Mode - disable off-route re-routing to prevent loops
          if (!useRealGPS) {
            console.log('🔍 MOCK GPS MODE: Off-route re-routing disabled to prevent loops - NO TTS');
            return;
          }

          // Only announce re-routing if we're actually doing it
          if (secureTTSRef.current && voiceEnabled) {
            console.log('🔄 ElevenLabs Route neu berechnen');
            secureTTSRef.current.speak('Route wird neu berechnet', 'warning').catch(err =>
              console.error('TTS Error:', err)
            );
          }
          
          // Hysterese: 5m für Campingplatz/Dorf Navigation - schnelle Reaktion bei kurzen Wegen
          if (!reroutingRef.current && offRouteDistance > 5 && destinationRef.current) {
            reroutingRef.current = true;
            (async () => {
              try {
                const profile = travelMode === 'car' ? 'driving' : travelMode === 'bike' ? 'cycling' : 'walking';
                const newRoute = await getRoute.mutateAsync({
                  from: trackingPosition || currentPosition,  // sicherheitshalber mit fallback
                  to: destinationRef.current!,         // Ziel beibehalten
                  mode: profile
                });
                setCurrentRoute(newRoute);
                setCurrentInstruction(newRoute.instructions?.[0]?.instruction || 'Weiter geradeaus');
                setNextDistance(newRoute.instructions?.[0]?.distance || '0 m');

                // Tracker neu starten
                if (routeTrackerRef.current) {
                  routeTrackerRef.current.reset();
                  routeTrackerRef.current = null;
                }
                // Trigger useEffect to create new tracker with new route
              } catch (err) {
                console.error('Re-route error', err);
              } finally {
                // kleine Abkühlphase
                setTimeout(() => { reroutingRef.current = false; }, 3000);
              }
            })();
          }
        }
      );

      // Set initial instruction
      if (currentRoute.instructions.length > 0) {
        setCurrentInstruction(currentRoute.instructions[0].instruction);
        setNextDistance(currentRoute.instructions[0].distance);
      }
    }

    return () => {
      if (routeTrackerRef.current) {
        routeTrackerRef.current.reset();
        routeTrackerRef.current = null;
      }
    };
  }, [isNavigating, currentRoute, voiceEnabled, handleEndNavigation]);

  // Live position tracking during navigation
  useEffect(() => {
    if (isNavigating && routeTrackerRef.current && trackingPosition) {
      const progress = routeTrackerRef.current.updatePosition(trackingPosition, travelMode);

      setRouteProgress(progress);
      setNextDistance(formatDistance(progress.distanceToNext));

      // KRITISCHER FIX: Aktualisiere currentInstruction bei jedem Step-Change
      if (progress && currentRoute?.instructions?.[progress.currentStep]) {
        const newInstruction = currentRoute.instructions[progress.currentStep];
        // Extract instruction string from RouteInstruction object
        const instructionText = typeof newInstruction === 'string' 
          ? newInstruction 
          : newInstruction.instruction || 'Weiter geradeaus';
        setCurrentInstruction(instructionText);
      }

      // Update map center to follow user during navigation
      setMapCenter(trackingPosition);
    }
  }, [isNavigating, trackingPosition, useRealGPS, currentRoute, travelMode]);

  console.log('🔍 Navigation: Starting render...', {
    position: !!trackingPosition,
    isNavigating,
    selectedPOI: !!selectedPOI
  });

  try {
    // Remove this duplicate calculation - using the displayPOIs calculated above

    console.log('🔍 POIRENDERING DEBUG:', {
      totalPOIs: displayPOIs.length,
      filteredCategories,
      firstFewPOIs: displayPOIs.slice(0, 3).map(poi => normalizePoiString(poi.name)),
      poiDataLoading: poisLoading,
      poiDataError: undefined, // Assuming usePOI hook handles error display if any
      shouldShowPOIs: displayPOIs.length > 0
    });

    // Handle loading state within main render flow
    if (poisLoading) {
      return (
        <div className="h-screen w-full flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{t('status.loading')}</p>
          </div>
        </div>
      );
    }

    // The original code's return statement starts here.
    // The changes indicate wrapping the entire return content within an ErrorBoundary.
    // The original code had a try-catch block at the very end which is now redundant
    // because the ErrorBoundary will catch render errors.

    return (
      <ErrorBoundary
        onError={(error) => {
          console.error('🚨 Navigation page error:', error);
          // Clear navigation state on error
          setIsNavigating(false);
          setSelectedPOI(null);
        }}
        fallback={
          <div className="h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center p-6">
              <h2 className="text-2xl font-bold text-red-600 mb-4">Navigation System Error</h2>
              <p className="text-gray-600 mb-4">The navigation system encountered an error and needs to restart.</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Restart Navigation
              </button>
            </div>
          </div>
        }
      >
        <div className="navigation-page h-screen w-screen overflow-hidden bg-gray-50">
          {/* Mobile Memory Monitor - only show in development */}
          {isDev && (
            <MobileMemoryMonitor />
          )}

          

          <div className="flex h-[calc(100vh-4rem)]">
            {/* Main Map Area */}
            <div className="flex-1 relative">
              <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                currentPosition={trackingPosition || currentPosition}
                rotation={mapRotation}
                pois={(() => {
                  let poisToShow = displayPOIs;

                  // SMART POI FILTERING: During navigation, hide ALL POIs for clean map view
                  if (isNavigating) {
                    console.log('🎯 SMART FILTERING: Navigation active - hiding ALL POIs for clean navigation view');
                    console.log('🎯 Navigation state:', { isNavigating, selectedPOI: selectedPOI?.name, currentRoute: !!currentRoute });

                    // Hide ALL POIs during navigation for minimal distraction
                    poisToShow = [];

                    // Only show the destination POI if we have one selected
                    if (selectedPOI) {
                      // Find the selected POI in the full displayPOIs array
                      const destinationPOI = displayPOIs.find(poi => poi.id === selectedPOI.id);
                      if (destinationPOI) {
                        poisToShow = [destinationPOI];
                        console.log('🎯 SMART FILTERING: Showing only destination POI:', normalizePoiString(destinationPOI.name));
                      } else {
                        console.log('🎯 SMART FILTERING: Selected POI not found in displayPOIs, showing empty array');
                      }
                    }
                  }

                  const poisWithDistance = poisToShow.map(poi => ({
                    ...poi,
                    distance: formatDistance(calculateDistance(trackingPosition || currentPosition, poi.coordinates))
                  }));

                  console.log(`🗺️ MAP CONTAINER DEBUG: Passing ${poisWithDistance.length} POIs to map (Navigation: ${isNavigating})`);
                  if (poisWithDistance.length > 0) {
                    console.log(`🗺️ MAP CONTAINER DEBUG: First POI:`, normalizePoiString(poisWithDistance[0].name));
                  }
                  return poisWithDistance;
                })()}
                selectedPOI={selectedPOI}
                route={currentRoute}
                filteredCategories={filteredCategories}
                onPOIClick={handlePOIClick}
                onPOIHover={undefined}
                onMapClick={handleMapSingleTap}
                onMapLongPress={typeof window !== 'undefined' && window.innerWidth > 768 ? handleDestinationLongPress : undefined}
                onMapDoubleTap={typeof window !== 'undefined' && window.innerWidth > 768 ? handleDestinationLongPress : undefined}
                mapStyle={mapStyle}
                destinationMarker={destinationMarker}
                showNetworkOverlay={showNetworkOverlay}
              >
              </MapContainer>
            </div>
          </div>


          {/* EXPLORATION MODE - Only visible when NOT navigating */}
          {!isNavigating && (
            <>
              {/* Permanent Header - Search and Location Selection */}
              <div className="z-[1000]">
                <PermanentHeader
                  searchQuery={searchQuery}
                  onSearch={handleSearch}
                  currentSite={currentSite}
                  onSiteChange={handleSiteChange}
                  showClearButton={displayPOIs.length > 0 || searchQuery.length > 0 || filteredCategories.length > 0}
                  onClear={handleClearPOIs}
                />
              </div>

              {/* Lightweight POI Buttons - Left Side - Vertical Stack - Properly Centered */}
              <LightweightPOIButtons
                onCategorySelect={handleCategoryFilter}
                activeCategories={filteredCategories}
                selectedPOI={!!selectedPOI}
              />



              {/* Camping Weather Widget */}
              <CampingWeatherWidget coordinates={currentPosition} />
            </>
          )}



          {/* Enhanced Map Controls - Always Visible (Right Side) */}
          <EnhancedMapControls
            onToggleVoice={handleToggleVoice}
            onMapStyleChange={handleMapStyleChange}
            isVoiceEnabled={voiceEnabled}
            mapStyle={mapStyle}
            useRealGPS={useRealGPS}
            onToggleGPS={toggleGPS}
            travelMode={travelMode}
            onTravelModeChange={handleTravelModeChange}
            onZoomIn={() => setMapZoom(prev => Math.min(prev + 1, 18))}
            onZoomOut={() => setMapZoom(prev => Math.max(prev - 1, 0))}
            onCenterOnLocation={() => {
              if (currentPosition) {
                setMapCenter(currentPosition);
              }
            }}
            compassMode={mapOrientation === 'driving' ? 'bearing' : 'north'}
            onToggleCompass={() => setMapOrientation(prev => prev === 'north' ? 'driving' : 'north')}
            showNetworkOverlay={showNetworkOverlay}
            onToggleNetworkOverlay={() => setShowNetworkOverlay(!showNetworkOverlay)}
          />


          {/* POI Info Overlay - Positioned below button rows */}
          {showPOIOverlay && selectedPOI && (
            <TransparentPOIOverlay
              poi={selectedPOI}
              onNavigate={handleNavigateToPOI}
              onClose={handleClosePOI}
            />
          )}

          {/* Enhanced POI Dialog for enriched accommodations */}
                      {showPOIDialog && selectedPOI && (
            <EnhancedPOIDialog
              poi={selectedPOI}
              isOpen={showPOIDialog}
              onClose={handleClosePOI}
              onNavigate={handleNavigateToPOI}
            />
          )}


          {/*NAVIGATION MODE - Only visible when actively navigating */}
          {isNavigating && currentRoute && currentRoute.instructions && currentRoute.instructions.length > 0 && (
            <>
              {/* Top: Current Maneuver */}
              <TopManeuverPanel
                instruction={currentInstruction || (typeof currentRoute.instructions[0]?.instruction === 'string' ? currentRoute.instructions[0].instruction : 'Weiter geradeaus')}
                distance={nextDistance}
                maneuverType={routeProgress?.currentStep >= 0 && currentRoute.instructions[routeProgress.currentStep] 
                  ? currentRoute.instructions[routeProgress.currentStep]?.maneuverType 
                  : currentRoute.instructions[0]?.maneuverType}
              />

              {/* Bottom: Navigation Summary with End Button */}
              <BottomSummaryPanel
                timeRemaining={routeProgress?.dynamicETA?.estimatedTimeRemaining
                  ? `${Math.ceil(routeProgress.dynamicETA.estimatedTimeRemaining / 60)} min`
                  : (typeof currentRoute.estimatedTime === 'string' ? currentRoute.estimatedTime : "4 min")}
                distanceRemaining={routeProgress?.distanceRemaining
                  ? formatDistance(routeProgress.distanceRemaining)
                  : (typeof currentRoute.totalDistance === 'string' ? currentRoute.totalDistance : "396 m")}
                eta={routeProgress?.dynamicETA?.estimatedArrival
                  ? routeProgress.dynamicETA.estimatedArrival.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
                  : (typeof currentRoute.eta === 'string' ? currentRoute.eta : new Date(Date.now() + 240000).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }))}
                onEndNavigation={handleEndNavigation}
              />

              {/* Filter Modal - Preserved */}
              {/* The FilterModal is no longer directly controlled by a button click,
                  but the state and component remain in case it's needed for future refinements
                  or if the LightweightPOIButtons are expanded to trigger it. */}
              <div style={{ display: showFilterModal ? 'block' : 'none' }}>
                {/* Placeholder for FilterModal if needed in future, managed via state */}
              </div>

              {/* POI Detail Overlay */}
              {showPOIOverlay && selectedPOI && (
                <TransparentPOIOverlay
                  poi={selectedPOI}
                  onNavigate={handleNavigateToPOI}
                  onClose={handleCloseOverlay}
                />
              )}

            </>
          )}

        </div>
      </ErrorBoundary>
    );
  } catch (error) {
    // This catch block is now for synchronous errors during the setup of hooks or initial state,
    // or errors within the ErrorBoundary's fallback rendering logic if it itself fails.
    // Most render errors will be caught by the ErrorBoundary.
    console.error('🚨 Navigation: Top-level render setup error:', error);
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 max-w-md w-full shadow-lg border border-white/20">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-6 h-6 text-red-500">⚠️</div>
            <h2 className="text-lg font-semibold text-gray-900">Navigation Critical Error</h2>
          </div>

          <p className="text-gray-600 mb-4">
            A critical error occurred during navigation setup. Please reload the application.
          </p>

          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Reload App
          </button>

          {isDev && (
            <details className="mt-4 text-xs">
              <summary className="cursor-pointer text-gray-500">Error Details</summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                {error?.toString()}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}