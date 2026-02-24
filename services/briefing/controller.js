/**
 * Briefing Service - Controller
 * Aggregates data from multiple services and formats the morning briefing
 */

const { createWeatherClient } = require('../weather/client');
const { fetchTodoistTasks, fetchTodayCalendarEvents } = require('../unified/aggregator');
const { fetchHoroscope, fetchNews, DEFAULT_CONFIG } = require('./client');
const { createOllamaClient } = require('../ollama/client');

// Briefing format constants
const BRIEFING_WIDTH = 42;

/**
 * Wrap text to specified width
 * @param {string} text - Text to wrap
 * @param {number} width - Max line width
 * @returns {string} Wrapped text
 */
function wrap(text, width = BRIEFING_WIDTH) {
  const words = String(text).split(' ');
  const lines = [];
  let line = '';

  for (const word of words) {
    if (line.length + word.length + 1 > width) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }

  if (line) lines.push(line);
  return lines.join('\n');
}

/**
 * Create a section divider
 * @param {string} label - Section label
 * @returns {string} Formatted divider
 */
function divider(label) {
  const dashes = '-'.repeat(Math.max(0, BRIEFING_WIDTH - label.length - 4));
  return `-- ${label} ${dashes}`;
}

/**
 * Format time from ISO string
 * @param {string} iso - ISO date string
 * @returns {string} Formatted time (e.g., "9:30a")
 */
function formatTime(iso) {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'p' : 'a';
  const hour = h > 12 ? h - 12 : (h === 0 ? 12 : h);
  return `${hour}:${m}${ampm}`;
}

/**
 * Get formatted date string
 * @returns {string} e.g., "monday, feb 24"
 */
function getDateString() {
  const now = new Date();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  return `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;
}

/**
 * Format weather section
 * @param {Object} weather - Weather data
 * @returns {string} Formatted weather text
 */
function formatWeather(weather) {
  if (!weather || weather.error) {
    return 'weather data unavailable.';
  }

  const temp = Math.round(weather.temp || 0);
  const feelsLike = Math.round(weather.feelsLike || 0);
  const high = Math.round(weather.high || 0);
  const low = Math.round(weather.low || 0);
  const desc = (weather.description || weather.condition || 'unknown').toLowerCase();
  const wind = Math.round(weather.windSpeed || 0);

  return `${temp}° and ${desc}. feels like ${feelsLike}°, wind ${wind}mph.\nhigh ${high}° / low ${low}°.`;
}

/**
 * Format calendar section
 * @param {Array} events - Calendar events
 * @returns {string} Formatted calendar text
 */
function formatCalendar(events) {
  if (!events || events.length === 0) {
    return '  nothing scheduled today.';
  }

  return events.slice(0, 6).map(e => {
    const time = e.start?.dateTime ? formatTime(e.start.dateTime) : 'all day';
    const title = (e.summary || e.title || '').toLowerCase();
    return `  ${time.padEnd(8)}${title}`;
  }).join('\n');
}

/**
 * Format tasks section
 * @param {Array} tasks - Task list
 * @returns {string} Formatted tasks text
 */
function formatTasks(tasks) {
  const now = new Date();

  // Filter for incomplete tasks with due dates
  const urgentTasks = (tasks || []).filter(t => !t.completed && (t.due || t.dueDate));

  if (urgentTasks.length === 0) {
    return "  you're clear.";
  }

  return urgentTasks.slice(0, 5).map(t => {
    const name = (t.title || t.content || t.name || '').toLowerCase();
    const dueDate = new Date(t.due || t.dueDate);
    const overdue = dueDate < now;
    return `  -> ${name}${overdue ? ' (overdue)' : ''}`;
  }).join('\n');
}

/**
 * Format news section
 * @param {Array} headlines - News headlines
 * @returns {string} Formatted news text
 */
function formatNews(headlines) {
  if (!headlines || headlines.length === 0) {
    return '  no headlines available.';
  }

  return headlines.map(title => {
    const wrapped = wrap(title, BRIEFING_WIDTH - 4).split('\n').join('\n    ');
    return `  . ${wrapped}`;
  }).join('\n');
}

/**
 * Assemble the complete morning briefing
 * @param {Object} data - Aggregated data from all sources
 * @returns {string} Formatted briefing text
 */
function assembleBriefing(data) {
  const { weather, events, tasks, horoscope, news } = data;
  const dateString = getDateString();

  const sections = [
    `good morning -- ${dateString}`,
    '',
    formatWeather(weather),
    '',
    divider('today'),
    formatCalendar(events),
    '',
    divider('needs to happen'),
    formatTasks(tasks),
    '',
    divider('headlines'),
    formatNews(news.headlines),
    '',
    divider(horoscope.sign.toLowerCase()),
    wrap(horoscope.text),
    '',
    '-'.repeat(BRIEFING_WIDTH),
    `${' '.repeat(24)}go get 'em.`,
    ''
  ];

  return sections.join('\n');
}

