/**
 * Art Service - API Routes
 * Caching proxy for museum APIs with pool rotation
 */

const express = require('express');
const controller = require('./controller');

const router = express.Router();

/**
 * GET /current
 * Get current artwork for all orientations (portrait, landscape, tv)
 * Cached based on rotation intervals (5-7 minutes per orientation)
 *
 * Query params:
 * - styles: Comma-separated list of art styles to filter by
 *
 * Returns:
 * {
 *   success: true,
 *   data: {
 *     artworkCenter: { imageUrl, title, artist, date, source, ... },
 *     artworkRight: { ... },
 *     artworkTV: { ... }
 *   }
 * }
 */
router.get('/current', controller.getCurrentArtwork);

/**
 * GET /orientation/:orientation
 * Get artwork for a specific orientation
 * Orientations: portrait, landscape, tv
 *
 * Query params:
 * - styles: Comma-separated list of art styles to filter by
 */
router.get('/orientation/:orientation', controller.getArtworkByOrientationHandler);

/**
 * POST /refresh
 * Force refresh all artwork pools
 * This will fetch new artworks from all enabled sources
 *
 * Query params:
 * - styles: Comma-separated list of art styles to filter by
 */
router.post('/refresh', controller.refreshPools);

/**
 * POST /cache/clear
 * Clear all art cache entries (pools and rotations)
 */
router.post('/cache/clear', controller.clearCache);

/**
 * GET /cache/stats
 * Get art cache statistics
 */
router.get('/cache/stats', controller.getCacheStats);

/**
 * GET /health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'art',
    status: 'ok',
    timestamp: new Date().toISOString(),
    sources: {
      artic: 'Art Institute of Chicago',
      met: 'Metropolitan Museum of Art',
      cleveland: 'Cleveland Museum of Art'
    },
    poolConfig: {
      size: 12,
      ttl: '1 hour'
    },
    rotationIntervals: {
      portrait: '5 minutes',
      landscape: '7 minutes',
      tv: '6 minutes'
    }
  });
});

module.exports = router;
