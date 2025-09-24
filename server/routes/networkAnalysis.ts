
import { Router, Request, Response } from 'express';
import { readFileSync } from 'fs';
import * as turf from '@turf/turf';

const router = Router();

interface NetworkAnalysisResult {
  nodes: Array<{
    id: string;
    coordinates: [number, number];
    connectionCount: number;
    componentId: number;
    isIsolated: boolean;
  }>;
  connections: Array<{
    from: [number, number];
    to: [number, number];
    pathType: string;
    distance: number;
  }>;
  disconnectedComponents: number;
  isolatedNodes: any[];
  statistics: {
    totalNodes: number;
    totalConnections: number;
    averageConnectionsPerNode: number;
    largestComponentSize: number;
    smallestComponentSize: number;
  };
}

// Comprehensive GeoJSON Analysis Function
function analyzeGeoJSONConnectivity() {
  console.log('🔍 DETAILED GEOJSON CONNECTIVITY ANALYSIS');
  console.log('=' .repeat(50));

  try {
    // Load the actual GeoJSON file
    const geojsonPath = './server/data/roompot_routing_network.geojson';
    const geojsonData = JSON.parse(readFileSync(geojsonPath, 'utf-8'));
    
    console.log(`📊 Raw GeoJSON Data:`);
    console.log(`   - Total features: ${geojsonData.features?.length || 0}`);
    console.log(`   - Feature types:`, [...new Set(geojsonData.features?.map(f => f.geometry?.type) || [])]);

    // Extract all unique coordinates (nodes) from LineString features
    const nodeMap = new Map();
    const connections = new Map();
    let lineStringCount = 0;
    let totalCoordinates = 0;

    console.log('\n📍 Processing LineString features...');
    
    for (const feature of geojsonData.features || []) {
      if (feature.geometry?.type === 'LineString') {
        lineStringCount++;
        const coordinates = feature.geometry.coordinates;
        totalCoordinates += coordinates.length;

        if (coordinates.length >= 2) {
          const startCoord = coordinates[0];
          const endCoord = coordinates[coordinates.length - 1];
          
          // Create unique node IDs based on rounded coordinates (2m tolerance)
          const startNodeId = `${startCoord[0].toFixed(6)}_${startCoord[1].toFixed(6)}`;
          const endNodeId = `${endCoord[0].toFixed(6)}_${endCoord[1].toFixed(6)}`;

          // Add nodes
          if (!nodeMap.has(startNodeId)) {
            nodeMap.set(startNodeId, { id: startNodeId, coords: startCoord, connections: new Set() });
          }
          if (!nodeMap.has(endNodeId)) {
            nodeMap.set(endNodeId, { id: endNodeId, coords: endCoord, connections: new Set() });
          }

          // Add bidirectional connections
          if (startNodeId !== endNodeId) {
            nodeMap.get(startNodeId).connections.add(endNodeId);
            nodeMap.get(endNodeId).connections.add(startNodeId);
          }
        }
      }
    }

    console.log(`\n📈 Network Statistics:`);
    console.log(`   - LineString features processed: ${lineStringCount}`);
    console.log(`   - Total coordinate points: ${totalCoordinates}`);
    console.log(`   - Unique nodes created: ${nodeMap.size}`);

    // Analyze connectivity using Depth-First Search
    const visited = new Set();
    const components = [];

    console.log('\n🔍 Analyzing connected components...');

    for (const [nodeId, node] of nodeMap) {
      if (!visited.has(nodeId)) {
        const component = [];
        const stack = [nodeId];

        // DFS to find all nodes in this component
        while (stack.length > 0) {
          const currentId = stack.pop();
          if (visited.has(currentId)) continue;

          visited.add(currentId);
          component.push(currentId);

          const currentNode = nodeMap.get(currentId);
          if (currentNode) {
            for (const neighborId of currentNode.connections) {
              if (!visited.has(neighborId)) {
                stack.push(neighborId);
              }
            }
          }
        }

        if (component.length > 0) {
          components.push(component);
        }
      }
    }

    // Sort components by size (largest first)
    components.sort((a, b) => b.length - a.length);

    console.log(`\n🎯 CONNECTIVITY ANALYSIS RESULTS:`);
    console.log(`   - Total connected components: ${components.length}`);
    console.log(`   - Largest component size: ${components[0]?.length || 0} nodes`);
    console.log(`   - Network coverage: ${((components[0]?.length || 0) / nodeMap.size * 100).toFixed(1)}%`);

    // Show component size distribution
    console.log(`\n📊 Component size distribution:`);
    const componentSizes = components.map(c => c.length);
    console.log(`   - Components with >100 nodes: ${componentSizes.filter(s => s > 100).length}`);
    console.log(`   - Components with 10-100 nodes: ${componentSizes.filter(s => s >= 10 && s <= 100).length}`);
    console.log(`   - Components with 2-9 nodes: ${componentSizes.filter(s => s >= 2 && s <= 9).length}`);
    console.log(`   - Isolated nodes (1 node): ${componentSizes.filter(s => s === 1).length}`);

    // Show top 10 largest components
    console.log(`\n🏆 Top 10 largest components:`);
    for (let i = 0; i < Math.min(10, components.length); i++) {
      console.log(`   ${i + 1}. Component ${i + 1}: ${components[i].length} nodes`);
    }

    // Detailed analysis of connections
    console.log(`\n🔗 Connection Analysis:`);
    let totalConnections = 0;
    let isolatedNodes = 0;
    
    for (const [nodeId, node] of nodeMap) {
      totalConnections += node.connections.size;
      if (node.connections.size === 0) {
        isolatedNodes++;
      }
    }

    console.log(`   - Total connections (bidirectional): ${totalConnections}`);
    console.log(`   - Unique edges: ${totalConnections / 2}`);
    console.log(`   - Average connections per node: ${(totalConnections / nodeMap.size).toFixed(2)}`);
    console.log(`   - Isolated nodes: ${isolatedNodes}`);

    // Sample some coordinates to verify data quality
    console.log(`\n🌍 Sample coordinates (first 5 nodes):`);
    let count = 0;
    for (const [nodeId, node] of nodeMap) {
      if (count >= 5) break;
      console.log(`   - ${nodeId}: [${node.coords[0].toFixed(6)}, ${node.coords[1].toFixed(6)}] (${node.connections.size} connections)`);
      count++;
    }

    // Final verdict
    console.log(`\n🎯 FINAL ANALYSIS:`);
    if (components.length <= 2) {
      console.log(`✅ NETWORK IS WELL CONNECTED (${components.length} components)`);
    } else if (components.length <= 10) {
      console.log(`⚠️ NETWORK HAS MINOR FRAGMENTATION (${components.length} components)`);
    } else {
      console.log(`❌ NETWORK IS HIGHLY FRAGMENTED (${components.length} components)`);
    }

    console.log(`\n📋 CONCLUSION:`);
    console.log(`The GeoJSON contains ${geojsonData.features?.length || 0} LineString features`);
    console.log(`which create ${nodeMap.size} unique nodes with ${components.length} connected components.`);
    console.log(`The largest component has ${components[0]?.length || 0} nodes (${((components[0]?.length || 0) / nodeMap.size * 100).toFixed(1)}% coverage).`);

    // Return structured results
    return {
      success: true,
      analysis: {
        totalFeatures: geojsonData.features?.length || 0,
        lineStringCount,
        totalCoordinates,
        uniqueNodes: nodeMap.size,
        components: components.length,
        largestComponent: components[0]?.length || 0,
        coverage: ((components[0]?.length || 0) / nodeMap.size * 100).toFixed(1),
        totalConnections,
        uniqueEdges: totalConnections / 2,
        isolatedNodes,
        componentSizes,
        verdict: components.length <= 2 ? 'WELL_CONNECTED' : 
                components.length <= 10 ? 'MINOR_FRAGMENTATION' : 'HIGHLY_FRAGMENTED'
      }
    };

  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    console.error('Stack trace:', error.stack);
    return {
      success: false,
      error: error.message
    };
  }
}