/**
 * Gather all data for the briefing
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Aggregated briefing data
 */
async function gatherBriefingData(options = {}) {
  const sign = options.sign || DEFAULT_CONFIG.sign;

  console.log('📋 Gathering briefing data...');

  // Fetch all data in parallel
  const [weather, events, tasks, horoscope, news] = await Promise.all([
    // Weather
    (async () => {
      try {
        const client = createWeatherClient();
        return await client.getCurrentWeather();
      } catch (error) {
        console.error('❌ Weather fetch failed:', error.message);
        return { error: true };
      }
    })(),

    // Calendar events
    (async () => {
      try {
        return await fetchTodayCalendarEvents();
      } catch (error) {
        console.error('❌ Calendar fetch failed:', error.message);
        return [];
      }
    })(),

    // Tasks
    (async () => {
      try {
        return await fetchTodoistTasks();
      } catch (error) {
        console.error('❌ Tasks fetch failed:', error.message);
        return [];
      }
    })(),

    // Horoscope
    fetchHoroscope(sign),

    // News
    fetchNews(options.newsLimit)
  ]);

  console.log('✅ Briefing data gathered');

  return { weather, events, tasks, horoscope, news };
}

/**
 * GET /preview
 * Preview the briefing without printing
 */
async function previewBriefing(req, res) {
  try {
    const sign = req.query.sign || DEFAULT_CONFIG.sign;
    const data = await gatherBriefingData({ sign });
    const briefing = assembleBriefing(data);

    res.json({
      success: true,
      briefing,
      data: {
        weather: data.weather,
        eventsCount: data.events.length,
        tasksCount: data.tasks.length,
        horoscopeSign: data.horoscope.sign,
        headlinesCount: data.news.headlines.length
      }
    });
  } catch (error) {
    handleError(res, error, 'Failed to generate briefing preview');
  }
}

/**
 * POST /print
 * Generate and print the morning briefing
 */
async function printBriefing(req, res) {
  try {
    const sign = req.body.sign || req.query.sign || DEFAULT_CONFIG.sign;
    const data = await gatherBriefingData({ sign });
    const briefing = assembleBriefing(data);

    // Import print controller and send to printer
    const { print } = require('../print/controller');

    // Create a mock request/response for the print controller
    const printReq = {
      body: {
        text: briefing,
        align: 'left',
        cut: true,
        feed: 3
      }
    };

    let printSuccess = false;
    let printError = null;

    const printRes = {
      json: (result) => {
        printSuccess = result.success;
      },
      status: (code) => ({
        json: (result) => {
          printError = result.error;
        }
      })
    };

    await print(printReq, printRes);

    if (printSuccess) {
      res.json({
        success: true,
        message: 'printing your briefing...',
        briefing
      });
    } else {
      res.status(500).json({
        success: false,
        error: printError || 'Failed to send to printer',
        briefing // Still return the briefing text
      });
    }
  } catch (error) {
    handleError(res, error, 'Failed to print briefing');
  }
}

/**
 * Serialize briefing data into compact summary for LLM
 * @param {Object} data - Raw briefing data
 * @returns {Object} Compact summary
 */
function serializeBriefingData(data) {
  const { weather, events, tasks, horoscope, news } = data;

  return {
    date: getDateString(),
    weather: weather.error ? null : {
      temp: Math.round(weather.temp || 0),
      feelsLike: Math.round(weather.feelsLike || 0),
      high: Math.round(weather.high || 0),
      low: Math.round(weather.low || 0),
      condition: (weather.description || weather.condition || '').toLowerCase(),
      wind: Math.round(weather.windSpeed || 0)
    },
    events: (events || []).slice(0, 6).map(e => ({
      time: e.start?.dateTime ? formatTime(e.start.dateTime) : 'all day',
      title: (e.summary || e.title || '').toLowerCase()
    })),
    tasks: (tasks || []).filter(t => !t.completed && (t.due || t.dueDate)).slice(0, 5).map(t => ({
      name: (t.title || t.content || t.name || '').toLowerCase(),
      overdue: new Date(t.due || t.dueDate) < new Date()
    })),
    headlines: (news.headlines || []).slice(0, 5),
    horoscope: {
      sign: horoscope.sign,
      text: horoscope.text
    }
  };
}

