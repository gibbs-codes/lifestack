/**
 * Ollama Service - Main Entry Point
 * Local LLM API integration via Ollama
 */

const router = require('./routes');
const { createOllamaClient } = require('./client');

module.exports = {
  router,
  createOllamaClient
};
