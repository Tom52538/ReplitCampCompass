import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Polyline, CircleMarker, Popup } from 'react-leaflet';

interface RoadNetworkVisualizerProps {
  visible: boolean;
  onToggle: () => void;
}

interface NetworkData {
  network: {
    nodes: Array<{
      id: string;
      coordinates: [number, number];
      connectionCount: number;
      nodeType: string;
      pathTypes: string[];
    }>;
    connections: Array<{
      fromId: string;
      toId: string;
      from: [number, number];
      to: [number, number];
      pathType: string;
      distance: number;
      geometry: [number, number][];
      walkingCost: number;
      isRealRoad: boolean;
    }>;
  };
  statistics: {
    totalNodes: number;
    totalConnections: number;
    realRoadConnections: number;
    bridgeConnections: number;
    pathTypes: string[];
  };
}

const PATH_TYPE_COLORS = {
  service: '#3b82f6',      // Blue - service roads
  footway: '#10b981',      // Green - footways
  path: '#8b5cf6',         // Purple - paths
  tertiary: '#f59e0b',     // Orange - tertiary roads
  unclassified: '#6b7280', // Gray - unclassified
  track: '#84cc16',        // Light green - tracks
  cycleway: '#06b6d4',     // Cyan - cycle paths
  bridge: '#ef4444',       // Red - bridge connections
  steps: '#f97316',        // Orange - steps
  pedestrian: '#14b8a6',   // Teal - pedestrian areas
};