/**
 * Build the newspaper prompt for Ollama
 * @param {Object} summary - Serialized briefing data
 * @returns {string} Full prompt
 */
function buildNewspaperPrompt(summary) {
  const dataJson = JSON.stringify(summary, null, 2);

  return `you are a copywriter for "the morning post", a tiny broadsheet printed on a thermal receipt printer.

write today's edition using this data:
${dataJson}

STRICT FORMATTING RULES:
- all lowercase, no markdown, no asterisks
- max 42 characters per line (HARD LIMIT)
- NEVER break words across lines - if a word won't fit, move it to the next line
- use blank lines between sections for readability
- use a row of dashes (----------) to separate major sections

sections to include:

1. MASTHEAD
   "the morning post" centered
   a fake vol/no and today's date below it
   a row of dashes underneath

2. WEATHER DISPATCH
   section header, then 1-2 sentences
   dramatic old-timey weather bureau style
   blank line after

3. SOCIAL CALENDAR
   section header, then list today's events
   brief, formal society column style
   blank line after

4. MATTERS REQUIRING ATTENTION
   section header, then tasks as terse classified ads
   blank line after

5. DISPATCHES FROM ABROAD
   section header, then headlines
   rewritten in 1920s tabloid voice
   punchy, slightly absurd
   blank line after

6. THE ORACLE SPEAKS
   section header for horoscope
   keep the actual horoscope text, just frame it
   blank line after

7. SIGN-OFF
   a row of dashes, then a witty motto centered

write the complete newspaper now, plain text only:`;
}

/**
 * GET /newspaper
 * Generate LLM-powered newspaper-style briefing
 */
async function generateNewspaperBriefing(req, res) {
  try {
    const sign = req.query.sign || DEFAULT_CONFIG.sign;
    const data = await gatherBriefingData({ sign });
    const summary = serializeBriefingData(data);
    const prompt = buildNewspaperPrompt(summary);

    const ollama = createOllamaClient();
    const result = await ollama.generate(prompt);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to generate newspaper',
        code: result.code
      });
    }

    res.json({
      success: true,
      briefing: result.text
    });
  } catch (error) {
    handleError(res, error, 'Failed to generate newspaper briefing');
  }
}

/**
 * GET /newspaper/print
 * Generate and print newspaper-style briefing
 */
async function printNewspaperBriefing(req, res) {
  try {
    const sign = req.query.sign || DEFAULT_CONFIG.sign;
    const data = await gatherBriefingData({ sign });
    const summary = serializeBriefingData(data);
    const prompt = buildNewspaperPrompt(summary);

    const ollama = createOllamaClient();
    const result = await ollama.generate(prompt);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to generate newspaper',
        code: result.code
      });
    }

    const briefing = result.text;

    // Send to printer
    const { print } = require('../print/controller');

    const printReq = {
      body: {
        text: briefing,
        align: 'left',
        cut: true,
        feed: 3
      }
    };

    let printSuccess = false;
    let printError = null;

    const printRes = {
      json: (result) => {
        printSuccess = result.success;
      },
      status: (code) => ({
        json: (result) => {
          printError = result.error;
        }
      })
    };

    await print(printReq, printRes);

    if (printSuccess) {
      res.json({
        success: true,
        message: 'printing your newspaper...',
        briefing
      });
    } else {
      res.status(500).json({
        success: false,
        error: printError || 'Failed to send to printer',
        briefing
      });
    }
  } catch (error) {
    handleError(res, error, 'Failed to print newspaper briefing');
  }
}

/**
 * Handle errors consistently
 * @param {Object} res - Express response
 * @param {Error} error - Error object
 * @param {string} message - Error message
 */
function handleError(res, error, message) {
  console.error(`❌ ${message}:`, error.message);

  res.status(500).json({
    success: false,
    error: message,
    message: error.message
  });
}

module.exports = {
  previewBriefing,
  printBriefing,
  generateNewspaperBriefing,
  printNewspaperBriefing,
  gatherBriefingData,
  assembleBriefing,
  // Export formatters for testing/customization
  formatWeather,
  formatCalendar,
  formatTasks,
  formatNews,
  wrap,
  divider
};
