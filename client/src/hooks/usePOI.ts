import { useQuery } from '@tanstack/react-query';
import { POI, TestSite } from '@/types/navigation';

export const usePOI = (site: TestSite = 'kamperland') => {
  return useQuery({
    queryKey: ['/api/pois', site],
    enabled: !!site, // Ensure query is enabled when site is provided
    refetchOnMount: 'always', // Force refetch on mount
    queryFn: async () => {
      console.log(`🔍 POI FETCH DEBUG: Fetching POIs for site: ${site}`);
      const response = await fetch(`/api/pois?site=${site}`, { cache: 'no-store' }); // Force fresh request
      if (!response.ok) {
        console.error(`🔍 POI FETCH ERROR: Response not ok:`, response.status, response.statusText);
        throw new Error('Failed to fetch POI data');
      }
      const data = await response.json();
      console.log(`🔍 POI FETCH DEBUG: Received ${data.length} POIs`);

      if (data.length > 0) {
        const categories = [...new Set(data.map((poi: POI) => poi.category))];
        console.log(`🔍 POI FETCH DEBUG: Available categories:`, categories);
        console.log(`🔍 POI FETCH DEBUG: Sample POIs:`, data.slice(0, 3));
      }

      // Optimize memory usage by limiting POI properties
      const optimizedPOIs = data.map((poi: POI) => ({
        id: poi.id,
        name: poi.name,
        category: poi.category,
        subCategory: poi.subCategory,
        coordinates: poi.coordinates,
        // Only include essential data to reduce memory footprint
        ...(poi.amenities && poi.amenities.length > 0 && { amenities: poi.amenities.slice(0, 3) }),
        ...(poi.hours && { hours: poi.hours }),
        ...(poi.description && { description: poi.description.substring(0, 100) })
      }));

      return optimizedPOIs as POI[];
    },
    staleTime: Infinity, // POI data doesn't change frequently
  });
};

export const useSearchPOI = (query: string, site: TestSite = 'kamperland', category?: string) => {
  return useQuery({
    queryKey: ['/api/pois/search', query, site, category],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (query) params.append('q', query);
      params.append('site', site);
      if (category) params.append('category', category);

      const response = await fetch(`/api/pois/search?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to search POIs');
      }
      const data = await response.json();
      return data as POI[];
    },
    enabled: query.length >= 2, // Require at least 2 characters
    staleTime: 60000, // 1 minute
  });
};