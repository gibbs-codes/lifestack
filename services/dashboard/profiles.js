/**
 * Dashboard Profile Definitions
 *
 * Defines what data should be included in each dashboard profile
 *
 * Each profile specifies which data sources to include:
 * - weather: Current weather and forecast
 * - transit: CTA bus and train arrivals
 * - calendar: Today's events
 * - tasks: Tasks
 * - nextEvent: Next upcoming event
 * - urgentTasksOnly: Filter tasks to only urgent ones (due within 24hrs)
 * - art: Artwork from museums
 */

const PROFILES = {
  // Default profile - Art display with weather and transit
  default: {
    name: 'Default',
    description: 'Art display with weather and transit info',
    includes: {
      weather: true,
      transit: true,
      calendar: false,
      tasks: false,
      nextEvent: false,
      art: true
    }
  },

  // Gallery profile - Art focused with weather and transit
  gallery: {
    name: 'Gallery',
    description: 'Art display from museums with weather and transit info',
    includes: {
      weather: true,
      transit: true,
      calendar: false,
      tasks: false,
      nextEvent: false,
      art: true
    },
    artStyles: ['Cubism', 'Expressionism', 'Surrealism', 'Abstract', 'Minimalism', 'Constructivism', 'Symbolism', 'Suprematism', 'Bauhaus']
  },

  // Morning profile - Weather, next event, and urgent tasks
  morning: {
    name: 'Morning',
    description: 'Morning briefing - weather, next event, and urgent tasks',
    includes: {
      weather: true,
      transit: true,
      calendar: true,
      tasks: true,
      nextEvent: true,
      urgentTasksOnly: true,
      art: true
    }
  },

  // Focus profile - Next event only with art
  focus: {
    name: 'Focus',
    description: 'Focus mode - next event and art only',
    includes: {
      weather: false,
      transit: false,
      calendar: false,
      tasks: false,
      nextEvent: true,
      art: true
    }
  },

  // Work profile - Tasks and calendar only
  work: {
    name: 'Work',
    description: 'Work focus - calendar and tasks',
    includes: {
      weather: false,
      transit: false,
      calendar: true,
      tasks: true,
      nextEvent: true,
      art: false
    }
  },

  // Relax profile - Art only with minimal clock
  relax: {
    name: 'Relax',
    description: 'Relaxation mode - art only',
    includes: {
      weather: false,
      transit: false,
      calendar: false,
      tasks: false,
      nextEvent: false,
      art: true
    }
  },

  // Personal profile - Full dashboard with all data
  personal: {
    name: 'Personal',
    description: 'Full dashboard with calendar, tasks, weather, and transit',
    includes: {
      weather: true,
      transit: true,
      calendar: true,
      tasks: true,
      nextEvent: true,
      art: true
    }
  },

  // Guest profile - Public data only (weather and transit)
  guest: {
    name: 'Guest',
    description: 'Public information only - weather and transit',
    includes: {
      weather: true,
      transit: true,
      calendar: false,
      tasks: false,
      nextEvent: false,
      art: true
    }
  },

  // Transit profile - Transit information only
  transit: {
    name: 'Transit',
    description: 'Transit information only',
    includes: {
      weather: false,
      transit: true,
      calendar: false,
      tasks: false,
      nextEvent: false,
      art: false
    }
  }
};

/**
 * Get profile configuration by name
 * @param {string} profileName
 * @returns {Object} Profile configuration
 */
function getProfile(profileName) {
  const profile = PROFILES[profileName?.toLowerCase()];
  if (!profile) {
    return PROFILES.default;
  }
  return profile;
}

/**
 * Get list of all available profiles
 * @returns {Array}
 */
function getAllProfiles() {
  return Object.keys(PROFILES).map(key => ({
    key,
    ...PROFILES[key]
  }));
}

/**
 * Check if a profile exists
 * @param {string} profileName
 * @returns {boolean}
 */
function isValidProfile(profileName) {
  return Object.prototype.hasOwnProperty.call(PROFILES, profileName?.toLowerCase());
}

module.exports = {
  PROFILES,
  getProfile,
  getAllProfiles,
  isValidProfile
};
