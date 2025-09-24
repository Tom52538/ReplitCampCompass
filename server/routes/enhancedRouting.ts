
import { Router } from 'express';
import { SmartRoutingOrchestrator } from '../lib/smartRoutingOrchestrator.js';

const router = Router();
const routingOrchestrator = new SmartRoutingOrchestrator();

// Enhanced routing endpoint using OSM network + Google fallback
router.post('/enhanced', async (req, res) => {
  try {
    const { from, to, profile = 'walking' } = req.body;

    console.log('🎯 ENHANCED ROUTING REQUEST:', {
      from,
      to,
      profile,
      bodyKeys: Object.keys(req.body),
      hasFrom: !!from,
      hasTo: !!to
    });

    // Enhanced coordinate validation
    if (!from || !to) {
      console.error('❌ MISSING COORDINATES:', { from, to });
      return res.status(400).json({
        success: false,
        error: 'Missing from or to coordinates',
        received: { from: !!from, to: !!to }
      });
    }

    if (!from.lat || !from.lng || !to.lat || !to.lng) {
      console.error('❌ INVALID COORDINATE VALUES:', { 
        fromLat: from.lat, 
        fromLng: from.lng, 
        toLat: to.lat, 
        toLng: to.lng 
      });
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates: lat/lng values required',
        received: { from, to }
      });
    }

    // Validate numeric values
    if (isNaN(Number(from.lat)) || isNaN(Number(from.lng)) || 
        isNaN(Number(to.lat)) || isNaN(Number(to.lng))) {
      console.error('❌ NON-NUMERIC COORDINATES:', { from, to });
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates: lat/lng must be numeric',
        received: { from, to }
      });
    }

    console.log(`🎯 ENHANCED ROUTE REQUEST: ${from.lat},${from.lng} → ${to.lat},${to.lng} (${profile})`);
    console.log(`🔥 DIRECT TEST: About to call SmartRoutingOrchestrator.calculateRoute with profile="${profile}"`);

    const result = await routingOrchestrator.calculateRoute(
      { lat: from.lat, lng: from.lng },
      { lat: to.lat, lng: to.lng },
      profile
    );
    
    console.log(`🔥 RESULT BACK: method="${result.method}", instructions count=${result.instructions?.length || 0}`);

    const response = {
      success: result.success,
      totalDistance: result.distance >= 1000
        ? `${(result.distance / 1000).toFixed(1)} km`
        : `${Math.round(result.distance)} m`,
      estimatedTime: result.estimatedTime >= 3600
        ? `${Math.floor(result.estimatedTime / 3600)}h ${Math.floor((result.estimatedTime % 3600) / 60)}min`
        : `${Math.ceil(result.estimatedTime / 60)} min`,
      durationSeconds: result.estimatedTime,
      instructions: result.instructions.map((instruction, index) => ({
        instruction,
        distance: '0m', // Distance is included in instruction text
        duration: '0s', // Duration is included in instruction text  
        maneuverType: extractManeuverType(instruction, index, result.instructions.length),
        stepIndex: index
      })),
      geometry: result.path,
      routingService: `Enhanced Routing (${result.method})`,
      method: result.method,
      confidence: result.confidence,
      distance: result.distance
    };

    console.log(`✅ ENHANCED ROUTE SUCCESS: ${response.method} - ${response.totalDistance}, ${response.estimatedTime}, ${result.instructions?.length || 0} instructions`);
    console.log(`🗺️ INSTRUCTIONS:`, result.instructions);

    res.json(response);

  } catch (error) {
    console.error('💥 ENHANCED ROUTE ERROR:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Enhanced routing failed',
      method: 'enhanced-routing-error'
    });
  }
});

