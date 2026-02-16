/**
 * Dashboard Service - Controller
 * Request handlers for dashboard aggregation and profile management
 */

const { cache } = require('../../shared/middleware/cache');
const { aggregateDashboard, getAllProfiles } = require('./aggregator');
const { getProfile, isValidProfile } = require('./profiles');

// In-memory profile state
let currentProfile = 'default';
const profileHistory = [];
const MAX_HISTORY = 10;

// Cache duration for dashboard data
const CACHE_DURATION = 30;  // 30 seconds

/**
 * Get aggregated dashboard data
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getDashboardData(req, res) {
  try {
    // Use profile from query param, or current profile
    const profileName = req.query.profile || req.query.mode || currentProfile;
    const cacheKey = `dashboard:data:${profileName}`;

    // Check cache
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log(`✅ Cache hit: ${cacheKey}`);
      return res.json({
        success: true,
        fromCache: true,
        data: cached
      });
    }

    console.log(`⚠️  Cache miss: ${cacheKey}`);

    // Aggregate data
    const dashboard = await aggregateDashboard(profileName);

    // Cache the result
    cache.set(cacheKey, dashboard, CACHE_DURATION);

    res.json({
      success: true,
      fromCache: false,
      data: dashboard
    });

  } catch (error) {
    handleError(res, error, 'Failed to get dashboard data');
  }
}

/**
 * Force refresh dashboard data
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function refreshDashboard(req, res) {
  try {
    const profileName = req.query.profile || req.query.mode || currentProfile;

    // Clear cache for this profile
    const cacheKey = `dashboard:data:${profileName}`;
    cache.del(cacheKey);

    // Fetch fresh data
    const dashboard = await aggregateDashboard(profileName);

    // Cache the result
    cache.set(cacheKey, dashboard, CACHE_DURATION);

    res.json({
      success: true,
      message: 'Dashboard data refreshed',
      data: dashboard
    });

  } catch (error) {
    handleError(res, error, 'Failed to refresh dashboard');
  }
}

/**
 * Get current profile
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
function getCurrentProfile(req, res) {
  const profile = getProfile(currentProfile);

  res.json({
    success: true,
    data: {
      profile: currentProfile,
      name: profile.name,
      description: profile.description,
      includes: profile.includes,
      lastChanged: profileHistory.length > 0 ? profileHistory[0].timestamp : null
    }
  });
}

/**
 * Set current profile
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
function setProfile(req, res) {
  try {
    const { profile, mode } = req.body;
    const newProfile = profile || mode;

    if (!newProfile) {
      return res.status(400).json({
        success: false,
        error: 'Profile name is required'
      });
    }

    if (!isValidProfile(newProfile)) {
      return res.status(400).json({
        success: false,
        error: `Invalid profile: ${newProfile}`,
        availableProfiles: getAllProfiles().map(p => p.key)
      });
    }

    const previousProfile = currentProfile;
    currentProfile = newProfile.toLowerCase();

    // Add to history
    profileHistory.unshift({
      from: previousProfile,
      to: currentProfile,
      timestamp: new Date().toISOString()
    });

    // Keep history limited
    if (profileHistory.length > MAX_HISTORY) {
      profileHistory.pop();
    }

    console.log(`📊 Profile changed: ${previousProfile} -> ${currentProfile}`);

    const profileConfig = getProfile(currentProfile);

    res.json({
      success: true,
      message: `Profile changed to ${currentProfile}`,
      data: {
        profile: currentProfile,
        name: profileConfig.name,
        description: profileConfig.description,
        includes: profileConfig.includes
      }
    });

  } catch (error) {
    handleError(res, error, 'Failed to set profile');
  }
}

/**
 * Get available profiles
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
function getAvailableProfiles(req, res) {
  res.json({
    success: true,
    data: {
      current: currentProfile,
      profiles: getAllProfiles()
    }
  });
}

/**
 * Get profile history
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
function getProfileHistory(req, res) {
  res.json({
    success: true,
    data: {
      current: currentProfile,
      history: profileHistory
    }
  });
}

/**
 * Reset to default profile
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
function resetProfile(req, res) {
  const previousProfile = currentProfile;
  currentProfile = 'default';

  profileHistory.unshift({
    from: previousProfile,
    to: 'default',
    timestamp: new Date().toISOString(),
    action: 'reset'
  });

  if (profileHistory.length > MAX_HISTORY) {
    profileHistory.pop();
  }

  console.log(`📊 Profile reset to default from ${previousProfile}`);

  res.json({
    success: true,
    message: 'Profile reset to default',
    data: {
      profile: currentProfile,
      previousProfile
    }
  });
}

/**
 * Clear dashboard cache
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
function clearCache(req, res) {
  try {
    const keys = cache.keys();
    const dashboardKeys = keys.filter(key => key.startsWith('dashboard:'));

    if (dashboardKeys.length > 0) {
      cache.del(dashboardKeys);
      console.log(`🗑️  Cleared ${dashboardKeys.length} dashboard cache entries`);
    }

    res.json({
      success: true,
      message: 'Dashboard cache cleared',
      keysCleared: dashboardKeys.length
    });

  } catch (error) {
    console.error('❌ Error clearing dashboard cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
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

  res.status(status).json({
    success: false,
    error: message,
    message: error.message
  });
}

module.exports = {
  getDashboardData,
  refreshDashboard,
  getCurrentProfile,
  setProfile,
  getAvailableProfiles,
  getProfileHistory,
  resetProfile,
  clearCache
};
