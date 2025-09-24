import { Coordinates } from '@/types/navigation';
import { calculateDistance as calcDistanceMeters, formatDistance as formatDistanceShared, toRadians } from '../../../shared/utils';

export const calculateDistance = (point1: Coordinates, point2: Coordinates): number => {
  // Convert from meters to kilometers for backward compatibility
  return calcDistanceMeters(point1.lat, point1.lng, point2.lat, point2.lng) / 1000;
};

export const formatDistance = (distanceInMeters: number): string => {
  if (distanceInMeters < 1000) {
    return `${Math.round(distanceInMeters)} Meter`;
  }

  const kilometers = distanceInMeters / 1000;
  if (kilometers < 10) {
    return `${kilometers.toFixed(1)} Kilometer`;
  }

  return `${Math.round(kilometers)} Kilometer`;
};

export { toRadians };

export const getBounds = (coordinates: Coordinates[]): [[number, number], [number, number]] => {
  if (coordinates.length === 0) {
    return [[0, 0], [0, 0]];
  }

  let minLat = coordinates[0].lat;
  let maxLat = coordinates[0].lat;
  let minLng = coordinates[0].lng;
  let maxLng = coordinates[0].lng;

  coordinates.forEach(coord => {
    minLat = Math.min(minLat, coord.lat);
    maxLat = Math.max(maxLat, coord.lat);
    minLng = Math.min(minLng, coord.lng);
    maxLng = Math.max(maxLng, coord.lng);
  });

  return [[minLat, minLng], [maxLat, maxLng]];
};

// Calculate bearing between two coordinates  
export const calculateBearing = (from: Coordinates, to: Coordinates): number => {
  const dLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  let bearing = Math.atan2(y, x);
  bearing = (bearing * 180) / Math.PI;
  bearing = (bearing + 360) % 360; // Normalize to 0-360

  return bearing;
};

export const decodePolyline = (encoded: string): number[][] => {
  const coordinates: number[][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const deltaLat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const deltaLng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
    lng += deltaLng;

    coordinates.push([lng / 1e5, lat / 1e5]);
  }

  return coordinates;
};