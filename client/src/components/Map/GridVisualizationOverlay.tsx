import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { CircleMarker, Rectangle } from 'react-leaflet';

interface GridVisualizationProps {
  isVisible: boolean;
  resolution: number;
  mode: 'debug' | 'overlay';
  onToggle: () => void;
  onModeChange: (mode: 'off' | 'debug' | 'overlay') => void;
}

interface GridData {
  resolution: number;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  walkableNodes: [number, number][];
  blockedNodes: [number, number][];
  gridSize: { width: number; height: number };
  buildingAreas: Array<{
    coordinates: [number, number][];
    type: string;
  }>;
}

export const GridVisualizationOverlay: React.FC<GridVisualizationProps> = ({
  isVisible,
  resolution,
  onToggle
}) => {
  const { data: gridData } = useQuery<{ gridData: GridData }>({
    queryKey: ['grid-visualization', resolution],
    queryFn: async () => {
      const response = await fetch(`/api/route/grid-visualization?resolution=${resolution}`);
      if (!response.ok) throw new Error(`Failed to fetch grid data: ${response.status}`);
      return response.json();
    },
    enabled: isVisible,
    staleTime: 5 * 60 * 1000,
  });

  if (!isVisible || !gridData) return null;

  return (
    <>
      {/* Simple close button */}
      <div className="fixed top-4 right-4 z-[9999]">
        <button
          onClick={onToggle}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow-lg"
        >
          Close Grid
        </button>
      </div>

      {/* Grid bounds */}
      <Rectangle
        bounds={[
          [gridData.gridData.bounds.minY, gridData.gridData.bounds.minX],
          [gridData.gridData.bounds.maxY, gridData.gridData.bounds.maxX]
        ]}
        pathOptions={{
          color: '#8b5cf6',
          weight: 2,
          opacity: 0.6,
          fillOpacity: 0.1
        }}
      />

      {/* Walkable nodes */}
      {gridData.gridData.walkableNodes?.slice(0, 200).map((node, index) => {
        const lng = parseFloat(node[0]);
        const lat = parseFloat(node[1]);

        if (isNaN(lat) || isNaN(lng)) return null;

        const bounds = gridData.gridData.bounds;
        if (lng < bounds.minX || lng > bounds.maxX || lat < bounds.minY || lat > bounds.maxY) {
          return null;
        }

        return (
          <CircleMarker
            key={`walkable-${index}`}
            center={[lat, lng]}
            radius={3}
            pathOptions={{
              color: '#00ff00',
              fillColor: '#00ff00',
              fillOpacity: 0.6,
              weight: 1,
              opacity: 0.8
            }}
          />
        );
      })}

      {/* Blocked nodes */}
      {gridData.gridData.blockedNodes?.slice(0, 100).map((node, index) => {
        const lng = parseFloat(node[0]);
        const lat = parseFloat(node[1]);

        if (isNaN(lat) || isNaN(lng)) return null;

        const bounds = gridData.gridData.bounds;
        if (lng < bounds.minX || lng > bounds.maxX || lat < bounds.minY || lat > bounds.maxY) {
          return null;
        }

        return (
          <CircleMarker
            key={`blocked-${index}`}
            center={[lat, lng]}
            radius={2}
            pathOptions={{
              color: '#ff0000',
              fillColor: '#ff0000',
              fillOpacity: 0.6,
              weight: 1,
              opacity: 0.8
            }}
          />
        );
      })}
    </>
  );
};

export default GridVisualizationOverlay;