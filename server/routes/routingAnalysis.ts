import { Router } from 'express';

const router = Router();

// Store the last routing failure for analysis
interface RoutingFailure {
  timestamp: string;
  start: { lat: number; lng: number };
  end: { lat: number; lng: number };
  mode: string;
  distance: number;
  error: string;
  details?: any;
}

let lastFailure: RoutingFailure | null = null;

// Endpoint to log routing failures
router.post('/failure', (req, res) => {
  const { start, end, mode, distance, error, details } = req.body;

  lastFailure = {
    timestamp: new Date().toISOString(),
    start,
    end,
    mode,
    distance,
    error,
    details
  };

  console.log(`📋 ROUTING FAILURE LOGGED:`, lastFailure);

  res.json({ success: true, logged: true });
});

// Endpoint to get last routing failure
router.get('/last-failure', (req, res) => {
  res.json({
    failure: lastFailure,
    hasFailure: !!lastFailure
  });
});

// Endpoint to clear failure log
router.delete('/failure', (req, res) => {
  lastFailure = null;
  res.json({ success: true, cleared: true });
});

export default router;