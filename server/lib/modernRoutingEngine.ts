
import fs from 'fs';

import Graph from 'graphology';
import { bidirectional, dijkstra } from 'graphology-shortest-path';
import { calculateDistance, generateNodeId } from '../../shared/utils';

interface Coordinate {
  lat: number;
  lng: number;
}

interface RouteNode {
  id: string;
  lat: number;
  lng: number;
  connections: number;
}

class ModernRoutingEngine {
  private graph: any;
  private nodes: Map<string, RouteNode>;
  
  constructor() {
    this.graph = new Graph({ multi: false, type: 'undirected' });
    this.nodes = new Map();
  }
  
  // Normalize coordinates to consistent precision
  private normalizeCoordinate(coord: number): number {
    return Number(coord.toFixed(7));
  }
  
  // Generate consistent node ID
  private generateNodeId(lat: number, lng: number): string {
    const normLat = this.normalizeCoordinate(lat);
    const normLng = this.normalizeCoordinate(lng);
    return generateNodeId(normLat, normLng);
  }
  
  // Calculate distance between two points in meters
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    return calculateDistance(lat1, lng1, lat2, lng2);
  }
  
  // Load GeoJSON network data with road type filtering
  loadGeoJSON(geojsonData: any, vehicleType: string = 'walking'): void {
    console.log('🔧 MODERN ROUTING: Loading GeoJSON data for vehicle type:', vehicleType);
    
    // Clear existing data
    this.graph.clear();
    this.nodes.clear();
    
    let edgeCount = 0;
    let filteredEdgeCount = 0;
    
    // Process LineString features
    for (const feature of geojsonData.features) {
      if (feature.geometry.type === 'LineString') {
        const coordinates = feature.geometry.coordinates;
        const properties = feature.properties || {};
        
        // Determine road type from properties
        const roadType = this.determineRoadType(properties);
        
        // Extract road name for turn-by-turn instructions - prioritize German names
        const roadName = properties['name:de'] || properties.name || properties['addr:street:de'] || properties['addr:street'] || null;
        
        // Filter based on vehicle type
        if (!this.isAccessibleByVehicle(roadType, vehicleType)) {
          filteredEdgeCount++;
          continue;
        }
        
        console.log(`🛣️ Including ${roadType} path for ${vehicleType} (${coordinates.length} coords)`);
        
        // Add nodes and edges
        for (let i = 0; i < coordinates.length; i++) {
          const [lng, lat] = coordinates[i];
          const nodeId = this.generateNodeId(lat, lng);
          
          // Add node if not exists
          if (!this.graph.hasNode(nodeId)) {
            this.graph.addNode(nodeId, { lat, lng, roadType });
            this.nodes.set(nodeId, { id: nodeId, lat, lng, connections: 0 });
          }
          
          // Add edge to previous node
          if (i > 0) {
            const [prevLng, prevLat] = coordinates[i - 1];
            const prevNodeId = this.generateNodeId(prevLat, prevLng);
            const distance = this.calculateDistance(prevLat, prevLng, lat, lng);
            
            if (!this.graph.hasEdge(prevNodeId, nodeId)) {
              // Apply weight multiplier to prioritize proper roads over footways
              let weightMultiplier = 1.0;
              if (roadType === 'road') {
                weightMultiplier = 0.8; // Prefer roads - make them "shorter" in routing
              } else if (roadType === 'footway') {
                weightMultiplier = 1.5; // Discourage footways - make them "longer"
              }
              
              this.graph.addEdge(prevNodeId, nodeId, { 
                weight: distance * weightMultiplier, 
                roadType,
                roadName,
                originalDistance: distance,
                vehicleAccessible: vehicleType === 'driving' ? roadType === 'road' : true
              });
              edgeCount++;
            }
          }
        }
      }
    }
    
    // Update connection counts
    this.nodes.forEach((node, nodeId) => {
      node.connections = this.graph.degree(nodeId);
    });
    
    console.log(`✅ MODERN ROUTING: Loaded ${this.graph.order} nodes, ${edgeCount} edges`);
  }
  
  // Find best node near coordinates using distance + connectivity scoring
  findBestNode(lat: number, lng: number, maxDistance: number = 100): RouteNode | null {
    let bestNode: RouteNode | null = null;
    let bestScore = -1;
    
    for (const node of Array.from(this.nodes.values())) {
      const distance = this.calculateDistance(lat, lng, node.lat, node.lng);
      
      if (distance <= maxDistance) {
        // Score: prioritize proximity over connectivity for better route optimization
        const distanceScore = Math.max(0, 1 - (distance / maxDistance));
        const connectivityScore = Math.min(1, node.connections / 10);
        const totalScore = (distanceScore * 0.8) + (connectivityScore * 0.2);
        
        if (totalScore > bestScore) {
          bestScore = totalScore;
          bestNode = node;
        }
      }
    }
    
    return bestNode;
  }
  
  // Calculate route between two coordinates with vehicle type
  findRoute(startLat: number, startLng: number, endLat: number, endLng: number, vehicleType: string = 'walking'): any {
    try {
      // Find best start and end nodes
      const startNode = this.findBestNode(startLat, startLng, 50);
      const endNode = this.findBestNode(endLat, endLng, 50);
      
      if (!startNode || !endNode) {
        return {
          success: false,
          error: 'NO_NEARBY_NODES',
          message: 'No suitable network nodes found near start or end coordinates'
        };
      }
      
      // Calculate shortest path using Dijkstra for better route optimization
      const path = dijkstra.bidirectional(this.graph, startNode.id, endNode.id);
      
      if (!path) {
        return {
          success: false,
          error: 'NO_PATH_FOUND',
          message: 'No route found between the specified points'
        };
      }
      
      // Convert path to coordinates
      const coordinates = path.map(nodeId => {
        const nodeData = this.graph.getNodeAttributes(nodeId);
        return [nodeData.lng, nodeData.lat];
      });
      
      // Calculate total distance using original distances (not weighted)
      let totalDistance = 0;
      for (let i = 0; i < path.length - 1; i++) {
        const edge = this.graph.getEdgeAttributes(path[i], path[i + 1]);
        // Use original distance if available, otherwise use weight
        totalDistance += edge.originalDistance || edge.weight;
      }
      
      // Generate turn-by-turn instructions from coordinates and path
      const instructions = this.generateTurnByTurnInstructions(coordinates, path, vehicleType);
      
      return {
        success: true,
        route: {
          coordinates,
          distance: Math.round(totalDistance),
          nodes: path.length,
          instructions
        },
        debug: {
          startNode: startNode.id,
          endNode: endNode.id,
          startDistance: Math.round(this.calculateDistance(startLat, startLng, startNode.lat, startNode.lng)),
          endDistance: Math.round(this.calculateDistance(endLat, endLng, endNode.lat, endNode.lng))
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: 'ROUTING_ERROR',
        message: error instanceof Error ? error.message : 'Unknown routing error'
      };
    }
  }
  
  // Generate turn-by-turn instructions from coordinates and path
  private generateTurnByTurnInstructions(coordinates: number[][], path: string[], vehicleType: string = 'walking'): string[] {
    if (coordinates.length < 2) {
      return ['Sie haben Ihr Ziel erreicht'];
    }
    
    console.log(`🗺️ INSTRUCTION GENERATION: Processing ${coordinates.length} coordinates for ${vehicleType}`);
    const instructions: string[] = [];
    const significantPoints = this.findSignificantTurns(coordinates, vehicleType);
    
    // Get appropriate German verb based on vehicle type
    const verb = this.getGermanVerbForVehicle(vehicleType);
    console.log(`🇩🇪 INSTRUCTION VERB: Using "${verb}" for vehicle type "${vehicleType}"`);
    
    console.log(`🗺️ INSTRUCTION GENERATION: Found ${significantPoints.length} significant points`);
    
    for (let i = 0; i < significantPoints.length - 1; i++) {
      const currentIndex = significantPoints[i];
      const nextIndex = significantPoints[i + 1];
      
      // Calculate distance to next turn
      const distance = this.calculateSegmentDistance(coordinates, currentIndex, nextIndex);
      
      // Extract road name for this segment
      const roadName = this.getSegmentRoadName(path, currentIndex, nextIndex);
      
      let instruction = '';
      if (i === 0) {
        // First instruction with road name
        if (roadName) {
          instruction = `Auf ${roadName} ${this.formatDistance(distance)} geradeaus ${verb}`;
        } else {
          instruction = `Geradeaus ${this.formatDistance(distance)} ${verb}`;
        }
      } else if (i === significantPoints.length - 2) {
        // Last instruction - arrival
        instruction = 'Sie haben Ihr Ziel erreicht';
      } else {
        // Calculate turn direction with road name using vehicle-specific thresholds
        const prevIndex = significantPoints[i - 1];
        const maneuver = this.calculateTurnDirection(coordinates, prevIndex, currentIndex, nextIndex, vehicleType);
        if (roadName) {
          instruction = `${maneuver} auf ${roadName} und ${this.formatDistance(distance)} ${verb}`;
        } else {
          instruction = `${maneuver} und ${this.formatDistance(distance)} ${verb}`;
        }
      }
      
      instructions.push(instruction);
      console.log(`📍 INSTRUCTION ${i + 1}: ${instruction}`);
    }
    
    return instructions.length > 0 ? instructions : [`Geradeaus zum Ziel ${verb}`, 'Sie haben Ihr Ziel erreicht'];
  }

  // Get appropriate German verb for vehicle type
  private getGermanVerbForVehicle(vehicleType: string): string {
    switch (vehicleType) {
      case 'driving':
      case 'car':
        return 'fahren';
      case 'cycling':
      case 'bike':
        return 'radeln';
      case 'walking':
      case 'pedestrian':
      default:
        return 'gehen';
    }
  }
  
  // Extract road name for a segment of the path
  private getSegmentRoadName(path: string[], startIndex: number, endIndex: number): string | null {
    // Check a few edges in the segment to find a road name
    const maxEdgesToCheck = Math.min(3, endIndex - startIndex);
    const roadNames = new Map<string, number>();
    
    for (let i = startIndex; i < startIndex + maxEdgesToCheck && i < path.length - 1; i++) {
      try {
        const edge = this.graph.getEdgeAttributes(path[i], path[i + 1]);
        if (edge.roadName) {
          const count = roadNames.get(edge.roadName) || 0;
          roadNames.set(edge.roadName, count + 1);
        }
      } catch (e) {
        // Edge might not exist, continue
        continue;
      }
    }
    
    // Return most common road name in this segment
    if (roadNames.size > 0) {
      const sortedNames = Array.from(roadNames.entries()).sort((a, b) => b[1] - a[1]);
      return sortedNames[0][0];
    }
    
    return null;
  }
  
  // Find points where significant direction changes occur
  private findSignificantTurns(coordinates: number[][], vehicleType: string = 'walking'): number[] {
    if (coordinates.length <= 3) {
      return [0, coordinates.length - 1];
    }
    
    const significantIndices: number[] = [0]; // Always include start
    
    // 🏕️ CAMPGROUND OPTIMIZATION: Finer turn detection for walking/pedestrian mode
    let minTurnAngle: number;
    let minSegmentDistance: number;
    
    if (vehicleType === 'walking' || vehicleType === 'pedestrian') {
      minTurnAngle = 12; // Finer detection for campground paths (was 20°)
      minSegmentDistance = 8; // Shorter segments for detailed navigation (was 15m)
      console.log('🏕️ CAMPGROUND MODE: Using fine turn detection (12°, 8m segments)');
    } else {
      minTurnAngle = 20; // Standard for car/bike
      minSegmentDistance = 15; // Standard for car/bike
    }
    
    for (let i = 1; i < coordinates.length - 1; i++) {
      const prev = { lat: coordinates[i - 1][1], lng: coordinates[i - 1][0] };
      const current = { lat: coordinates[i][1], lng: coordinates[i][0] };
      const next = { lat: coordinates[i + 1][1], lng: coordinates[i + 1][0] };
      
      const angle = this.calculateTurnAngle(prev, current, next);
      const lastSignificantIndex = significantIndices[significantIndices.length - 1];
      const segmentDistance = this.calculateSegmentDistance(coordinates, lastSignificantIndex, i);
      
      if (Math.abs(angle) > minTurnAngle && segmentDistance > minSegmentDistance) {
        significantIndices.push(i);
      }
    }
    
    significantIndices.push(coordinates.length - 1); // Always include end
    return significantIndices;
  }
  
  // Calculate turn direction based on three points with vehicle-specific thresholds
  private calculateTurnDirection(coordinates: number[][], prevIndex: number, currentIndex: number, nextIndex: number, vehicleType: string = 'walking'): string {
    const prev = { lat: coordinates[prevIndex][1], lng: coordinates[prevIndex][0] };
    const current = { lat: coordinates[currentIndex][1], lng: coordinates[currentIndex][0] };
    const next = { lat: coordinates[nextIndex][1], lng: coordinates[nextIndex][0] };
    
    const angle = this.calculateTurnAngle(prev, current, next);
    
    // 🏕️ CAMPGROUND OPTIMIZATION: Finer angle thresholds for walking mode
    let straightThreshold: number, slightTurnThreshold: number, normalTurnThreshold: number;
    
    if (vehicleType === 'walking' || vehicleType === 'pedestrian') {
      straightThreshold = 10; // More sensitive straight detection (was 15°)
      slightTurnThreshold = 30; // Finer slight turn detection (was 45°)
      normalTurnThreshold = 100; // Adjusted normal turn threshold (was 120°)
    } else {
      straightThreshold = 15; // Standard for car/bike
      slightTurnThreshold = 45; // Standard for car/bike
      normalTurnThreshold = 120; // Standard for car/bike
    }
    
    if (Math.abs(angle) < straightThreshold) {
      return 'Geradeaus';
    } else if (angle > 0) {
      // Right turn
      if (angle < slightTurnThreshold) {
        return 'Leicht rechts';
      } else if (angle < normalTurnThreshold) {
        return 'Rechts abbiegen';
      } else {
        return 'Scharf rechts abbiegen';
      }
    } else {
      // Left turn  
      if (angle > -slightTurnThreshold) {
        return 'Leicht links';
      } else if (angle > -normalTurnThreshold) {
        return 'Links abbiegen';
      } else {
        return 'Scharf links abbiegen';
      }
    }
  }
  
  // Calculate turn angle between three points
  private calculateTurnAngle(prev: {lat: number, lng: number}, current: {lat: number, lng: number}, next: {lat: number, lng: number}): number {
    const bearing1 = this.calculateBearing(prev, current);
    const bearing2 = this.calculateBearing(current, next);
    
    let angle = bearing2 - bearing1;
    
    // Normalize angle to [-180, 180]
    if (angle > 180) angle -= 360;
    if (angle < -180) angle += 360;
    
    return angle;
  }
  
  // Calculate bearing between two points in degrees
  private calculateBearing(from: {lat: number, lng: number}, to: {lat: number, lng: number}): number {
    const lat1 = from.lat * Math.PI / 180;
    const lat2 = to.lat * Math.PI / 180;
    const deltaLng = (to.lng - from.lng) * Math.PI / 180;
    
    const x = Math.sin(deltaLng) * Math.cos(lat2);
    const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
    
    const bearing = Math.atan2(x, y) * 180 / Math.PI;
    return (bearing + 360) % 360;
  }
  
  // Calculate distance for a segment between two coordinate indices
  private calculateSegmentDistance(coordinates: number[][], startIndex: number, endIndex: number): number {
    let distance = 0;
    for (let i = startIndex; i < endIndex; i++) {
      const from = { lat: coordinates[i][1], lng: coordinates[i][0] };
      const to = { lat: coordinates[i + 1][1], lng: coordinates[i + 1][0] };
      distance += this.calculateDistance(from.lat, from.lng, to.lat, to.lng);
    }
    return distance;
  }
  
  // Format distance in a readable way - fix for meter calculations
  private formatDistance(distanceM: number): string {
    if (distanceM < 1000) {
      return `${Math.round(distanceM)} Meter`;
    } else {
      return `${(distanceM / 1000).toFixed(1)} Kilometer`;
    }
  }

  // Determine road type from GeoJSON properties - enhanced campground filtering
  private determineRoadType(properties: any): 'road' | 'footway' | 'cycleway' | 'mixed' {
    // Check various property fields that might indicate road type
    const highway = properties.highway?.toLowerCase() || '';
    const surface = properties.surface?.toLowerCase() || '';
    const name = properties.name?.toLowerCase() || '';
    const service = properties.service?.toLowerCase() || '';
    const tags = properties.tags || {};
    
    // Explicitly prioritize actual roads and driveways for campground routing
    if (highway.includes('unclassified') ||
        highway.includes('service') ||
        highway.includes('tertiary') ||
        highway.includes('residential') ||
        service.includes('driveway') ||
        surface.includes('asphalt') ||
        surface.includes('paved') ||
        name.includes('weg') ||
        name.includes('straße') ||
        name.includes('boulevard') ||
        name.includes('marina')) {
      return 'road';
    }
    
    // Dedicated footways - but lower priority than roads
    if (highway.includes('footway') ||
        highway.includes('path') ||
        highway.includes('pedestrian') ||
        highway.includes('steps') ||
        service.includes('parking_aisle') ||
        name.includes('fußweg') ||
        tags.foot === 'designated') {
      return 'footway';
    }
    
    // Cycling paths
    if (highway.includes('cycleway') ||
        tags.bicycle === 'designated') {
      return 'cycleway';
    }
    
    // Default: treat as mixed access but prefer roads
    return 'mixed';
  }
  
  // Check if road type is accessible by vehicle type
  private isAccessibleByVehicle(roadType: string, vehicleType: string): boolean {
    switch (vehicleType) {
      case 'driving':
        // Cars can only use roads and mixed paths, NOT footways
        return roadType === 'road' || roadType === 'mixed';
        
      case 'cycling':
        // Bikes can use roads, cycleways, and mixed, but avoid pure footways
        return roadType === 'road' || roadType === 'cycleway' || roadType === 'mixed';
        
      case 'walking':
      default:
        // Pedestrians can use all types
        return true;
    }
  }

  // Get network statistics
  getStats(): any {
    const roadTypes = new Map<string, number>();
    
    // Count road types
    this.graph.forEachEdge((edge: string, attributes: any) => {
      const roadType = attributes.roadType || 'unknown';
      roadTypes.set(roadType, (roadTypes.get(roadType) || 0) + 1);
    });
    
    return {
      nodes: this.graph.order,
      edges: this.graph.size,
      components: this.graph.connectedComponents().length,
      roadTypes: Object.fromEntries(roadTypes)
    };
  }
}

export default ModernRoutingEngine;
