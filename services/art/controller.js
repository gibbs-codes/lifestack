/**
 * Art Service - Controller
 * Request handlers with pool management and caching logic
 */

const { cache } = require('../../shared/middleware/cache');
const { createArtClient } = require('./client');
const artConfig = require('./config');

// Cache duration constants (in seconds)
const CACHE_DURATIONS = {
  POOL: artConfig.poolTtlSeconds || 3600,  // 1 hour for artwork pools
  ROTATION: artConfig.rotationIntervals    // Per-orientation rotation intervals
};

// Cache key prefixes
const CACHE_KEYS = {
  POOL: 'art:pool',
  ROTATION: 'art:rotation'
};

/**
 * Get artwork by orientation with pool rotation
 * @param {string} orientation - portrait, landscape, or tv
 * @param {Object} filters - Style filters
 * @returns {Promise<Object>} Artwork
 */
async function getArtworkByOrientation(orientation, filters = {}) {
  const artClient = createArtClient();
  const rotationInterval = CACHE_DURATIONS.ROTATION[orientation] || CACHE_DURATIONS.ROTATION.landscape;
  const now = Date.now();
  const rotationSlot = Math.floor(now / (rotationInterval * 1000));
  const filterKey = filters.styles ? `:${filters.styles.join('-')}` : '';
  const rotationCacheKey = `${CACHE_KEYS.ROTATION}:${orientation}${filterKey}:${rotationSlot}`;

  // Check if we have cached artwork for this rotation slot
  const cachedArtwork = cache.get(rotationCacheKey);
  if (cachedArtwork) {
    console.log(`✅ Cache hit: ${rotationCacheKey}`);
    return cachedArtwork;
  }

  console.log(`⚠️  Cache miss: ${rotationCacheKey}`);

  // Get or create the pool
  const poolKey = `${CACHE_KEYS.POOL}:${orientation}${filterKey}`;
  let artworkPool = cache.get(poolKey);

  if (!artworkPool || !artworkPool.length) {
    console.log(`🎨 Fetching new ${orientation} artwork pool`);
    artworkPool = await artClient.fetchArtworkPool(artConfig.poolSize, orientation, filters);
    cache.set(poolKey, artworkPool, CACHE_DURATIONS.POOL);
  }

  // Select artwork from pool based on rotation slot
  const poolIndex = rotationSlot % artworkPool.length;
  const artwork = artworkPool[poolIndex];
  console.log(`🖼️  Serving ${orientation} artwork from pool slot ${poolIndex} (rotation slot: ${rotationSlot})`);

  // Cache the rotation selection
  cache.set(rotationCacheKey, artwork, rotationInterval);

  return artwork;
}

/**
 * Get current artwork for all orientations
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getCurrentArtwork(req, res) {
  try {
    const filters = {};
    if (req.query.styles) {
      filters.styles = req.query.styles.split(',');
    }

    const [artworkCenter, artworkRight, artworkTV] = await Promise.all([
      getArtworkByOrientation('portrait', filters),
      getArtworkByOrientation('landscape', filters),
      getArtworkByOrientation('tv', filters)
    ]);

    res.json({
      success: true,
      data: {
        artworkCenter,
        artworkRight,
        artworkTV
      }
    });

  } catch (error) {
    handleError(res, error, 'Failed to get current artwork');
  }
}

/**
 * Get artwork by specific orientation
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getArtworkByOrientationHandler(req, res) {
  try {
    const { orientation } = req.params;

    if (!['portrait', 'landscape', 'tv'].includes(orientation)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid orientation. Must be portrait, landscape, or tv'
      });
    }

    const filters = {};
    if (req.query.styles) {
      filters.styles = req.query.styles.split(',');
    }

    const artwork = await getArtworkByOrientation(orientation, filters);

    res.json({
      success: true,
      data: artwork
    });

  } catch (error) {
    handleError(res, error, 'Failed to get artwork');
  }
}

/**
 * Force refresh artwork pools
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function refreshPools(req, res) {
  try {
    const artClient = createArtClient();
    const filters = {};
    if (req.query.styles) {
      filters.styles = req.query.styles.split(',');
    }

    console.log('🔄 Refreshing artwork pools');

    const [portraitPool, landscapePool, tvPool] = await Promise.all([
      artClient.fetchArtworkPool(artConfig.poolSize, 'portrait', filters),
      artClient.fetchArtworkPool(artConfig.poolSize, 'landscape', filters),
      artClient.fetchArtworkPool(artConfig.poolSize, 'tv', filters)
    ]);

    const filterKey = filters.styles ? `:${filters.styles.join('-')}` : '';
    cache.set(`${CACHE_KEYS.POOL}:portrait${filterKey}`, portraitPool, CACHE_DURATIONS.POOL);
    cache.set(`${CACHE_KEYS.POOL}:landscape${filterKey}`, landscapePool, CACHE_DURATIONS.POOL);
    cache.set(`${CACHE_KEYS.POOL}:tv${filterKey}`, tvPool, CACHE_DURATIONS.POOL);

    console.log('✅ Artwork pools refreshed successfully');

    res.json({
      success: true,
      message: 'Artwork pools refreshed successfully',
      pools: {
        portrait: portraitPool.length,
        landscape: landscapePool.length,
        tv: tvPool.length
      }
    });

  } catch (error) {
    handleError(res, error, 'Failed to refresh artwork pools');
  }
}

/**
 * Clear art cache
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
function clearCache(req, res) {
  try {
    const keys = cache.keys();
    const artKeys = keys.filter(key => key.startsWith('art:'));

    if (artKeys.length > 0) {
      cache.del(artKeys);
      console.log(`🗑️  Cleared ${artKeys.length} art cache entries`);
    }

    res.json({
      success: true,
      message: 'Art cache cleared successfully',
      keysCleared: artKeys.length
    });

  } catch (error) {
    console.error('❌ Error clearing art cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      message: error.message
    });
  }
}

/**
 * Get cache statistics for art
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
function getCacheStats(req, res) {
  try {
    const keys = cache.keys();
    const artKeys = keys.filter(key => key.startsWith('art:'));

    const stats = {
      totalKeys: artKeys.length,
      config: {
        poolSize: artConfig.poolSize,
        poolTtl: `${CACHE_DURATIONS.POOL} seconds`,
        rotationIntervals: CACHE_DURATIONS.ROTATION
      },
      keysByType: {
        pools: artKeys.filter(k => k.startsWith(CACHE_KEYS.POOL)).length,
        rotations: artKeys.filter(k => k.startsWith(CACHE_KEYS.ROTATION)).length
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

  // For art errors, return null artwork (UI handles this with generative art)
  if (status === 500 || error.originalError) {
    return res.json({
      success: true,
      data: {
        artworkCenter: null,
        artworkRight: null,
        artworkTV: null
      },
      warning: 'Using fallback (generative art) due to API error'
    });
  }

  res.status(status).json({
    success: false,
    error: message,
    message: error.message
  });
}

module.exports = {
  getCurrentArtwork,
  getArtworkByOrientationHandler,
  refreshPools,
  clearCache,
  getCacheStats
};
