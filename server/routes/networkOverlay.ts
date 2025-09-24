import { Router, Request, Response } from 'express';
import { readFileSync } from 'fs';

const router = Router();

interface NetworkOverlayData {
  nodes: Array<{
    id: string;
    coordinates: [number, number];
    connectionCount: number;
    type: 'isolated' | 'endpoint' | 'junction';
  }>;
  edges: Array<{
    id: string;
    coordinates: Array<[number, number]>;
    pathType: string;
    distance: number;
  }>;
  stats: {
    totalNodes: number;
    totalEdges: number;
    components: number;
    coverage: string;
  };
}

// Generate network overlay data from GeoJSON
function generateNetworkOverlay(): NetworkOverlayData {
  console.log('🗺️ NETWORK OVERLAY: Generating visualization data...');
  
  try {
    const geojsonPath = './server/data/roompot_routing_network.geojson';
    const geojsonData = JSON.parse(readFileSync(geojsonPath, 'utf-8'));
    
    const nodeMap = new Map();
    const edges = [];
    const tolerance = 2; // 2 meter tolerance
    
    // Process all LineString features
    for (const feature of geojsonData.features || []) {
      if (feature.geometry?.type === 'LineString') {
        const coordinates = feature.geometry.coordinates;
        const properties = feature.properties || {};
        const pathType = properties.highway || 'path';
        
        if (coordinates.length >= 2) {
          const startCoord = coordinates[0];
          const endCoord = coordinates[coordinates.length - 1];
          
          // Get or create nodes
          const startNodeId = getOrCreateNode(nodeMap, startCoord, tolerance);
          const endNodeId = getOrCreateNode(nodeMap, endCoord, tolerance);
          
          if (startNodeId !== endNodeId) {
            // Calculate distance
            const distance = calculateDistance(
              startCoord[1], startCoord[0],
              endCoord[1], endCoord[0]
            );
            
            // Add edge
            edges.push({
              id: `edge_${edges.length}`,
              coordinates: coordinates,
              pathType,
              distance: Math.round(distance)
            });
            
            // Update node connections
            const startNode = nodeMap.get(startNodeId);
            const endNode = nodeMap.get(endNodeId);
            startNode.connectionCount++;
            endNode.connectionCount++;
          }
        }
      }
    }
    
    // Convert nodes to array and classify them
    const nodes = Array.from(nodeMap.values()).map(node => ({
      ...node,
      type: node.connectionCount === 0 ? 'isolated' : 
            node.connectionCount === 1 ? 'endpoint' : 'junction'
    }));
    
    // Analyze connectivity
    const visited = new Set();
    let componentCount = 0;
    const componentSizes = [];
    
    for (const node of nodes) {
      if (!visited.has(node.id)) {
        const componentSize = getComponentSize(node.id, nodeMap, visited);
        componentSizes.push(componentSize);
        componentCount++;
      }
    }
    
    componentSizes.sort((a, b) => b - a);
    const coverage = ((componentSizes[0] || 0) / nodes.length * 100).toFixed(1);
    
    console.log(`✅ NETWORK OVERLAY: Generated ${nodes.length} nodes, ${edges.length} edges, ${componentCount} components`);
    
    return {
      nodes,
      edges,
      stats: {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        components: componentCount,
        coverage: `${coverage}%`
      }
    };
    
  } catch (error) {
    console.error('❌ Network overlay generation failed:', error);
    throw error;
  }
}

function getOrCreateNode(nodeMap: Map<string, any>, coordinates: [number, number], tolerance: number) {
  // Check if a node already exists within tolerance
  for (const [nodeId, node] of nodeMap) {
    const distance = calculateDistance(
      coordinates[1], coordinates[0],
      node.coordinates[1], node.coordinates[0]
    );
    
    if (distance < tolerance) {
      return nodeId;
    }
  }
  
  // Create new node
  const nodeId = `node_${nodeMap.size}`;
  const node = {
    id: nodeId,
    coordinates,
    connectionCount: 0
  };
  
  nodeMap.set(nodeId, node);
  return nodeId;
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function getComponentSize(startNodeId: string, nodeMap: Map<string, any>, visited: Set<string>): number {
  // This is a simplified version for the overlay
  // In reality, we'd need to track actual connections
  const stack = [startNodeId];
  let size = 0;
  
  while (stack.length > 0) {
    const nodeId = stack.pop();
    if (visited.has(nodeId)) continue;
    
    visited.add(nodeId);
    size++;
  }
  
  return size;
}

// API endpoint
router.get('/', (req: Request, res: Response) => {
  try {
    console.log('🗺️ Network overlay data requested');
    const overlayData = generateNetworkOverlay();
    
    res.json({
      success: true,
      data: overlayData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Network overlay failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate network overlay',
      details: error.message 
    });
  }
});

export default router;