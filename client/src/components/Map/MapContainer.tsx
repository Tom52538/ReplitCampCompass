import { useEffect, useState, useCallback, useRef } from 'react';
import { MapContainer as LeafletMapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import { Icon, LatLng, Map as LeafletMap } from 'leaflet';
import { POI, NavigationRoute, Coordinates } from '@/types/navigation';
import { POIMarker } from './POIMarker';
import { mobileLogger } from '@/utils/mobileLogger';
import { GestureController } from './GestureController';
import { GestureEnhancedMap } from './GestureEnhancedMap'; // Corrected import path
import { ZoomGestureIndicator } from './ZoomGestureIndicator'; // Assuming this component needs an import
import { Button } from '@/components/ui/button';

import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Helper for creating div icons (assuming divIcon is imported from leaflet or a custom hook)
// If divIcon is not available globally, it needs to be imported. Assuming it's imported from leaflet.
import { divIcon } from 'leaflet';
import { NetworkOverlay } from './NetworkOverlay';


interface MapContainerProps {
  center: Coordinates;
  zoom: number;
  currentPosition: Coordinates;
  pois: POI[];
  selectedPOI: POI | null;
  route: NavigationRoute | null;
  filteredCategories: string[];
  onPOIClick: (poi: POI) => void;
  onPOIHover: ((poi: POI | null) => void) | undefined;
  onMapClick: () => void;
  onMapLongPress: (latlng: L.LatLng) => void;
  onMapDoubleTap: (latlng: L.LatLng) => void;
  mapStyle: 'outdoors' | 'satellite' | 'streets' | 'navigation';
  destinationMarker?: { lat: number; lng: number } | null;
  showNetworkOverlay?: boolean;
  rotation?: number;
  children?: React.ReactNode;
}

const CurrentLocationMarker = ({ position }: { position: Coordinates }) => {
  const currentLocationIcon = divIcon({
    html: `
      <div class="relative flex items-center justify-center">
        <!-- Glassmorphism outer ring -->
        <div class="absolute w-8 h-8 rounded-full border border-white/30 bg-blue-500/20 backdrop-blur-sm animate-ping"></div>
        <!-- Glassmorphism middle ring -->
        <div class="absolute w-6 h-6 rounded-full border border-white/50 bg-blue-500/40 backdrop-blur-md"></div>
        <!-- Solid center dot with glassmorphism shadow -->
        <div class="w-3 h-3 rounded-full bg-blue-600 shadow-lg border border-white/80"></div>
        <!-- Directional arrow for movement -->
        <div class="absolute top-0 w-0 h-0 border-l-[4px] border-r-[4px] border-b-[6px] border-l-transparent border-r-transparent border-b-white transform -translate-y-1"></div>
      </div>
    `,
    className: 'glassmorphism-location-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  return (
    <>
      {/* Current Position Marker */}
      {position && position.lat && position.lng && (
        <Marker position={[position.lat, position.lng]} icon={currentLocationIcon}>
          <Popup>Your Current Location</Popup>
        </Marker>
      )}
</>
  );
};

const RoutePolyline = ({ route }: { route: NavigationRoute }) => {
  if (!route.geometry || !Array.isArray(route.geometry) || route.geometry.length === 0) return null;

  const positions: [number, number][] = route.geometry.map((coord: any) => {
    if (Array.isArray(coord) && coord.length >= 2) {
      return [coord[1], coord[0]] as [number, number]; // Swap lng,lat to lat,lng for Leaflet
    }
    return [0, 0] as [number, number]; // Fallback for invalid coordinates
  }).filter(pos => pos[0] !== 0 || pos[1] !== 0);

  return (
    <>
      {/* Glassmorphism Subtle Shadow */}
      <Polyline
        positions={positions}
        pathOptions={{
          color: '#1e293b',
          weight: 12,
          opacity: 0.2,
          lineCap: 'round',
          lineJoin: 'round'
        }}
      />
      {/* Glassmorphism Main Route - Semi-transparent with blur effect */}
      <Polyline
        positions={positions}
        pathOptions={{
          color: '#3b82f6', // Blue-500
          weight: 8,
          opacity: 0.4,
          lineCap: 'round',
          lineJoin: 'round',
          className: 'glassmorphism-route-main'
        }}
      />
      {/* Glassmorphism Animated Core - Subtle pulse */}
      <Polyline
        positions={positions}
        pathOptions={{
          color: '#60a5fa', // Blue-400
          weight: 4,
          opacity: 0.8,
          lineCap: 'round',
          lineJoin: 'round',
          dashArray: '20, 10',
          className: 'glassmorphism-route-pulse'
        }}
      />
    </>
  );
};

const MapController = ({
  center,
  zoom,
  mapRef
}: {
  center: Coordinates;
  zoom: number;
  mapRef: React.MutableRefObject<LeafletMap | null>;
}) => {
  const map = useMap();

  useEffect(() => {
    mapRef.current = map;
    map.setView([center.lat, center.lng], zoom);
  }, [center, zoom, map, mapRef]);

  return null;
};

const PopupController = ({ selectedPOI }: { selectedPOI: POI | null }) => {
  const map = useMap();

  useEffect(() => {
    if (!selectedPOI) {
      map.closePopup();
    }
  }, [selectedPOI, map]);

  return null;
};

// Map style configurations - Railway-optimized with fallbacks
const MAP_STYLES = {
  outdoors: 'outdoors-v12',     // Best for camping - shows trails, terrain, elevation
  satellite: 'satellite-v9',    // Aerial view for campground layout
  streets: 'streets-v12',       // Urban navigation
  navigation: 'navigation-preview-day-v4'  // Railway-compatible navigation style
};

// Fallback URLs for when Mapbox fails on mobile/Railway
const FALLBACK_TILES = {
  outdoors: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
  satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  streets: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  navigation: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
};



export const MapContainer: React.FC<MapContainerProps> = ({
  center,
  zoom,
  currentPosition,
  pois,
  selectedPOI,
  route,
  filteredCategories,
  onPOIClick,
  onPOIHover,
  onMapClick,
  onMapLongPress,
  onMapDoubleTap,
  mapStyle,
  destinationMarker,
  showNetworkOverlay = false,
  rotation = 0,
  children
}) => {
  const mapRef = useRef<LeafletMap | null>(null);
  const [gestureIndicator, setGestureIndicator] = useState<{
    isVisible: boolean;
    type: 'pinch-in' | 'pinch-out' | 'rotate' | null;
    intensity: number;
  }>({
    isVisible: false,
    type: null,
    intensity: 0
  });

  const handlePinchZoom = (scale: number) => {
    const intensity = Math.abs(scale - 1);
    setGestureIndicator({
      isVisible: true,
      type: scale > 1 ? 'pinch-out' : 'pinch-in',
      intensity: Math.min(intensity, 1)
    });

    setTimeout(() => {
      setGestureIndicator(prev => ({ ...prev, isVisible: false }));
    }, 100);
  };

  const handleDoubleTap = (latlng: any) => {
    console.log('Double tap zoom at:', latlng);
    // This local handler is now secondary to onMapDoubleTap prop
  };

  const handleLongPress = (latlng: any) => {
    console.log('Long press - add POI at:', latlng);
  };

  // Enhanced debugging for Railway deployment issues
  const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  console.log('🗺️ DEBUG - Environment:', {
    nodeEnv: import.meta.env.NODE_ENV,
    mode: import.meta.env.MODE,
    dev: import.meta.env.DEV,
    prod: import.meta.env.PROD
  });

  // Debug POI rendering
  console.log('🔍 POI RENDERING DEBUG:', {
    totalPOIs: pois.length,
    filteredCategories,
    selectedPOI: selectedPOI?.id,
    firstFewPOIs: pois.slice(0, 3).map(poi => ({
      id: poi.id,
      name: poi.name,
      category: poi.category,
      coordinates: poi.coordinates
    }))
  });
  console.log('🗺️ DEBUG - Mapbox token:', {
    exists: !!mapboxToken,
    length: mapboxToken?.length || 0,
    firstChars: mapboxToken?.substring(0, 8) || 'none',
    isValid: mapboxToken?.startsWith('pk.') || false
  });
  console.log('🗺️ DEBUG - Map style config:', {
    currentStyle: mapStyle,
    mapboxStyle: MAP_STYLES[mapStyle],
    allStyles: MAP_STYLES,
    isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  });

  // Create start marker icon for route beginning
  const startMarker = route?.geometry?.[0] ? {
    lat: route.geometry[0][1], // Swap coordinates for lat/lng
    lng: route.geometry[0][0]
  } : null;

  // Create destination marker from route end if not provided
  const actualDestinationMarker = destinationMarker || (route?.geometry && route.geometry.length > 0 ? {
    lat: route.geometry[route.geometry.length - 1][1], // Last coordinate, swap for lat/lng
    lng: route.geometry[route.geometry.length - 1][0]
  } : null);

  // Define destination marker icon only when needed
  const destinationIcon = actualDestinationMarker ? divIcon({
    className: 'glassmorphism-end-marker',
    html: `
      <div class="relative flex items-center justify-center">
        <!-- Glassmorphism outer ring -->
        <div class="absolute w-10 h-10 rounded-full border border-red-300/40 bg-red-500/20 backdrop-blur-md animate-pulse"></div>
        <!-- Glassmorphism middle ring -->
        <div class="absolute w-8 h-8 rounded-full border border-red-400/60 bg-red-500/30 backdrop-blur-lg"></div>
        <!-- Flag icon for destination -->
        <div class="relative">
          <div class="w-1 h-6 bg-red-600 rounded-full shadow-lg"></div>
          <div class="absolute top-0 left-1 w-4 h-3 bg-red-500 rounded-r shadow-md transform origin-left"></div>
          <div class="absolute top-0 left-1 w-4 h-3 border border-white/60 rounded-r backdrop-blur-sm"></div>
        </div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  }) : null;

  const startIcon = startMarker ? divIcon({
    className: 'glassmorphism-start-marker',
    html: `
      <div class="relative flex items-center justify-center">
        <!-- Glassmorphism outer ring -->
        <div class="absolute w-10 h-10 rounded-full border border-green-300/40 bg-green-500/20 backdrop-blur-md animate-pulse"></div>
        <!-- Glassmorphism middle ring -->
        <div class="absolute w-8 h-8 rounded-full border border-green-400/60 bg-green-500/30 backdrop-blur-lg"></div>
        <!-- Play icon for start -->
        <div class="relative">
          <div class="w-0 h-0 border-t-[6px] border-b-[6px] border-l-[10px] border-t-transparent border-b-transparent border-l-green-600 shadow-lg"></div>
          <div class="absolute -top-[6px] -left-[10px] w-0 h-0 border-t-[6px] border-b-[6px] border-l-[10px] border-t-transparent border-b-transparent border-l-white/60 backdrop-blur-sm"></div>
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  }) : null;

  // Create markers with proper types
  const createIcon = useCallback((iconName: string, category?: string) => {
    // Placeholder for actual icon creation logic if needed
    return divIcon({
      html: `<i class="text-2xl ${iconName}"></i>`,
      className: '',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  }, []);

  // Local state for selectedPOI to manage popup visibility independently
  const [localSelectedPOI, setLocalSelectedPOI] = useState<POI | null>(null);

  useEffect(() => {
    setLocalSelectedPOI(selectedPOI);
  }, [selectedPOI]);

  // Map control functions
  const handleZoomIn = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.zoomIn();
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.zoomOut();
    }
  }, []);

  const handleCenterOnLocation = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.setView([currentPosition.lat, currentPosition.lng], 18);
    }
  }, [currentPosition]);

  // Ensure center is always defined
  const safeCenter = center || currentPosition || { lat: 51.589, lng: 3.716 };


  return (
    <div 
      className="map-container relative"
      style={{
        transform: `rotate(${rotation}deg)`,
        transition: 'transform 0.3s ease-out'
      }}
    >
      <LeafletMapContainer
        center={[safeCenter.lat, safeCenter.lng]}
        zoom={zoom}
        className="w-full h-full z-0"
        zoomControl={false}
        attributionControl={false}
      >
        <MapController
          center={safeCenter}
          zoom={zoom}
          mapRef={mapRef}
        />

        <PopupController selectedPOI={localSelectedPOI} />

        <TileLayer
          key={`mapbox-${mapStyle}-${MAP_STYLES[mapStyle]}-${import.meta.env.MODE}`}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://www.mapbox.com/">Mapbox</a>'
          url={
            (import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || import.meta.env.VITE_MAPBOX_TOKEN)
              ? `https://api.mapbox.com/styles/v1/mapbox/${MAP_STYLES[mapStyle]}/tiles/256/{z}/{x}/{y}@2x?access_token=${import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || import.meta.env.VITE_MAPBOX_TOKEN}`
              : mapStyle === 'satellite'
                ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          }
          maxZoom={19}
          eventHandlers={{
            loading: () => {
              console.log('🗺️ Railway Tiles loading:', mapStyle, 'Style:', MAP_STYLES[mapStyle], 'Environment:', import.meta.env.MODE);
            },
            load: () => {
              console.log('🗺️ Railway Tiles loaded successfully:', mapStyle, 'Visual change should be visible now');
            },
            tileerror: (e) => {
              console.error('🗺️ Railway Tile error for', mapStyle, '- fallback may be needed:', e);
            }
          }}
        />

        {/* SVG Gradient Definition for Route */}
        <svg style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}>
          <defs>
            <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%" gradientUnits="objectBoundingBox">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="30%" stopColor="#1d4ed8" />
              <stop offset="70%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>
          </defs>
        </svg>

        <GestureEnhancedMap
          onLongPress={onMapLongPress}
          onDoubleTap={onMapDoubleTap || handleDoubleTap}
          onSingleTap={onMapClick}
        />

        <CurrentLocationMarker position={currentPosition} />

        {/* Render POI markers - always show when POIs are provided */}
        {pois.map((poi) => (
          <POIMarker
            key={poi.id}
            poi={poi}
            isSelected={localSelectedPOI?.id === poi.id}
            onClick={onPOIClick}
          />
        ))}

        {/* Network overlay - show routing network */}
        <NetworkOverlay visible={showNetworkOverlay} />

        {/* Glassmorphism route line */}
        {route && <RoutePolyline route={route} />}

        {/* Start marker - only render when startMarker exists and icon is created */}
        {startMarker && startIcon && (
          <Marker
            position={[startMarker.lat, startMarker.lng]}
            icon={startIcon}
          >
            <Popup>
              <div className="text-center">
                <strong>Route Start</strong><br />
                {startMarker.lat.toFixed(4)}, {startMarker.lng.toFixed(4)}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Destination marker - only render when destinationMarker exists and icon is created */}
        {actualDestinationMarker && destinationIcon && (
          <Marker
            position={[actualDestinationMarker.lat, actualDestinationMarker.lng]}
            icon={destinationIcon}
          >
            <Popup>
              <div className="text-center">
                <strong>Destination</strong><br />
                {actualDestinationMarker.lat.toFixed(4)}, {actualDestinationMarker.lng.toFixed(4)}
              </div>
            </Popup>
          </Marker>
        )}

          {/* Render any children components */}
          {children}
      </LeafletMapContainer>
    </div>
  );
};