// Endpoint for pure OSM routing
router.post('/directions', async (req, res) => {
  try {
    const { from, to, mode = 'walking' } = req.body;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: from, to'
      });
    }

    // Use OSM-only routing through the orchestrator
    const route = await routingOrchestrator.calculateRoute(from, to, mode);

    const response = {
      success: route.success,
      route: route.success ? {
        geometry: route.path,
        distance: route.distance,
        duration: route.estimatedTime,
        instructions: route.instructions,
        method: route.method
      } : null,
      error: route.success ? null : route.error,
      processingInfo: {
        routingMethod: 'osm-only',
        fallbacksUsed: false,
        googleDirectionsUsed: false,
        birdRouteUsed: false
      }
    };

    res.json(response);
  } catch (error) {
    console.error('❌ OSM-only routing error:', error);
    res.status(500).json({
      success: false,
      error: 'OSM routing failed',
      message: error.message
    });
  }
});

// Network statistics endpoint
router.get('/stats', async (req, res) => {
  try {
    const stats = routingOrchestrator.getStats();
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test endpoint for debugging routing issues with vehicle types
router.post('/test', async (req, res) => {
  try {
    console.log('🧪 ROUTING TEST ENDPOINT HIT');
    
    const { vehicleType = 'walking' } = req.body;
    
    // Use default test coordinates within Kamperland campground
    const testFrom = { lat: 51.4965, lng: 3.61158 }; // Reception area
    const testTo = { lat: 51.4978, lng: 3.61089 };   // Pool area
    
    console.log('🧪 TESTING ROUTE:', { from: testFrom, to: testTo, vehicleType });

    // Test both walking and driving routes
    const walkingResult = await routingOrchestrator.calculateRoute(
      testFrom,
      testTo,
      'walking'
    );
    
    const drivingResult = await routingOrchestrator.calculateRoute(
      testFrom,
      testTo,
      'driving'
    );

    console.log('🧪 TEST RESULTS:', {
      walking: {
        success: walkingResult.success,
        method: walkingResult.method,
        distance: walkingResult.distance,
        pathLength: walkingResult.path?.length || 0
      },
      driving: {
        success: drivingResult.success,
        method: drivingResult.method,
        distance: drivingResult.distance,
        pathLength: drivingResult.path?.length || 0
      }
    });

    res.json({
      success: true,
      testResults: {
        walking: walkingResult,
        driving: drivingResult
      },
      coordinates: { from: testFrom, to: testTo },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 ROUTING TEST ERROR:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Network health check endpoint
router.get('/network-status', async (req, res) => {
  try {
    const stats = routingOrchestrator.getStats();
    
    res.json({
      success: true,
      networkHealth: {
        ...stats,
        timestamp: new Date().toISOString(),
        status: stats.totalNodes > 1000 ? 'healthy' : 'degraded'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      networkHealth: { status: 'failed' }
    });
  }
});

// Helper function to extract maneuver type from instruction text
function extractManeuverType(instruction: string, index: number, totalInstructions: number): string {
  if (index === totalInstructions - 1 || instruction.toLowerCase().includes('ziel erreicht') || instruction.toLowerCase().includes('arrived')) {
    return 'arrive';
  }
  
  const lower = instruction.toLowerCase();
  if (lower.includes('links abbiegen') || lower.includes('turn left')) {
    return 'turn-left';
  }
  if (lower.includes('rechts abbiegen') || lower.includes('turn right')) {
    return 'turn-right';
  }
  if (lower.includes('leicht links') || lower.includes('keep left')) {
    return 'slight-left';
  }
  if (lower.includes('leicht rechts') || lower.includes('keep right')) {
    return 'slight-right';
  }
  if (lower.includes('scharf') && lower.includes('links')) {
    return 'sharp-left';
  }
  if (lower.includes('scharf') && lower.includes('rechts')) {
    return 'sharp-right';
  }
  if (lower.includes('wenden') || lower.includes('u-turn')) {
    return 'u-turn';
  }
  return 'straight';
}

// Bind function to router for use in route handlers
(router as any).extractManeuverType = extractManeuverType;

export default router;
