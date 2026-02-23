/**
 * Ollama API Client
 * Wrapper for local Ollama LLM API
 */

const axios = require('axios');
const ollamaConfig = require('../../config/services').ollama;

/**
 * Ollama API Client Class
 */
class OllamaClient {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || ollamaConfig?.baseUrl || 'http://localhost:11434';
    this.model = config.model || ollamaConfig?.model || 'llama3';
    this.timeout = config.timeout || 60000; // LLMs can be slow
  }

  /**
   * Generate text completion
   * @param {string} prompt - The prompt to send
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generated response
   */
  async generate(prompt, options = {}) {
    try {
      console.log(`🦙 Ollama: Generating with ${options.model || this.model}...`);

      const response = await axios.post(
        `${this.baseUrl}/api/generate`,
        {
          model: options.model || this.model,
          prompt,
          stream: false,
          ...options
        },
        { timeout: this.timeout }
      );

      return {
        success: true,
        text: response.data.response,
        model: response.data.model,
        totalDuration: response.data.total_duration,
        evalCount: response.data.eval_count
      };
    } catch (error) {
      return this._handleError(error, 'Failed to generate text');
    }
  }

  /**
   * Chat completion (for conversation-style prompts)
   * @param {Array} messages - Array of {role, content} messages
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generated response
   */
  async chat(messages, options = {}) {
    try {
      console.log(`🦙 Ollama: Chat with ${options.model || this.model}...`);

      const response = await axios.post(
        `${this.baseUrl}/api/chat`,
        {
          model: options.model || this.model,
          messages,
          stream: false,
          ...options
        },
        { timeout: this.timeout }
      );

      return {
        success: true,
        text: response.data.message?.content,
        role: response.data.message?.role,
        model: response.data.model,
        totalDuration: response.data.total_duration
      };
    } catch (error) {
      return this._handleError(error, 'Failed to chat');
    }
  }

  /**
   * List available models
   * @returns {Promise<Object>} List of models
   */
  async listModels() {
    try {
      console.log('🦙 Ollama: Listing models...');

      const response = await axios.get(
        `${this.baseUrl}/api/tags`,
        { timeout: 10000 }
      );

      return {
        success: true,
        models: response.data.models || []
      };
    } catch (error) {
      return this._handleError(error, 'Failed to list models');
    }
  }

  /**
   * Check if Ollama is reachable
   * @returns {Promise<Object>} Health status
   */
  async health() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/tags`,
        { timeout: 5000 }
      );

      return {
        success: true,
        status: 'healthy',
        baseUrl: this.baseUrl,
        modelsAvailable: response.data.models?.length || 0
      };
    } catch (error) {
      return {
        success: false,
        status: 'unreachable',
        baseUrl: this.baseUrl,
        error: error.message
      };
    }
  }

  /**
   * Handle API errors
   * @param {Error} error - Error object
   * @param {string} message - Context message
   * @returns {Object} Error response
   * @private
   */
  _handleError(error, message) {
    console.error(`❌ Ollama Error: ${message}`, error.message);

    if (error.code === 'ECONNREFUSED') {
      return {
        success: false,
        error: `Cannot connect to Ollama at ${this.baseUrl}. Is Ollama running?`,
        code: 'CONNECTION_REFUSED'
      };
    }

    if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      return {
        success: false,
        error: 'Ollama request timed out. The model may be loading or the prompt is too long.',
        code: 'TIMEOUT'
      };
    }

    if (error.response?.status === 404) {
      return {
        success: false,
        error: `Model "${this.model}" not found. Run: ollama pull ${this.model}`,
        code: 'MODEL_NOT_FOUND'
      };
    }

    return {
      success: false,
      error: error.message,
      code: 'UNKNOWN'
    };
  }
}

/**
 * Create an Ollama client instance
 * @param {Object} config - Optional config override
 * @returns {OllamaClient} Ollama client instance
 */
function createOllamaClient(config = {}) {
  return new OllamaClient(config);
}

module.exports = {
  OllamaClient,
  createOllamaClient
};
