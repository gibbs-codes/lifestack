/**
 * Briefing Service - External API Client
 * Fetches horoscope and news data for morning briefing
 */

const axios = require('axios');

// API endpoints
const HOROSCOPE_API = 'https://horoscope-app-api.vercel.app/api/v1/get-horoscope/daily';
const NYT_RSS_URL = 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml';

// Default configuration
const DEFAULT_CONFIG = {
  sign: 'Aquarius',
  newsLimit: 5,
  timeout: 10000
};

/**
 * Fetch daily horoscope
 * @param {string} sign - Zodiac sign (default: Aquarius)
 * @returns {Promise<Object>} Horoscope data
 */
async function fetchHoroscope(sign = DEFAULT_CONFIG.sign) {
  try {
    console.log(`♒ Fetching horoscope for ${sign}...`);

    const response = await axios.get(HOROSCOPE_API, {
      params: {
        sign,
        day: 'today'
      },
      timeout: DEFAULT_CONFIG.timeout
    });

    const horoscopeText = response.data?.data?.horoscope_data || '';

    return {
      sign,
      text: horoscopeText.toLowerCase(),
      success: true
    };
  } catch (error) {
    console.error('❌ Failed to fetch horoscope:', error.message);
    return {
      sign,
      text: 'not available today.',
      success: false,
      error: error.message
    };
  }
}

/**
 * Parse RSS XML to extract item titles
 * @param {string} xml - Raw RSS XML
 * @param {number} limit - Max number of headlines
 * @returns {Array<string>} Headlines
 */
function parseRssHeadlines(xml, limit = DEFAULT_CONFIG.newsLimit) {
  const titleRegex = /<item>[\s\S]*?<title>([\s\S]*?)<\/title>/g;
  const cdataClean = s => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();

  const matches = [...xml.matchAll(titleRegex)].slice(0, limit);

  return matches.map(m => cdataClean(m[1]));
}

/**
 * Fetch news headlines from NYT RSS
 * @param {number} limit - Number of headlines to fetch
 * @returns {Promise<Object>} News data
 */
async function fetchNews(limit = DEFAULT_CONFIG.newsLimit) {
  try {
    console.log('📰 Fetching news headlines...');

    const response = await axios.get(NYT_RSS_URL, {
      timeout: DEFAULT_CONFIG.timeout,
      responseType: 'text'
    });

    const headlines = parseRssHeadlines(response.data, limit);

    return {
      headlines,
      source: 'NYT',
      success: true
    };
  } catch (error) {
    console.error('❌ Failed to fetch news:', error.message);
    return {
      headlines: [],
      source: 'NYT',
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  fetchHoroscope,
  fetchNews,
  parseRssHeadlines,
  DEFAULT_CONFIG
};
