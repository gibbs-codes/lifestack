/**
 * Dashboard Aggregator
 * Combines data from weather, transit, art, calendar, and tasks services
 */

const { cache } = require('../../shared/middleware/cache');
const { getProfile, getAllProfiles } = require('./profiles');

// Import service controllers/clients
const { createWeatherClient } = require('../weather/client');
const { createTransitClient } = require('../transit/client');
const { createArtClient } = require('../art/client');
const artConfig = require('../art/config');

// Cache keys for art pools (shared with art service)
const ART_CACHE_KEYS = {
  POOL: 'art:pool',
  ROTATION: 'art:rotation'
};

/**
 * Get next event from events list
 * @param {Array} events
 * @returns {Object|null}
 */
function getNextEvent(events) {
  if (!events || events.length === 0) {
    return null;
  }

  const now = new Date();

  const upcomingEvents = events
    .filter(event => {
      const eventStart = new Date(event.start || event.startTime);
      if (event.end || event.endTime) {
        const eventEnd = new Date(event.end || event.endTime);
        return eventEnd > now;
      }
      return eventStart > now;
    })
    .sort((a, b) => {
      const aStart = new Date(a.start || a.startTime);
      const bStart = new Date(b.start || b.startTime);
      return aStart - bStart;
    });

  return upcomingEvents.length > 0 ? upcomingEvents[0] : null;
}

/**
 * Filter urgent tasks (due within 24 hours or overdue)
 * @param {Array} tasks
 * @returns {Array}
 */
function filterUrgentTasks(tasks) {
  if (!tasks || tasks.length === 0) {
    return [];
  }

  const now = new Date();
  const urgentThreshold = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const urgentTasks = tasks.filter(task => {
    if (task.completed || task.status === 'completed') {
      return false;
    }

    if (!task.due && !task.dueDate) {
      return false;
    }

    const dueDate = new Date(task.due || task.dueDate);
    return dueDate < urgentThreshold;
  });

  return urgentTasks.sort((a, b) => {
    const aDue = new Date(a.due || a.dueDate);
    const bDue = new Date(b.due || b.dueDate);
    return aDue - bDue;
  });
}

/**
 * Fetch weather data
 * @returns {Promise<Object>}
 */
async function fetchWeatherData() {
  try {
    const weatherClient = createWeatherClient();
    const weather = await weatherClient.getCurrentWeather();
    return { success: true, data: weather };
  } catch (error) {
    console.error('❌ Dashboard aggregator - weather fetch failed:', error.message);
    return { success: false, error: error.message, data: null };
  }
}

/**
 * Fetch transit data
 * @returns {Promise<Object>}
 */
async function fetchTransitData() {
  try {
    const transitClient = createTransitClient();
    const transit = await transitClient.getAll();
    return { success: true, data: transit };
  } catch (error) {
    console.error('❌ Dashboard aggregator - transit fetch failed:', error.message);
    return { success: false, error: error.message, data: null };
  }
}

/**
 * Fetch calendar data from unified service
 * @returns {Promise<Object>}
 */
