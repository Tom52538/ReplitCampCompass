import React from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { Coordinates } from '@/types/navigation';

interface DebugOverlayProps {
  rawGpsPosition?: Coordinates | null;
  snappedGpsPosition?: Coordinates | null;
  rerouteThreshold?: number; // in meters
  networkGeoJson?: any;
}

export const DebugOverlay: React.FC<DebugOverlayProps> = ({
  rawGpsPosition,
  snappedGpsPosition,
  rerouteThreshold = 5,
  networkGeoJson,
}) => {
  const map = useMap();

  React.useEffect(() => {
    const layers = new L.LayerGroup();

    // Raw GPS Position (Red Dot)
    if (rawGpsPosition) {
      L.circleMarker([rawGpsPosition.lat, rawGpsPosition.lng], {
        radius: 6,
        color: 'red',
        fillColor: '#f03',
        fillOpacity: 0.8,
      }).addTo(layers);
    }

    // Routing Network GeoJSON
    if (networkGeoJson) {
      L.geoJSON(networkGeoJson, {
        style: {
          color: '#888',
          weight: 2,
          opacity: 0.6,
        },
      }).addTo(layers);
    }

    // Snapped GPS Position (Green Dot)
    if (snappedGpsPosition) {
      L.circleMarker([snappedGpsPosition.lat, snappedGpsPosition.lng], {
        radius: 6,
        color: 'green',
        fillColor: '#28a745',
        fillOpacity: 0.8,
      }).addTo(layers);
    }

    // Re-route Threshold Circle (Blue Circle)
    if (snappedGpsPosition) {
        L.circle([snappedGpsPosition.lat, snappedGpsPosition.lng], {
        radius: rerouteThreshold,
        color: '#007bff',
        fillOpacity: 0.1,
        weight: 2,
        dashArray: '5, 5',
      }).addTo(layers);
    }

    layers.addTo(map);

    return () => {
      map.removeLayer(layers);
    };
  }, [map, rawGpsPosition, snappedGpsPosition, rerouteThreshold, networkGeoJson]);

  return null; // This component only adds layers to the map, it doesn't render any DOM elements itself.
};