export const RoadNetworkVisualizer: React.FC<RoadNetworkVisualizerProps> = ({
  visible,
  onToggle
}) => {
  const [showConnections, setShowConnections] = useState(true);
  const [showNodes, setShowNodes] = useState(true);
  const [filterRealRoadsOnly, setFilterRealRoadsOnly] = useState(false);
  const [selectedPathTypes, setSelectedPathTypes] = useState<Set<string>>(new Set());

  const { data: networkData, isLoading, error } = useQuery<{ networkData: NetworkData }>({
    queryKey: ['road-network-visualization'],
    queryFn: async () => {
      const response = await fetch('/api/route/network/visualization');
      if (!response.ok) throw new Error('Failed to fetch network data');
      return response.json();
    },
    enabled: visible,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (networkData?.networkData?.statistics?.pathTypes && selectedPathTypes.size === 0) {
      setSelectedPathTypes(new Set(networkData.networkData.statistics.pathTypes));
    }
  }, [networkData]);

  if (!visible) {
    return null;
  }

  // Return null if data is still loading or has errors
  if (isLoading || error || !networkData?.networkData?.network) {
    return null;
  }

  const togglePathType = (pathType: string) => {
    const newSet = new Set(selectedPathTypes);
    if (newSet.has(pathType)) {
      newSet.delete(pathType);
    } else {
      newSet.add(pathType);
    }
    setSelectedPathTypes(newSet);
  };

  const filteredConnections = networkData?.networkData?.network?.connections?.filter((conn: any) => {
    if (filterRealRoadsOnly && !conn.isRealRoad) return false;
    return selectedPathTypes.has(conn.pathType);
  }) || [];

  const filteredNodes = networkData?.networkData?.network?.nodes?.filter((node: any) => {
    if (!showNodes) return false;
    return node.pathTypes.some((type: string) => selectedPathTypes.has(type));
  }) || [];

  return (
    <>
      {/* Control Panel */}
      <div className="fixed top-4 left-4 bg-black/90 text-white p-4 rounded-lg text-sm z-[10000] max-w-sm"
           style={{ zIndex: 10000 }}>
        <div className="flex justify-between items-center mb-3">
          <div className="font-bold text-blue-400">🛣️ Road Network</div>
          <button
            onClick={onToggle}
            className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs"
          >
            ✕
          </button>
        </div>

        {isLoading && <div className="text-yellow-400">Loading network...</div>}
        {error && <div className="text-red-400">Error loading network</div>}

        {networkData?.networkData?.statistics && (
          <>
            <div className="mb-3 text-xs">
              <div>Total Nodes: {networkData.networkData.statistics.totalNodes || 0}</div>
              <div>Total Connections: {networkData.networkData.statistics.totalConnections || 0}</div>
              <div>Real Roads: {networkData.networkData.statistics.realRoadConnections || 0}</div>
              <div>Bridge Connections: {networkData.networkData.statistics.bridgeConnections || 0}</div>
              <div className="mt-2">
                Showing: {filteredConnections.length} connections, {filteredNodes.length} nodes
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              <button
                onClick={() => setShowConnections(!showConnections)}
                className={`px-2 py-1 rounded text-xs ${
                  showConnections ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-700'
                }`}
              >
                {showConnections ? '🔗' : '❌'} Roads
              </button>
              <button
                onClick={() => setShowNodes(!showNodes)}
                className={`px-2 py-1 rounded text-xs ${
                  showNodes ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'
                }`}
              >
                {showNodes ? '⭕' : '❌'} Nodes
              </button>
              <button
                onClick={() => setFilterRealRoadsOnly(!filterRealRoadsOnly)}
                className={`px-2 py-1 rounded text-xs ${
                  filterRealRoadsOnly ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-gray-600 hover:bg-gray-700'
                }`}
              >
                {filterRealRoadsOnly ? '🛣️' : '🔗'} Real Only
              </button>
            </div>

            <div className="border-t border-gray-600 pt-2">
              <div className="font-semibold mb-2">Path Types:</div>
              <div className="grid grid-cols-2 gap-1 text-xs">
                {(networkData.networkData.statistics.pathTypes || []).map(pathType => (
                  <button
                    key={pathType}
                    onClick={() => togglePathType(pathType)}
                    className={`px-2 py-1 rounded text-left ${
                      selectedPathTypes.has(pathType)
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-gray-600 hover:bg-gray-700'
                    }`}
                    style={{
                      borderLeft: selectedPathTypes.has(pathType)
                        ? `3px solid ${PATH_TYPE_COLORS[pathType] || '#666'}`
                        : 'none'
                    }}
                  >
                    {pathType}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Network Visualization */}
      {networkData && (
        <>
          {/* Road Connections */}
          {showConnections && filteredConnections.map((connection, index) => {
            const color = PATH_TYPE_COLORS[connection.pathType] || '#6b7280';
            const weight = connection.isRealRoad ? 2 : 1;
            const opacity = connection.isRealRoad ? 0.8 : 0.4;
            const dashArray = connection.isRealRoad ? undefined : '5, 5';

            return (
              <Polyline
                key={`connection-${index}`}
                positions={connection.geometry.map(coord => [coord[1], coord[0]])}
                pathOptions={{
                  color,
                  weight,
                  opacity,
                  dashArray
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <div className="font-bold text-blue-600">
                      {connection.pathType.toUpperCase()} {connection.isRealRoad ? '(Real Road)' : '(Bridge)'}
                    </div>
                    <div>Distance: {connection.distance.toFixed(1)}m</div>
                    <div>Walking Cost: {connection.walkingCost.toFixed(1)}</div>
                    <div>From: {connection.fromId}</div>
                    <div>To: {connection.toId}</div>
                  </div>
                </Popup>
              </Polyline>
            );
          })}

          {/* Network Nodes */}
          {showNodes && (networkData.networkData.network.nodes || []).map((node: any, index) => {
            let color = '#10b981'; // Default green
            let radius = 3;

            if (node.connectionCount === 0) {
              color = '#f59e0b'; // Yellow for isolated
              radius = 5;
            } else if (node.connectionCount < 2) {
              color = '#f97316'; // Orange for poorly connected
              radius = 4;
            } else if (node.connectionCount > 5) {
              color = '#3b82f6'; // Blue for hubs
              radius = 4;
            }

            return (
              <CircleMarker
                key={`node-${index}`}
                center={[node.coordinates[1], node.coordinates[0]]}
                radius={radius}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.7,
                  weight: 1
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <div className="font-bold text-green-600">Network Node</div>
                    <div>ID: {node.id}</div>
                    <div>Connections: {node.connectionCount}</div>
                    <div>Type: {node.nodeType}</div>
                    <div>Path Types: {node.pathTypes.join(', ')}</div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </>
      )}
    </>
  );
};

export default RoadNetworkVisualizer;