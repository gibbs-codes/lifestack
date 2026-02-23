/**
 * Ollama Service - Routes
 * API endpoints for Ollama LLM
 */

const express = require('express');
const router = express.Router();
const controller = require('./controller');

/**
 * GET /api/ollama/health
 * Check if Ollama is reachable
 */
router.get('/health', controller.health);

/**
 * GET /api/ollama/models
 * List available models
 */
router.get('/models', controller.listModels);

/**
 * POST /api/ollama/generate
 * Generate text completion
 */
router.post('/generate', controller.generate);

/**
 * POST /api/ollama/chat
 * Chat completion
 */
router.post('/chat', controller.chat);

module.exports = router;
