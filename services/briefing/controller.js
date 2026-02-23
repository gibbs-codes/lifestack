/**
 * Briefing Service - Controller
 * Aggregates data from multiple services and formats the morning briefing
 *
 * Aesthetic: contemplative, spacious, poetic
 */

const { createWeatherClient } = require('../weather/client');
const { fetchTodoistTasks, fetchTodayCalendarEvents } = require('../unified/aggregator');
const { fetchHoroscope, fetchNews, DEFAULT_CONFIG } = require('./client');

// Briefing format constants
const W = 42;

/**
 * Center text within width
 */
function center(text, width = W) {
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(padding) + text;
}

/**
 * Wrap and center text
 */
function wrapCenter(text, width = W) {
  const words = String(text).split(' ');
  const lines = [];
  let line = '';

  for (const word of words) {
    if (line.length + word.length + 1 > width - 4) {
      if (line) lines.push(center(line, width));
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(center(line, width));
  return lines.join('\n');
}

/**
 * Soft divider - contemplative spacing
 */
function softDivider() {
  return center('.  *  .', W);
}

/**
 * Section break with breathing room
 */
function breathe(lines = 2) {
  return '\n'.repeat(lines - 1);
}

/**
 * Format time from ISO string
 */
function formatTime(iso) {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'pm' : 'am';
  const hour = h > 12 ? h - 12 : (h === 0 ? 12 : h);
  return `${hour}:${m} ${ampm}`;
}

/**
 * Get formatted date string
 */
function getDateString() {
  const now = new Date();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const months = ['january', 'february', 'march', 'april', 'may', 'june',
                  'july', 'august', 'september', 'october', 'november', 'december'];
  return `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;
}

/**
 * Format weather - contemplative style
 */
function formatWeather(weather) {
  if (!weather || weather.error) {
    return center('the sky is a mystery today');
  }

  const temp = Math.round(weather.temp || 0);
  const desc = (weather.description || 'unknown').toLowerCase();
  const high = Math.round(weather.high || 0);
  const low = Math.round(weather.low || 0);

  return [
    center(`${temp}°`),
    center(desc),
    '',
    center(`${low}° — ${high}°`)
  ].join('\n');
}

/**
 * Format calendar - contemplative style (fewer items, more space)
 */
function formatCalendar(events) {
  if (!events || events.length === 0) {
    return center('a quiet day ahead');
  }

  // Show max 3 events with breathing room
  return events.slice(0, 3).map(e => {
    const time = e.start?.dateTime ? formatTime(e.start.dateTime) : 'all day';
    const title = (e.summary || e.title || '').toLowerCase();
    return center(time) + '\n' + center(title);
  }).join('\n\n');
}

/**
 * Format tasks - contemplative style
 */
function formatTasks(tasks) {
  const now = new Date();
  const urgentTasks = (tasks || []).filter(t => !t.completed && (t.due || t.dueDate));

  if (urgentTasks.length === 0) {
    return center('nothing pressing');
  }

  // Show max 3 tasks
  return urgentTasks.slice(0, 3).map(t => {
    const name = (t.title || t.content || t.name || '').toLowerCase();
    const dueDate = new Date(t.due || t.dueDate);
    const overdue = dueDate < now;
    return center(overdue ? `· ${name} ·` : name);
  }).join('\n');
}

/**
 * Format a single headline - contemplative style
 */
function formatHeadline(headlines) {
  if (!headlines || headlines.length === 0) {
    return center('the world turns quietly');
  }

  // Just one headline, wrapped nicely
  const headline = headlines[0];
  return wrapCenter(headline.toLowerCase(), W);
}

/**
 * Format horoscope - contemplative style
 */
function formatHoroscope(horoscope) {
  const text = horoscope.text || 'the stars are silent';
  return wrapCenter(text, W);
}

/**
 * Assemble the complete morning briefing - contemplative aesthetic
 */
function assembleBriefing(data) {
  const { weather, events, tasks, horoscope, news } = data;
  const dateString = getDateString();

  const sections = [
    '',
    '',
    center('good morning'),
    '',
    center(dateString),
    '',
    '',
    softDivider(),
    '',
    '',
    formatWeather(weather),
    '',
    '',
    softDivider(),
    '',
    '',
    center('· today ·'),
    '',
    formatCalendar(events),
    '',
    '',
    softDivider(),
    '',
    '',
    center('· remember ·'),
    '',
    formatTasks(tasks),
    '',
    '',
    softDivider(),
    '',
    '',
    center('· the world ·'),
    '',
    formatHeadline(news.headlines),
    '',
    '',
    softDivider(),
    '',
    '',
    center(`· ${horoscope.sign.toLowerCase()} ·`),
    '',
    formatHoroscope(horoscope),
    '',
    '',
    '',
    center('*'),
    '',
    center("go gently"),
    '',
    '',
    ''
  ];

  return sections.join('\n');
}

/**
 * Gather all data for the briefing
 */
async function gatherBriefingData(options = {}) {
  const sign = options.sign || DEFAULT_CONFIG.sign;
  const baseUrl = options.baseUrl || 'http://localhost:3000';

  console.log('📋 Gathering briefing data...');

  const [weather, events, tasks, horoscope, news] = await Promise.all([
    (async () => {
      try {
        const client = createWeatherClient();
        return await client.getCurrentWeather();
      } catch (error) {
        console.error('❌ Weather fetch failed:', error.message);
        return { error: true };
      }
    })(),

    (async () => {
      try {
        return await fetchTodayCalendarEvents(baseUrl);
      } catch (error) {
        console.error('❌ Calendar fetch failed:', error.message);
        return [];
      }
    })(),

    (async () => {
      try {
        return await fetchTodoistTasks();
      } catch (error) {
        console.error('❌ Tasks fetch failed:', error.message);
        return [];
      }
    })(),

    fetchHoroscope(sign),
    fetchNews(options.newsLimit)
  ]);

  console.log('✅ Briefing data gathered');

  return { weather, events, tasks, horoscope, news };
}

/**
 * GET /preview
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
 */
async function printBriefing(req, res) {
  try {
    const sign = req.body.sign || req.query.sign || DEFAULT_CONFIG.sign;
    const data = await gatherBriefingData({ sign });
    const briefing = assembleBriefing(data);

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
        message: 'printing your briefing...',
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
    handleError(res, error, 'Failed to print briefing');
  }
}

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
  gatherBriefingData,
  assembleBriefing,
  center,
  wrapCenter,
  softDivider
};
