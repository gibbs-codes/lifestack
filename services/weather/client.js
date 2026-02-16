/**
 * Weather API Client
 * Wrapper for OpenWeatherMap API
 */

const { createApiClient } = require('../../shared/utils/apiClient');
const weatherConfig = require('../../config/services').openweather;

// OpenWeatherMap API configuration
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Fallback weather data in case of API errors
const FALLBACK_WEATHER = {
  temp: null,
  condition: 'Unavailable',
  feelsLike: null,
  humidity: null,
  high: null,
  low: null,
  icon: '01d',
  description: 'Weather data temporarily unavailable',
  error: true
};

/**
 * Weather API Client Class
 */
class WeatherClient {
  constructor(config = {}) {
    this.apiKey = config.apiKey || weatherConfig?.apiKey;
    this.lat = config.lat || weatherConfig?.lat || '41.8781';
    this.lon = config.lon || weatherConfig?.lon || '-87.6298';

    if (!this.apiKey) {
      throw new Error('OpenWeatherMap API key is required. Please set OPENWEATHER_API_KEY in environment variables.');
    }

    // Create configured API client
    this.client = createApiClient({
      baseURL: OPENWEATHER_BASE_URL,
      timeout: 5000
    });
  }

  /**
   * Fetch current weather data from OpenWeatherMap API
   * @returns {Promise<Object>} Raw weather data
   */
  async fetchCurrentWeather() {
    try {
      console.log(`🌤️  Fetching current weather for ${this.lat}, ${this.lon}`);

      const response = await this.client.get('/weather', {
        params: {
          lat: this.lat,
          lon: this.lon,
          appid: this.apiKey,
          units: 'imperial'
        }
      });

      return response.data;
    } catch (error) {
      this._handleError(error, 'Failed to fetch current weather');
    }
  }

  /**
   * Fetch forecast data from OpenWeatherMap API (5-day/3-hour forecast)
   * @returns {Promise<Object>} Raw forecast data
   */
  async fetchForecast() {
    try {
      console.log(`📅 Fetching forecast for ${this.lat}, ${this.lon}`);

      const response = await this.client.get('/forecast', {
        params: {
          lat: this.lat,
          lon: this.lon,
          appid: this.apiKey,
          units: 'imperial'
        }
      });

      return response.data;
    } catch (error) {
      this._handleError(error, 'Failed to fetch forecast');
    }
  }

  /**
   * Format current weather data
   * @param {Object} data - Raw weather data
   * @returns {Object} Formatted weather data
   */
  formatCurrentWeather(data) {
    try {
      return {
        temp: Math.round(data.main.temp),
        condition: data.weather[0].main,
        description: data.weather[0].description,
        feelsLike: Math.round(data.main.feels_like),
        humidity: data.main.humidity,
        high: Math.round(data.main.temp_max),
        low: Math.round(data.main.temp_min),
        icon: data.weather[0].icon,
        pressure: data.main.pressure,
        windSpeed: Math.round(data.wind.speed),
        windDirection: data.wind.deg,
        cloudiness: data.clouds.all,
        visibility: data.visibility,
        sunrise: data.sys.sunrise,
        sunset: data.sys.sunset,
        timezone: data.timezone,
        cityName: data.name,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error formatting weather data:', error.message);
      throw error;
    }
  }

  /**
   * Format forecast data - get daily highs/lows
   * @param {Object} data - Raw forecast data
   * @returns {Array} Formatted daily forecasts
   */
  formatForecast(data) {
    try {
      // Group forecast data by day
      const dailyForecasts = {};

      data.list.forEach(item => {
        const date = new Date(item.dt * 1000).toLocaleDateString('en-US');

        if (!dailyForecasts[date]) {
          dailyForecasts[date] = {
            date,
            temps: [],
            conditions: [],
            icons: []
          };
        }

        dailyForecasts[date].temps.push(item.main.temp);
        dailyForecasts[date].conditions.push(item.weather[0].main);
        dailyForecasts[date].icons.push(item.weather[0].icon);
      });

      // Format daily summaries
      const forecast = Object.values(dailyForecasts).map(day => {
        const high = Math.round(Math.max(...day.temps));
        const low = Math.round(Math.min(...day.temps));

        // Most common condition
        const conditionCounts = {};
        day.conditions.forEach(cond => {
          conditionCounts[cond] = (conditionCounts[cond] || 0) + 1;
        });
        const condition = Object.keys(conditionCounts).reduce((a, b) =>
          conditionCounts[a] > conditionCounts[b] ? a : b
        );

        // Use the most common icon
        const icon = day.icons[Math.floor(day.icons.length / 2)];

        return {
          date: day.date,
          high,
          low,
          condition,
          icon
        };
      });

      return forecast.slice(0, 5); // Return next 5 days
    } catch (error) {
      console.error('❌ Error formatting forecast data:', error.message);
      throw error;
    }
  }

  /**
   * Get current weather (formatted)
   * @returns {Promise<Object>} Formatted current weather
   */
  async getCurrentWeather() {
    try {
      const rawData = await this.fetchCurrentWeather();
      return this.formatCurrentWeather(rawData);
    } catch (error) {
      console.error('❌ Error getting current weather:', error.message);
      console.warn('⚠️  Returning fallback weather data');
      return {
        ...FALLBACK_WEATHER,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get forecast (formatted)
   * @returns {Promise<Object>} Formatted forecast
   */
  async getForecast() {
    try {
      const rawData = await this.fetchForecast();
      const formatted = this.formatForecast(rawData);
      return {
        forecast: formatted,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error getting forecast:', error.message);
      console.warn('⚠️  Returning empty forecast data');
      return {
        forecast: [],
        error: true,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get all weather data (current + forecast)
   * @returns {Promise<Object>} Combined weather data
   */
  async getAll() {
    try {
      const [current, forecastData] = await Promise.all([
        this.getCurrentWeather(),
        this.getForecast()
      ]);

      return {
        current,
        forecast: forecastData.forecast,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error getting all weather data:', error.message);
      return {
        current: {
          ...FALLBACK_WEATHER,
          timestamp: new Date().toISOString()
        },
        forecast: [],
        error: true,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Handle API errors with proper formatting
   * @param {Error} error - Error object
   * @param {string} message - Custom error message
   * @throws {Error} Formatted error
   * @private
   */
  _handleError(error, message) {
    console.error(`❌ Weather API Error: ${message}`, error.message);

    if (error.response) {
      const status = error.response.status;

      if (status === 401) {
        const formattedError = new Error('Invalid or expired OpenWeatherMap API key');
        formattedError.status = 401;
        throw formattedError;
      }

      if (status === 429) {
        const formattedError = new Error('OpenWeatherMap API rate limit exceeded');
        formattedError.status = 429;
        throw formattedError;
      }

      const formattedError = new Error(error.response.data?.message || message);
      formattedError.status = status;
      throw formattedError;
    }

    const formattedError = new Error(message);
    formattedError.status = 500;
    formattedError.originalError = error.message;
    throw formattedError;
  }
}

/**
 * Create a Weather client instance
 * @param {Object} config - Optional config override
 * @returns {WeatherClient} Weather client instance
 */
function createWeatherClient(config = {}) {
  return new WeatherClient(config);
}

module.exports = {
  WeatherClient,
  createWeatherClient,
  FALLBACK_WEATHER
};
