/**
 * Poem Service - Controller
 * Generates random poems using Ollama
 */

const { createOllamaClient } = require('../ollama/client');
const { getRandomTopic, getRandomStyle, getTopicFromCategory, TOPICS, STYLES } = require('./topics');

const W = 42;

/**
 * Center text within width
 */
function center(text, width = W) {
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(padding) + text;
}

/**
 * Format poem for thermal printer - centered, breathing room
 */
function formatPoemForPrint(poem, topic, style) {
  // Clean and format the poem
  const lines = poem
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      // If line is too long, it stays left-aligned (wrap would mess up poetry)
      if (line.length <= W) {
        return center(line);
      }
      return line;
    });

  const output = [
    '',
    '',
    center('*'),
    '',
    '',
    ...lines,
    '',
    '',
    center('*'),
    '',
    center(`— on ${topic} —`),
    '',
    ''
  ];

  return output.join('\n');
}

/**
 * Build the prompt for poem generation
 */
function buildPrompt(topic, style) {
  const styleGuides = {
    'haiku': 'Write a haiku (5-7-5 syllables, 3 lines). Traditional, evocative.',
    'short free verse': 'Write a short free verse poem, 4-8 lines. No rhyme required. Evocative imagery.',
    'couplets': 'Write 2-3 rhyming couplets. Simple, musical.',
    'four line verse': 'Write exactly 4 lines. Can rhyme or not. Contemplative.',
    'prose poem': 'Write a tiny prose poem, 2-3 sentences. Poetic but no line breaks needed.'
  };

  return `You are a quiet, contemplative poet. Write a small poem about: "${topic}"

Style: ${styleGuides[style] || styleGuides['short free verse']}

Rules:
- Keep it SHORT (thermal receipt printer, max 42 chars per line)
- Lowercase only
- No titles
- No attribution or signature
- Gentle, introspective tone
- Evoke feeling, not explanation
- Each line should be under 40 characters

Just write the poem, nothing else.`;
}

/**
 * Generate a poem
 */
async function generatePoem(options = {}) {
  const { category, topic: specificTopic, style: specificStyle } = options;

  // Get random topic and style
  const { topic } = category ? getTopicFromCategory(category) :
                    specificTopic ? { topic: specificTopic } :
                    getRandomTopic();
  const style = specificStyle || getRandomStyle();

  console.log(`📝 Generating ${style} about "${topic}"...`);

  const client = createOllamaClient();
  const prompt = buildPrompt(topic, style);

  const result = await client.generate(prompt);

  if (!result.success) {
    return {
      success: false,
      error: result.error || 'Failed to generate poem'
    };
  }

  // Clean up the poem
  let poem = result.text
    .trim()
    .toLowerCase()
    .replace(/^["']|["']$/g, '') // Remove wrapping quotes
    .replace(/^title:.*\n/i, '') // Remove title if present
    .replace(/^poem:.*\n/i, ''); // Remove "poem:" if present

  return {
    success: true,
    poem,
    topic,
    style,
    formatted: formatPoemForPrint(poem, topic, style)
  };
}

/**
 * GET /preview
 * Generate a poem without printing
 */
async function previewPoem(req, res) {
  try {
    const { category, topic, style } = req.query;
    const result = await generatePoem({ category, topic, style });

    if (result.success) {
      res.json({
        success: true,
        poem: result.poem,
        topic: result.topic,
        style: result.style,
        formatted: result.formatted
      });
    } else {
      res.status(503).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    handleError(res, error, 'Failed to generate poem');
  }
}

/**
 * GET or POST /print
 * Generate and print a poem
 */
async function printPoem(req, res) {
  try {
    const category = req.body?.category || req.query.category;
    const topic = req.body?.topic || req.query.topic;
    const style = req.body?.style || req.query.style;

    const result = await generatePoem({ category, topic, style });

    if (!result.success) {
      return res.status(503).json({
        success: false,
        error: result.error
      });
    }

    // Send to printer
    const { print } = require('../print/controller');

    const printReq = {
      body: {
        text: result.formatted,
        align: 'left',
        cut: true,
        feed: 3
      }
    };

    let printSuccess = false;
    let printError = null;

    const printRes = {
      json: (r) => { printSuccess = r.success; },
      status: () => ({
        json: (r) => { printError = r.error; }
      })
    };

    await print(printReq, printRes);

    if (printSuccess) {
      res.json({
        success: true,
        message: 'printing your poem...',
        poem: result.poem,
        topic: result.topic,
        style: result.style
      });
    } else {
      res.status(500).json({
        success: false,
        error: printError || 'Failed to send to printer',
        poem: result.poem,
        topic: result.topic,
        style: result.style
      });
    }
  } catch (error) {
    handleError(res, error, 'Failed to print poem');
  }
}

/**
 * GET /topics
 * List available topics and categories
 */
function listTopics(req, res) {
  res.json({
    success: true,
    categories: Object.keys(TOPICS),
    styles: STYLES,
    topics: TOPICS
  });
}

/**
 * GET /random
 * Get a random topic (without generating poem)
 */
function randomTopic(req, res) {
  const { category } = req.query;
  const result = category ? getTopicFromCategory(category) : getRandomTopic();
  const style = getRandomStyle();

  res.json({
    success: true,
    ...result,
    style
  });
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
  previewPoem,
  printPoem,
  listTopics,
  randomTopic,
  generatePoem
};
