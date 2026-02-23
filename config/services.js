/**
 * Services Configuration
 * Central location for service API keys and configuration
 */

module.exports = {
  // Strava API Configuration
  strava: {
    accessToken: process.env.STRAVA_ACCESS_TOKEN,
    // Note: For production, implement OAuth2 refresh flow
    // refreshToken: process.env.STRAVA_REFRESH_TOKEN,
    // clientId: process.env.STRAVA_CLIENT_ID,
    // clientSecret: process.env.STRAVA_CLIENT_SECRET
  },

  // Pavlok API Configuration
  pavlok: {
    token: process.env.PAVLOK_TOKEN
  },

  // Notion API Configuration
  notion: {
    token: process.env.NOTION_TOKEN
  },

  // Todoist API Configuration
  todoist: {
    token: process.env.TODOIST_TOKEN
  },

  // AnythingLLM API Configuration
  anythingllm: {
    apiKey: process.env.ANYTHINGLLM_API_KEY,
    baseUrl: process.env.ANYTHINGLLM_BASE_URL || 'http://localhost:3009/api/v1'
  },

  // OpenWeatherMap API Configuration
  openweather: {
    apiKey: process.env.OPENWEATHER_API_KEY,
    lat: process.env.WEATHER_LAT || '41.8781',
    lon: process.env.WEATHER_LON || '-87.6298'
  },

  // CTA Transit API Configuration
  cta: {
    busApiKey: process.env.CTA_BUS_API_KEY,
    trainApiKey: process.env.CTA_TRAIN_API_KEY
  },

  // Ollama API Configuration
  ollama: {
    baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'llama3'
  }
};
