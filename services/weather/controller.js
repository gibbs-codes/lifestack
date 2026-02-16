/**
 * Weather Service - Controller
 * Request handlers with caching logic
 */

const { cache } = require('../../shared/middleware/cache');
const { createWeatherClient, FALLBACK_WEATHER } = require('./client');

// Cache duration constants (in seconds)
const CACHE_DURATIONS = {
  CURRENT: 10 * 60,    // 10 minutes
  FORECAST: 10 * 60    // 10 minutes
};

// Cache key prefixes
const CACHE_KEYS = {
  CURRENT: 'weather:current',
  FORECAST: 'weather:forecast'
};

/**
 * Get cached data or fetch from API
 * @param {string} cacheKey - Cache key
 * @param {number} duration - Cache duration in seconds
 * @param {Function} fetchFn - Function to fetch data if not cached
 * @returns {Promise<Object>} Data from cache or API
 * @private
 */
async function getCachedOrFetch(cacheKey, duration, fetchFn) {
  const cached = cache.get(cacheKey);

  if (cached) {
    console.log(`✅ Cache hit: ${cacheKey}`);
    return { data: cached, fromCache: true };
  }

  console.log(`⚠️  Cache miss: ${cacheKey}`);

  const data = await fetchFn();
  cache.set(cacheKey, data, duration);

  return { data, fromCache: false };
}

/**
 * Get current weather
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getCurrentWeather(req, res) {
  try {
    const weatherClient = createWeatherClient();

    const result = await getCachedOrFetch(
      CACHE_KEYS.CURRENT,
      CACHE_DURATIONS.CURRENT,
      () => weatherClient.getCurrentWeather()
    );

    res.json({
      success: true,
      fromCache: result.fromCache,
      data: result.data
    });

  } catch (error) {
    handleError(res, error, 'Failed to get current weather');
  }
}

/**
 * Get weather forecast
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getForecast(req, res) {
  try {
    const weatherClient = createWeatherClient();

    const result = await getCachedOrFetch(
      CACHE_KEYS.FORECAST,
      CACHE_DURATIONS.FORECAST,
      () => weatherClient.getForecast()
    );

    res.json({
      success: true,
      fromCache: result.fromCache,
      data: result.data
    });

  } catch (error) {
    handleError(res, error, 'Failed to get forecast');
  }
}

/**
 * Get all weather data (current + forecast)
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getAllWeather(req, res) {
  try {
    const weatherClient = createWeatherClient();

    // Try to get both from cache
    const cachedCurrent = cache.get(CACHE_KEYS.CURRENT);
    const cachedForecast = cache.get(CACHE_KEYS.FORECAST);

    let current, forecast;
    let fromCache = false;

    if (cachedCurrent && cachedForecast) {
      console.log('✅ Cache hit: weather:all (both current and forecast)');
      current = cachedCurrent;
      forecast = cachedForecast;
      fromCache = true;
    } else {
      console.log('⚠️  Cache miss: weather:all');
      const allData = await weatherClient.getAll();

      // Cache individual pieces
      cache.set(CACHE_KEYS.CURRENT, allData.current, CACHE_DURATIONS.CURRENT);
      cache.set(CACHE_KEYS.FORECAST, { forecast: allData.forecast, timestamp: allData.timestamp }, CACHE_DURATIONS.FORECAST);

      current = allData.current;
      forecast = { forecast: allData.forecast, timestamp: allData.timestamp };
    }

    res.json({
      success: true,
      fromCache,
      data: {
        current,
        forecast: forecast.forecast,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    handleError(res, error, 'Failed to get all weather data');
  }
}

/**
 * Clear weather cache
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
function clearCache(req, res) {
  try {
    const keys = cache.keys();
    const weatherKeys = keys.filter(key => key.startsWith('weather:'));

    if (weatherKeys.length > 0) {
      cache.del(weatherKeys);
      console.log(`🗑️  Cleared ${weatherKeys.length} weather cache entries`);
    }

    res.json({
      success: true,
      message: 'Weather cache cleared successfully',
      keysCleared: weatherKeys.length
    });

  } catch (error) {
    console.error('❌ Error clearing weather cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      message: error.message
    });
  }
}

/**
 * Get cache statistics for weather
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
function getCacheStats(req, res) {
  try {
    const keys = cache.keys();
    const weatherKeys = keys.filter(key => key.startsWith('weather:'));

    const stats = {
      totalKeys: weatherKeys.length,
      cacheDurations: CACHE_DURATIONS,
      keysByType: {
        current: weatherKeys.filter(k => k === CACHE_KEYS.CURRENT).length,
        forecast: weatherKeys.filter(k => k === CACHE_KEYS.FORECAST).length
      }
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('❌ Error fetching cache stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cache stats',
      message: error.message
    });
  }
}

/**
 * Handle errors consistently
 * @param {Object} res - Express response
 * @param {Error} error - Error object
 * @param {string} message - Error message
 * @private
 */
function handleError(res, error, message) {
  console.error(`❌ ${message}:`, error.message);

  const status = error.status || 500;

  // If it's a weather service error, return fallback data
  if (status === 500 || error.originalError) {
    return res.json({
      success: true,
      fromCache: false,
      data: {
        ...FALLBACK_WEATHER,
        timestamp: new Date().toISOString()
      },
      warning: 'Using fallback data due to API error'
    });
  }

  res.status(status).json({
    success: false,
    error: message,
    message: error.message
  });
}

module.exports = {
  getCurrentWeather,
  getForecast,
  getAllWeather,
  clearCache,
  getCacheStats
};