async function fetchCalendarData() {
  try {
    // Import the unified aggregator to get today's data
    const { getToday } = require('../unified/aggregator');
    const todayData = await getToday();
    return {
      success: true,
      data: todayData.calendar?.events || []
    };
  } catch (error) {
    console.error('❌ Dashboard aggregator - calendar fetch failed:', error.message);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Fetch tasks data from unified service
 * @returns {Promise<Object>}
 */
async function fetchTasksData() {
  try {
    const { getTasks } = require('../unified/aggregator');
    const tasksData = await getTasks();
    return {
      success: true,
      data: tasksData.tasks || []
    };
  } catch (error) {
    console.error('❌ Dashboard aggregator - tasks fetch failed:', error.message);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Fetch artwork data
 * @param {Array} artStyles - Optional style filters
 * @returns {Promise<Object>}
 */
async function fetchArtworkData(artStyles = null) {
  try {
    const artClient = createArtClient();
    const filters = artStyles ? { styles: artStyles } : {};

    // Get artwork for each orientation
    const [artworkCenter, artworkRight, artworkTV] = await Promise.all([
      getArtworkByOrientation(artClient, 'portrait', filters),
      getArtworkByOrientation(artClient, 'landscape', filters),
      getArtworkByOrientation(artClient, 'tv', filters)
    ]);

    return {
      success: true,
      data: { artworkCenter, artworkRight, artworkTV }
    };
  } catch (error) {
    console.error('❌ Dashboard aggregator - artwork fetch failed:', error.message);
    return { success: false, error: error.message, data: null };
  }
}

/**
 * Get artwork by orientation with caching
 * @param {ArtClient} artClient
 * @param {string} orientation
 * @param {Object} filters
 * @returns {Promise<Object>}
 */
async function getArtworkByOrientation(artClient, orientation, filters = {}) {
  const rotationInterval = artConfig.rotationIntervals[orientation] || artConfig.rotationIntervals.landscape;
  const now = Date.now();
  const rotationSlot = Math.floor(now / (rotationInterval * 1000));
  const filterKey = filters.styles ? `:${filters.styles.join('-')}` : '';
  const rotationCacheKey = `${ART_CACHE_KEYS.ROTATION}:${orientation}${filterKey}:${rotationSlot}`;

  // Check cache
  const cachedArtwork = cache.get(rotationCacheKey);
  if (cachedArtwork) {
    return cachedArtwork;
  }

  // Get or create pool
  const poolKey = `${ART_CACHE_KEYS.POOL}:${orientation}${filterKey}`;
  let artworkPool = cache.get(poolKey);

  if (!artworkPool || !artworkPool.length) {
    artworkPool = await artClient.fetchArtworkPool(artConfig.poolSize, orientation, filters);
    cache.set(poolKey, artworkPool, artConfig.poolTtlSeconds);
  }

  // Select from pool
  const poolIndex = rotationSlot % artworkPool.length;
  const artwork = artworkPool[poolIndex];

  // Cache selection
  cache.set(rotationCacheKey, artwork, rotationInterval);

  return artwork;
}

/**
 * Format transit data for dashboard
 * @param {Object} transitResult
 * @returns {Object|null}
 */
function formatTransitData(transitResult) {
  if (!transitResult.success || !transitResult.data) {
    return null;
  }

  const { buses, trains } = transitResult.data;

  return {
    buses: {
      east: buses?.routes?.['77']?.eastbound || [],
      west: buses?.routes?.['77']?.westbound || []
    },
    red: {
      north: trains?.lines?.red?.north || [],
      south: trains?.lines?.red?.south || []
    },
    brown: {
      north: trains?.lines?.brown?.north || [],
      south: trains?.lines?.brown?.south || []
    }
  };
}

/**
 * Format weather data for dashboard
 * @param {Object} weatherResult
 * @returns {Object|null}
 */
function formatWeatherData(weatherResult) {
  if (!weatherResult.success || !weatherResult.data) {
    return null;
  }

  const weather = weatherResult.data;

  return {
    temp: weather.temp,
    condition: weather.condition,
    feelsLike: weather.feelsLike,
    humidity: weather.humidity,
    high: weather.high,
    low: weather.low,
    icon: weather.icon,
    description: weather.description
  };
}

/**
 * Aggregate dashboard data based on profile
 * @param {string} profileName - The dashboard profile
 * @returns {Promise<Object>} Aggregated dashboard data
 */
async function aggregateDashboard(profileName = 'default') {
  const profile = getProfile(profileName);
  console.log(`📊 Aggregating dashboard data for profile: ${profile.name}`);

  // Build array of fetch promises based on profile
  const fetchPromises = [];
  const fetchKeys = [];

  if (profile.includes.weather) {
    fetchPromises.push(fetchWeatherData());
    fetchKeys.push('weather');
  }

  if (profile.includes.transit) {
    fetchPromises.push(fetchTransitData());
    fetchKeys.push('transit');
  }

  if (profile.includes.calendar || profile.includes.nextEvent) {
    fetchPromises.push(fetchCalendarData());
    fetchKeys.push('calendar');
  }

  if (profile.includes.tasks) {
    fetchPromises.push(fetchTasksData());
    fetchKeys.push('tasks');
  }

  if (profile.includes.art !== false) {
    fetchPromises.push(fetchArtworkData(profile.artStyles || null));
    fetchKeys.push('artwork');
  }

  // Fetch all data in parallel
  const results = await Promise.all(fetchPromises);

  // Map results back to keys
  const fetchResults = {};
  fetchKeys.forEach((key, index) => {
    fetchResults[key] = results[index];
  });

  // Build dashboard response
  const dashboard = {
    profile: profileName,
    timestamp: new Date().toISOString()
  };

  // Add weather data if included
  if (profile.includes.weather) {
    dashboard.weather = formatWeatherData(fetchResults.weather);
  }

  // Add transit data if included
  if (profile.includes.transit) {
    dashboard.transit = formatTransitData(fetchResults.transit);
  }

  // Add calendar data if included
  if (profile.includes.calendar) {
    dashboard.events = fetchResults.calendar?.data || [];
  }

  // Add next event if included
  if (profile.includes.nextEvent) {
    const events = fetchResults.calendar?.data || [];
    dashboard.nextEvent = getNextEvent(events);
  }

  // Add tasks data if included
  if (profile.includes.tasks) {
    const tasks = fetchResults.tasks?.data || [];

    if (profile.includes.urgentTasksOnly) {
      dashboard.tasks = filterUrgentTasks(tasks);
    } else {
      dashboard.tasks = tasks;
    }
  }

  // Add artwork data
  if (profile.includes.art !== false && fetchResults.artwork?.success && fetchResults.artwork.data) {
    dashboard.artworkCenter = fetchResults.artwork.data.artworkCenter || null;
    dashboard.artworkRight = fetchResults.artwork.data.artworkRight || null;
    dashboard.artworkTV = fetchResults.artwork.data.artworkTV || null;
  } else if (profile.includes.art !== false) {
    dashboard.artworkCenter = null;
    dashboard.artworkRight = null;
    dashboard.artworkTV = null;
  }

  // Add error information for failed fetches
  const errors = {};
  Object.keys(fetchResults).forEach(key => {
    if (!fetchResults[key].success) {
      errors[key] = fetchResults[key].error;
    }
  });

  if (Object.keys(errors).length > 0) {
    dashboard.errors = errors;
    console.warn('⚠️  Dashboard aggregation completed with errors:', errors);
  } else {
    console.log('✅ Dashboard aggregation completed successfully');
  }

  return dashboard;
}

module.exports = {
  aggregateDashboard,
  getAllProfiles,
  getNextEvent,
  filterUrgentTasks
};
