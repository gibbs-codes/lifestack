/**
 * Weather Service - API Routes
 * Caching proxy for OpenWeatherMap API
 */

const express = require('express');
const controller = require('./controller');

const router = express.Router();

/**
 * GET /current
 * Get current weather conditions
 * Cached for 10 minutes
 *
 * Returns:
 * {
 *   success: true,
 *   fromCache: boolean,
 *   data: {
 *     temp: number,
 *     condition: string,
 *     description: string,
 *     feelsLike: number,
 *     humidity: number,
 *     high: number,
 *     low: number,
 *     icon: string,
 *     windSpeed: number,
 *     timestamp: string
 *   }
 * }
 */
router.get('/current', controller.getCurrentWeather);

/**
 * GET /forecast
 * Get 5-day weather forecast
 * Cached for 10 minutes
 *
 * Returns:
 * {
 *   success: true,
 *   fromCache: boolean,
 *   data: {
 *     forecast: [
 *       { date, high, low, condition, icon }
 *     ],
 *     timestamp: string
 *   }
 * }
 */
router.get('/forecast', controller.getForecast);

/**
 * GET /all
 * Get all weather data (current + forecast)
 * Cached for 10 minutes
 */
router.get('/all', controller.getAllWeather);

/**
 * POST /cache/clear
 * Clear all weather cache entries
 */
router.post('/cache/clear', controller.clearCache);

/**
 * GET /cache/stats
 * Get weather cache statistics
 */
router.get('/cache/stats', controller.getCacheStats);

/**
 * GET /health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'weather',
    status: 'ok',
    timestamp: new Date().toISOString(),
    caching: {
      current: '10 minutes',
      forecast: '10 minutes'
    }
  });
});

module.exports = router;
