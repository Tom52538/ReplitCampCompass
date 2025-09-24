import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Haversine formula to calculate distance between two coordinates
export function haversineDistance(coord1: { lat: number; lng: number }, coord2: { lat: number; lng: number }): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = coord1.lat * Math.PI / 180;
  const φ2 = coord2.lat * Math.PI / 180;
  const Δφ = (coord2.lat - coord1.lat) * Math.PI / 180;
  const Δλ = (coord2.lng - coord1.lng) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // distance in meters
}

// Normalize image local_path to remove all possible prefixes that could cause double path issues
export function normalizeImageLocalPath(path: string): string {
  if (!path) return '';

  return path
    // Remove any leading /api/images/ or api/images/
    .replace(/^\/api\/images\//, '')
    .replace(/^api\/images\//, '')
    // Remove server/data/crawler/images/ prefix
    .replace(/^server\/data\/crawler\/images\//, '')
    // Remove leading images/ or images\ prefix
    .replace(/^images[\\\/]/, '')
    // Remove any leading slashes
    .replace(/^\/+/, '')
    // Convert backslashes to forward slashes
    .replace(/\\/g, '/');
}

// Build a properly formatted image URL - STABLE VERSION
export function buildImageUrl(localPath: string): string {
  if (!localPath) return '';

  const cleanPath = normalizeImageLocalPath(localPath);
  
  // Debug: warn if we detect potential double-images path
  if (cleanPath.includes('images/')) {
    console.warn(`🚨 Potential double-images path detected: ${cleanPath} (from: ${localPath})`);
  }
  
  return `/api/images/${cleanPath}`;
}