// Routing logic verification function
function verifyRoutingLogic() {
  console.log('🔍 VERIFYING ROUTING NETWORK LOADING LOGIC');
  console.log('=' .repeat(50));

  try {
    const geojsonPath = './server/data/roompot_routing_network.geojson';
    const geojsonData = JSON.parse(readFileSync(geojsonPath, 'utf-8'));
    
    console.log(`📊 GeoJSON File Analysis:`);
    console.log(`   - File size: ${JSON.stringify(geojsonData).length} bytes`);
    console.log(`   - Features: ${geojsonData.features?.length || 0}`);
    console.log(`   - Generator: ${geojsonData.generator || 'unknown'}`);
    console.log(`   - Timestamp: ${geojsonData.timestamp || 'unknown'}`);

    // Simulate the exact logic from roompotAStarRouter.ts
    const nodes = new Map();
    const tolerance = 2; // 2 meter tolerance as in the code
    let edgeCount = 0;

    console.log(`\n🔧 Simulating buildNetworkFromGeoJSON() logic:`);
    
    for (const feature of geojsonData.features || []) {
      if (feature.geometry?.type === 'LineString') {
        const coordinates = feature.geometry.coordinates;
        const properties = feature.properties || {};
        const highway = properties.highway || 'path';

        if (coordinates.length >= 2) {
          const startCoord = coordinates[0];
          const endCoord = coordinates[coordinates.length - 1];

          // Simulate getOrCreateNode function
          const startNodeId = getOrCreateNodeSimulated(nodes, startCoord, tolerance);
          const endNodeId = getOrCreateNodeSimulated(nodes, endCoord, tolerance);

          if (startNodeId !== endNodeId) {
            const distance = turf.distance(
              turf.point(startCoord),
              turf.point(endCoord),
              { units: 'meters' }
            );

            // Add connections (simulate the router logic)
            const startNode = nodes.get(startNodeId);
            const endNode = nodes.get(endNodeId);

            if (!startNode.connections.find(c => c.to === endNodeId)) {
              startNode.connections.push({
                to: endNodeId,
                weight: distance,
                geometry: coordinates,
                pathType: highway
              });
              edgeCount++;
            }

            if (!endNode.connections.find(c => c.to === startNodeId)) {
              endNode.connections.push({
                to: startNodeId,
                weight: distance,
                geometry: [...coordinates].reverse(),
                pathType: highway
              });
              edgeCount++;
            }
          }
        }
      }
    }

    console.log(`   - Nodes created: ${nodes.size}`);
    console.log(`   - Edges created: ${edgeCount}`);
    console.log(`   - Unique edges: ${edgeCount / 2}`);

    // Now count connected components using the exact same logic
    console.log(`\n🔍 Counting connected components:`);
    
    const visited = new Set();
    let componentCount = 0;
    const componentSizes = [];

    for (const [nodeId] of nodes) {
      if (!visited.has(nodeId)) {
        const componentSize = getComponentSizeSimulated(nodeId, nodes, visited);
        componentSizes.push(componentSize);
        componentCount++;
      }
    }

    componentSizes.sort((a, b) => b - a);

    console.log(`   - Connected components: ${componentCount}`);
    console.log(`   - Largest component: ${componentSizes[0] || 0} nodes`);
    console.log(`   - Coverage: ${((componentSizes[0] || 0) / nodes.size * 100).toFixed(1)}%`);

    console.log(`\n📊 Component sizes (top 20):`);
    for (let i = 0; i < Math.min(20, componentSizes.length); i++) {
      console.log(`   ${i + 1}. ${componentSizes[i]} nodes`);
    }

    console.log(`\n🎯 VERIFICATION RESULT:`);
    console.log(`The routing logic creates ${nodes.size} nodes with ${componentCount} connected components.`);
    
    if (componentCount > 300) {
      console.log(`❌ CONFIRMED: Network is highly fragmented (${componentCount} components)`);
    } else if (componentCount > 10) {
      console.log(`⚠️ Network has moderate fragmentation (${componentCount} components)`);
    } else {
      console.log(`✅ Network is well connected (${componentCount} components)`);
    }

    return {
      success: true,
      verification: {
        nodes: nodes.size,
        edges: edgeCount,
        uniqueEdges: edgeCount / 2,
        components: componentCount,
        largestComponent: componentSizes[0] || 0,
        coverage: ((componentSizes[0] || 0) / nodes.size * 100).toFixed(1),
        componentSizes: componentSizes.slice(0, 20)
      }
    };

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

function getOrCreateNodeSimulated(nodes, coordinates, tolerance) {
  // Check if a node already exists within tolerance
  for (const [nodeId, node] of nodes) {
    const distance = turf.distance(
      turf.point(coordinates),
      turf.point(node.coordinates),
      { units: 'meters' }
    );

    if (distance < tolerance) {
      return nodeId;
    }
  }

  // Create new node
  const nodeId = `node_${nodes.size}`;
  const node = {
    id: nodeId,
    coordinates,
    connections: []
  };

  nodes.set(nodeId, node);
  return nodeId;
}

function getComponentSizeSimulated(startNodeId, nodes, visited) {
  const stack = [startNodeId];
  let size = 0;

  while (stack.length > 0) {
    const nodeId = stack.pop();
    if (visited.has(nodeId)) continue;

    visited.add(nodeId);
    size++;

    const node = nodes.get(nodeId);
    if (node) {
      for (const connection of node.connections) {
        if (!visited.has(connection.to)) {
          stack.push(connection.to);
        }
      }
    }
  }

  return size;
}

// API Endpoints
router.get('/geojson-analysis', (req: Request, res: Response) => {
  try {
    console.log('🔍 GeoJSON connectivity analysis requested');
    const result = analyzeGeoJSONConnectivity();
    res.json(result);
  } catch (error) {
    console.error('❌ GeoJSON analysis failed:', error);
    res.status(500).json({ error: 'Analysis failed', details: error.message });
  }
});

router.get('/routing-verification', (req: Request, res: Response) => {
  try {
    console.log('🔍 Routing logic verification requested');
    const result = verifyRoutingLogic();
    res.json(result);
  } catch (error) {
    console.error('❌ Routing verification failed:', error);
    res.status(500).json({ error: 'Verification failed', details: error.message });
  }
});

router.get('/connectivity', (req: Request, res: Response) => {
  try {
    console.log('🔍 Network connectivity analysis requested');
    
    // Run both analyses
    const geojsonAnalysis = analyzeGeoJSONConnectivity();
    const routingVerification = verifyRoutingLogic();
    
    res.json({
      geojsonAnalysis,
      routingVerification,
      summary: {
        consistent: geojsonAnalysis.success && routingVerification.success &&
                   geojsonAnalysis.analysis?.components === routingVerification.verification?.components,
        recommendation: geojsonAnalysis.analysis?.components > 10 ? 
          'CRITICAL: Network healing required' : 
          'Network appears functional'
      }
    });
    
  } catch (error) {
    console.error('❌ Network connectivity analysis failed:', error);
    res.status(500).json({ error: 'Analysis failed', details: error.message });
  }
});

export default router;
