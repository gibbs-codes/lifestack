/**
 * Ollama Service - Controller
 * Request handlers for Ollama LLM API
 */

const { createOllamaClient } = require('./client');

/**
 * GET /health
 * Check Ollama connectivity
 */
async function health(req, res) {
  try {
    const client = createOllamaClient();
    const result = await client.health();

    const statusCode = result.success ? 200 : 503;
    res.status(statusCode).json(result);
  } catch (error) {
    handleError(res, error, 'Failed to check Ollama health');
  }
}

/**
 * GET /models
 * List available Ollama models
 */
async function listModels(req, res) {
  try {
    const client = createOllamaClient();
    const result = await client.listModels();

    if (result.success) {
      res.json(result);
    } else {
      res.status(503).json(result);
    }
  } catch (error) {
    handleError(res, error, 'Failed to list models');
  }
}

/**
 * POST /generate
 * Generate text completion
 * Body: { prompt: string, model?: string, options?: object }
 */
async function generate(req, res) {
  try {
    const { prompt, model, ...options } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: prompt'
      });
    }

    const client = createOllamaClient();
    const result = await client.generate(prompt, { model, ...options });

    if (result.success) {
      res.json(result);
    } else {
      res.status(503).json(result);
    }
  } catch (error) {
    handleError(res, error, 'Failed to generate text');
  }
}

/**
 * POST /chat
 * Chat completion
 * Body: { messages: [{role, content}], model?: string, options?: object }
 */
async function chat(req, res) {
  try {
    const { messages, model, ...options } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: messages (array of {role, content})'
      });
    }

    const client = createOllamaClient();
    const result = await client.chat(messages, { model, ...options });

    if (result.success) {
      res.json(result);
    } else {
      res.status(503).json(result);
    }
  } catch (error) {
    handleError(res, error, 'Failed to chat');
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
  health,
  listModels,
  generate,
  chat
};
