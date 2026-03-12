/**
 * Dashboard Profile Definitions (Unified)
 *
 * Each profile specifies:
 * 1. Data sources to include (what to fetch from backend)
 * 2. Display configuration (what components to render on TV/projector)
 *
 * Data sources:
 * - weather: Current weather and forecast
 * - transit: CTA bus and train arrivals
 * - calendar: Today's events
 * - tasks: Tasks
 * - nextEvent: Next upcoming event
 * - urgentTasksOnly: Filter tasks to only urgent ones (due within 24hrs)
 * - art: Artwork from museums
 *
 * Display components:
 * - TV: TVArt, TVRelax, TVDefault
 * - Projector: Transit, ClockWeather, ArtCanvas, CalendarTimeline
 */

const PROFILES = {
  // Default profile - Art display with weather and transit
  default: {
    name: 'Default',
    description: 'Fullpage art display with weather and time',
    includes: {
      weather: true,
      transit: true,
      calendar: false,
      tasks: false,
      nextEvent: false,
      art: true
    },
    displays: {
      tv: 'TVArt',
      projector: {
        left: 'Transit',
        center: 'ArtCanvas',
        right: 'ArtCanvas'
      }
    }
  },

  // Relax profile - Generative art on TV, museum art on projector
  relax: {
    name: 'Relax Mode',
    description: 'Generative art on TV, museum art on projector',
    includes: {
      weather: true,
      transit: true,
      calendar: false,
      tasks: false,
      nextEvent: false,
      art: true
    },
    displays: {
      tv: 'TVRelax',
      projector: {
        left: 'Transit',
        center: 'ClockWeather',
        right: 'ArtCanvas'
      }
    }
  },

  // Gallery profile - Art focused with weather and transit
  gallery: {
    name: 'Gallery',
    description: 'Museum art gallery with transit',
    includes: {
      weather: true,
      transit: true,
      calendar: false,
      tasks: false,
      nextEvent: false,
      art: true
    },
    displays: {
      tv: 'TVRelax',
      projector: {
        left: 'Transit',
        center: 'ArtCanvas',
        right: 'ArtCanvas'
      }
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
    },
    displays: {
      tv: 'TVArt',
      projector: {
        left: 'Transit',
        center: 'ClockWeather',
        right: 'ArtCanvas'
      }
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
    },
    displays: {
      tv: 'TVRelax',
      projector: {
        left: 'ArtCanvas',
        center: 'ClockWeather',
        right: 'ArtCanvas'
      }
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
    },
    displays: {
      tv: 'TVArt',
      projector: {
        left: 'Transit',
        center: 'ClockWeather',
        right: 'ArtCanvas'
      }
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
    },
    displays: {
      tv: 'TVArt',
      projector: {
        left: 'Transit',
        center: 'ClockWeather',
        right: 'ArtCanvas'
      }
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
    },
    displays: {
      tv: 'TVArt',
      projector: {
        left: 'Transit',
        center: 'ArtCanvas',
        right: 'ArtCanvas'
      }
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
    },
    displays: {
      tv: 'TVArt',
      projector: {
        left: 'Transit',
        center: 'ClockWeather',
        right: 'ArtCanvas'
      }
    }
  },

  // Ambient profile - Generative art, no transit
  ambient: {
    name: 'Ambient',
    description: 'Generative art on TV, museum art on projector',
    includes: {
      weather: true,
      transit: false,
      calendar: false,
      tasks: false,
      nextEvent: false,
      art: true
    },
    displays: {
      tv: 'TVRelax',
      projector: {
        left: 'ArtCanvas',
        center: 'ClockWeather',
        right: 'ArtCanvas'
      }
    }
  },

  // Commute profile - Transit-focused with clock
  commute: {
    name: 'Commute',
    description: 'Transit times and clock',
    includes: {
      weather: true,
      transit: true,
      calendar: false,
      tasks: false,
      nextEvent: false,
      art: true
    },
    displays: {
      tv: 'TVArt',
      projector: {
        left: 'Transit',
        center: 'ClockWeather',
        right: 'ArtCanvas'
      }
    }
  },

  // Artshow profile - Museum art in all canvases
  artshow: {
    name: 'Art Show',
    description: 'Museum artwork display',
    includes: {
      weather: true,
      transit: false,
      calendar: false,
      tasks: false,
      nextEvent: false,
      art: true
    },
    displays: {
      tv: 'TVArt',
      projector: {
        left: 'ArtCanvas',
        center: 'ArtCanvas',
        right: 'ArtCanvas'
      }
    }
  },

  // Minimal profile - Just clock and weather with art
  minimal: {
    name: 'Minimal',
    description: 'Clean clock and weather with art',
    includes: {
      weather: true,
      transit: false,
      calendar: false,
      tasks: false,
      nextEvent: false,
      art: true
    },
    displays: {
      tv: 'TVArt',
      projector: {
        left: 'ArtCanvas',
        center: 'ClockWeather',
        right: 'ArtCanvas'
      }
    }
  },

  // Flow profile - Flow art on TV, transit + art on projector
  flow: {
    name: 'Flow',
    description: 'Flow art on TV, transit and art on projector',
    includes: {
      weather: true,
      transit: true,
      calendar: false,
      tasks: false,
      nextEvent: false,
      art: true
    },
    displays: {
      tv: 'TVRelax',
      projector: {
        left: 'Transit',
        center: 'ArtCanvas',
        right: 'ArtCanvas'
      }
    }
  },

  // Orbital profile - Orbital art on TV, clock + art on projector
  orbital: {
    name: 'Orbital',
    description: 'Orbital art on TV, clock and art on projector',
    includes: {
      weather: true,
      transit: false,
      calendar: false,
      tasks: false,
      nextEvent: false,
      art: true
    },
    displays: {
      tv: 'TVRelax',
      projector: {
        left: 'ArtCanvas',
        center: 'ClockWeather',
        right: 'ArtCanvas'
      }
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

/**
 * Get display configuration for a profile
 * @param {string} profileName
 * @param {string} displayType - 'tv' or 'projector'
 * @returns {Object|string|null}
 */
function getDisplayConfig(profileName, displayType) {
  const profile = getProfile(profileName);
  if (!profile || !profile.displays) {
    return null;
  }
  return profile.displays[displayType] || null;
}

module.exports = {
  PROFILES,
  getProfile,
  getAllProfiles,
  isValidProfile,
  getDisplayConfig
};
