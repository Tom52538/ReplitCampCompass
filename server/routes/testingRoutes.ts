
import { Router } from 'express';
import { RoutingTestScenario } from '../lib/routingTestScenario';

const router = Router();
const testScenario = new RoutingTestScenario();

// Run comprehensive test of all 10 POI routes
router.get('/comprehensive', async (req, res) => {
  try {
    console.log('🧪 STARTING COMPREHENSIVE ROUTING TEST...');
    const report = await testScenario.runComprehensiveTest();
    
    res.json({
      success: true,
      report,
      summary: {
        totalRoutes: report.totalRoutes,
        successRate: report.successRate,
        averageTime: report.averageTime,
        failedRoutes: report.failedRoutes
      }
    });
  } catch (error) {
    console.error('❌ Comprehensive test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Run test for specific route by ID
router.get('/route/:routeId', async (req, res) => {
  try {
    const { routeId } = req.params;
    console.log(`🎯 RUNNING SPECIFIC TEST: ${routeId}`);
    
    const result = await testScenario.runSpecificTest(routeId);
    if (!result) {
      return res.status(404).json({
        success: false,
        error: `Route ${routeId} not found`
      });
    }
    
    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error(`❌ Specific test failed for ${req.params.routeId}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Run tests by difficulty level
router.get('/difficulty/:level', async (req, res) => {
  try {
    const level = req.params.level as 'easy' | 'medium' | 'hard';
    if (!['easy', 'medium', 'hard'].includes(level)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid difficulty level. Use: easy, medium, hard'
      });
    }
    
    console.log(`🎯 RUNNING ${level.toUpperCase()} DIFFICULTY TESTS...`);
    const results = await testScenario.runTestsByDifficulty(level);
    
    const successCount = results.filter(r => r.success).length;
    const successRate = (successCount / results.length) * 100;
    
    res.json({
      success: true,
      difficulty: level,
      results,
      summary: {
        totalRoutes: results.length,
        successfulRoutes: successCount,
        successRate: successRate.toFixed(1)
      }
    });
  } catch (error) {
    console.error(`❌ Difficulty test failed for ${req.params.level}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get list of all test routes
router.get('/routes', async (req, res) => {
  try {
    const routes = testScenario.getTestRoutes();
    res.json({
      success: true,
      routes: routes.map(r => ({
        id: r.id,
        name: r.name,
        category: r.category,
        difficulty: r.difficulty,
        expectedDistance: r.expectedDistance,
        start: r.start.name,
        end: r.end.name
      }))
    });
  } catch (error) {
    console.error('❌ Failed to get test routes:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Quick smoke test (just 3 routes)
router.get('/smoke', async (req, res) => {
  try {
    console.log('🚀 RUNNING SMOKE TEST...');
    
    // Test one route from each difficulty
    const easyResults = await testScenario.runTestsByDifficulty('easy');
    const mediumResults = await testScenario.runTestsByDifficulty('medium');
    const hardResults = await testScenario.runTestsByDifficulty('hard');
    
    const allResults = [
      easyResults[0], // First easy route
      mediumResults[0], // First medium route  
      hardResults[0]  // First hard route
    ].filter(Boolean);
    
    const successCount = allResults.filter(r => r.success).length;
    const successRate = (successCount / allResults.length) * 100;
    
    res.json({
      success: true,
      testType: 'smoke',
      results: allResults,
      summary: {
        totalRoutes: allResults.length,
        successfulRoutes: successCount,
        successRate: successRate.toFixed(1)
      }
    });
  } catch (error) {
    console.error('❌ Smoke test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
