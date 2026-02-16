/**
 * Transit Service - Controller
 * Request handlers with caching logic
 */

const { cache } = require('../../shared/middleware/cache');
const { createTransitClient, MOCK_BUS_DATA, MOCK_TRAIN_DATA } = require('./client');

// Cache duration constants (in seconds)
const CACHE_DURATIONS = {
  TRANSIT: 30  // 30 seconds for real-time transit data
};

// Cache key prefixes
const CACHE_KEYS = {
  BUSES: 'transit:buses',
  TRAINS: 'transit:trains',
  ALL: 'transit:all'
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
 * Get all transit data (buses + trains)
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getAllTransit(req, res) {
  try {
    const transitClient = createTransitClient();

    const result = await getCachedOrFetch(
      CACHE_KEYS.ALL,
      CACHE_DURATIONS.TRANSIT,
      () => transitClient.getAll()
    );

    // Format response to match what dashboard-ui expects
    const { buses, trains } = result.data;

    res.json({
      success: true,
      fromCache: result.fromCache,
      data: {
        buses: {
          east: buses.routes['77']?.eastbound || [],
          west: buses.routes['77']?.westbound || []
        },
        red: {
          north: trains.lines.red?.north || [],
          south: trains.lines.red?.south || []
        },
        brown: {
          north: trains.lines.brown?.north || [],
          south: trains.lines.brown?.south || []
        },
        lastUpdated: result.data.timestamp
      }
    });

  } catch (error) {
    handleError(res, error, 'Failed to get transit data');
  }
}

/**
 * Get bus data only
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getBuses(req, res) {
  try {
    const transitClient = createTransitClient();

    const result = await getCachedOrFetch(
      CACHE_KEYS.BUSES,
      CACHE_DURATIONS.TRANSIT,
      () => transitClient.getBuses()
    );

    res.json({
      success: true,
      fromCache: result.fromCache,
      data: result.data
    });

  } catch (error) {
    handleError(res, error, 'Failed to get bus data');
  }
}

/**
 * Get train data only
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getTrains(req, res) {
  try {
    const transitClient = createTransitClient();

    const result = await getCachedOrFetch(
      CACHE_KEYS.TRAINS,
      CACHE_DURATIONS.TRANSIT,
      () => transitClient.getTrains()
    );

    res.json({
      success: true,
      fromCache: result.fromCache,
      data: result.data
    });

  } catch (error) {
    handleError(res, error, 'Failed to get train data');
  }
}

/**
 * Clear transit cache
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
function clearCache(req, res) {
  try {
    const keys = cache.keys();
    const transitKeys = keys.filter(key => key.startsWith('transit:'));

    if (transitKeys.length > 0) {
      cache.del(transitKeys);
      console.log(`🗑️  Cleared ${transitKeys.length} transit cache entries`);
    }

    res.json({
      success: true,
      message: 'Transit cache cleared successfully',
      keysCleared: transitKeys.length
    });

  } catch (error) {
    console.error('❌ Error clearing transit cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      message: error.message
    });
  }
}

/**
 * Get cache statistics for transit
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
function getCacheStats(req, res) {
  try {
    const keys = cache.keys();
    const transitKeys = keys.filter(key => key.startsWith('transit:'));

    const stats = {
      totalKeys: transitKeys.length,
      cacheDurations: CACHE_DURATIONS,
      keysByType: {
        buses: transitKeys.filter(k => k.includes('buses')).length,
        trains: transitKeys.filter(k => k.includes('trains')).length,
        all: transitKeys.filter(k => k === CACHE_KEYS.ALL).length
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

  // For transit errors, return mock data
  if (status === 500 || error.originalError) {
    return res.json({
      success: true,
      fromCache: false,
      data: {
        buses: {
          east: MOCK_BUS_DATA.eastbound,
          west: MOCK_BUS_DATA.westbound
        },
        red: {
          north: MOCK_TRAIN_DATA.red.north,
          south: MOCK_TRAIN_DATA.red.south
        },
        brown: {
          north: MOCK_TRAIN_DATA.brown.north,
          south: MOCK_TRAIN_DATA.brown.south
        },
        lastUpdated: new Date().toISOString()
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
  getAllTransit,
  getBuses,
  getTrains,
  clearCache,
  getCacheStats
};
