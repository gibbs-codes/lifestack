/**
 * Dashboard Service - API Routes
 * Aggregated dashboard data and profile management
 */

const express = require('express');
const controller = require('./controller');

const router = express.Router();

/**
 * GET /data
 * Get aggregated dashboard data for current or specified profile
 * Cached for 30 seconds
 *
 * Query params:
 * - profile: Profile name (optional, defaults to current profile)
 * - mode: Alias for profile (for backwards compatibility)
 *
 * Returns:
 * {
 *   success: true,
 *   fromCache: boolean,
 *   data: {
 *     profile: string,
 *     weather: { temp, condition, ... },
 *     transit: { buses, red, brown },
 *     events: [...],
 *     tasks: [...],
 *     nextEvent: { ... },
 *     artworkCenter: { ... },
 *     artworkRight: { ... },
 *     artworkTV: { ... },
 *     timestamp: string
 *   }
 * }
 */
router.get('/data', controller.getDashboardData);

/**
 * POST /refresh
 * Force refresh dashboard data (clears cache and fetches fresh)
 *
 * Query params:
 * - profile: Profile name (optional)
 */
router.post('/refresh', controller.refreshDashboard);

/**
 * GET /profiles
 * Get list of all available profiles
 */
router.get('/profiles', controller.getAvailableProfiles);

/**
 * POST /cache/clear
 * Clear all dashboard cache entries
 */
router.post('/cache/clear', controller.clearCache);

/**
 * GET /health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'dashboard',
    status: 'ok',
    timestamp: new Date().toISOString(),
    features: ['weather', 'transit', 'calendar', 'tasks', 'art'],
    caching: {
      dashboard: '30 seconds'
    }
  });
});

module.exports = router;
