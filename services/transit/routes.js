/**
 * Transit Service - API Routes
 * Caching proxy for CTA Bus and Train Tracker APIs
 */

const express = require('express');
const controller = require('./controller');

const router = express.Router();

/**
 * GET /all
 * Get all transit data (buses + trains)
 * Cached for 30 seconds
 *
 * Returns:
 * {
 *   success: true,
 *   fromCache: boolean,
 *   data: {
 *     buses: { east: [...], west: [...] },
 *     red: { north: [...], south: [...] },
 *     brown: { north: [...], south: [...] },
 *     lastUpdated: string
 *   }
 * }
 */
router.get('/all', controller.getAllTransit);

/**
 * GET /buses
 * Get bus predictions only
 * Cached for 30 seconds
 */
router.get('/buses', controller.getBuses);

/**
 * GET /trains
 * Get train arrivals only
 * Cached for 30 seconds
 */
router.get('/trains', controller.getTrains);

/**
 * POST /cache/clear
 * Clear all transit cache entries
 */
router.post('/cache/clear', controller.clearCache);

/**
 * GET /cache/stats
 * Get transit cache statistics
 */
router.get('/cache/stats', controller.getCacheStats);

/**
 * GET /health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'transit',
    status: 'ok',
    timestamp: new Date().toISOString(),
    caching: {
      transit: '30 seconds'
    },
    coverage: {
      buses: ['Route 77 (Belmont)'],
      trains: ['Red Line (Belmont)', 'Brown Line (Belmont)']
    }
  });
});

module.exports = router;
