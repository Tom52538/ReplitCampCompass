import React, { useEffect, useState } from 'react';
import { Polyline, CircleMarker, Popup } from 'react-leaflet';

interface NetworkNode {
  id: string;
  coordinates: [number, number];
  connectionCount: number;
  type: 'isolated' | 'endpoint' | 'junction';
}

interface NetworkEdge {
  id: string;
  coordinates: Array<[number, number]>;
  pathType: string;
  distance: number;
}

interface NetworkOverlayData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  stats: {
    totalNodes: number;
    totalEdges: number;
    components: number;
    coverage: string;
  };
}

interface NetworkOverlayProps {
  visible: boolean;
}

export const NetworkOverlay: React.FC<NetworkOverlayProps> = ({ visible }) => {
  const [networkData, setNetworkData] = useState<NetworkOverlayData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && !networkData) {
      loadNetworkData();
    }
  }, [visible, networkData]);

  const loadNetworkData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🗺️ NETWORK OVERLAY: Loading network data...');
      const response = await fetch('/api/network-overlay');
      
      if (!response.ok) {
        throw new Error(`Network overlay request failed: ${response.status}`);
      }
      
      const data: NetworkOverlayData = await response.json();
      console.log('✅ NETWORK OVERLAY: Raw API response:', data);
      
      if (!data.nodes || !data.edges) {
        throw new Error('Invalid network data structure');
      }
      
      setNetworkData(data);
      console.log('✅ NETWORK OVERLAY: Loaded', {
        nodes: data.nodes.length,
        edges: data.edges.length,
        components: data.stats.components
      });
      
    } catch (err) {
      console.error('❌ NETWORK OVERLAY: Load failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) {
    return null;
  }

  if (loading) {
    return null; // Loading silently
  }

  if (error || !networkData) {
    return null; // Failed silently
  }

  return (
    <>
      {/* Render network edges (roads/paths) */}
      {networkData.edges.map(edge => (
        <Polyline
          key={edge.id}
          positions={edge.coordinates.map(coord => [coord[1], coord[0]])} // Convert [lng,lat] to [lat,lng] for Leaflet
          pathOptions={{
            color: getEdgeColor(edge.pathType),
            weight: 2,
            opacity: 0.6,
            lineCap: 'round',
            lineJoin: 'round'
          }}
        >
          <Popup>
            <div className="text-xs">
              <strong>Network Path</strong><br />
              Type: {edge.pathType}<br />
              Distance: {edge.distance}m<br />
              Coordinates: {edge.coordinates.length} points
            </div>
          </Popup>
        </Polyline>
      ))}

      {/* Render network nodes */}
      {networkData.nodes.map(node => (
        <CircleMarker
          key={node.id}
          center={[node.coordinates[1], node.coordinates[0]]} // Convert [lng,lat] to [lat,lng] for Leaflet
          radius={getNodeRadius(node.type)}
          pathOptions={{
            color: getNodeColor(node.type),
            fillColor: getNodeColor(node.type),
            fillOpacity: 0.7,
            weight: 1,
            opacity: 0.9
          }}
        >
          <Popup>
            <div className="text-xs">
              <strong>Network Node</strong><br />
              Type: {node.type}<br />
              Connections: {node.connectionCount}<br />
              Coordinates: {node.coordinates[1].toFixed(6)}, {node.coordinates[0].toFixed(6)}
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </>
  );
};

function getEdgeColor(pathType: string): string {
  switch (pathType) {
    case 'primary': return '#ff6b6b'; // Red for main roads
    case 'secondary': return '#4ecdc4'; // Teal for secondary roads
    case 'service': return '#45b7d1'; // Blue for service roads
    case 'footway': return '#96ceb4'; // Green for footways
    case 'cycleway': return '#feca57'; // Yellow for cycle paths
    case 'path': return '#a29bfe'; // Purple for paths
    default: return '#74b9ff'; // Light blue for others
  }
}

function getNodeColor(nodeType: string): string {
  switch (nodeType) {
    case 'isolated': return '#e74c3c'; // Red for isolated nodes
    case 'endpoint': return '#f39c12'; // Orange for endpoints
    case 'junction': return '#27ae60'; // Green for junctions
    default: return '#3498db'; // Blue for others
  }
}

function getNodeRadius(nodeType: string): number {
  switch (nodeType) {
    case 'isolated': return 4; // Larger for visibility
    case 'endpoint': return 3;
    case 'junction': return 5; // Largest for important junctions
    default: return 2;
  }
}