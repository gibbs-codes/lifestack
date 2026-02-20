/**
 * n8n API Client
 * Wrapper for n8n API v1
 */

const { createApiClient } = require('../../shared/utils/apiClient');
const n8nConfig = require('../../config/services').n8n;

/**
 * n8n API Client Class
 */
class N8nClient {
  constructor(apiKey = null, baseUrl = null) {
    this.apiKey = apiKey || n8nConfig?.apiKey;
    this.baseUrl = baseUrl || n8nConfig?.baseUrl || 'http://jamess-mac-mini:5678/api/v1';

    if (!this.apiKey) {
      throw new Error('n8n API key is required. Please set N8N_API_KEY in environment variables.');
    }

    // Create configured API client
    this.client = createApiClient({
      baseURL: this.baseUrl,
      headers: {
        'X-N8N-API-KEY': this.apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  /**
   * Trigger the briefing print workflow
   * @returns {Promise<Object>} Workflow execution result
   */
  async triggerBriefingPrint() {
    try {
      console.log('📋 Triggering n8n briefing print workflow');

      const response = await this.client.get('/workflows/briefing/print');
      return response.data;

    } catch (error) {
      this._handleError(error, 'Failed to trigger briefing print workflow');
    }
  }

  /**
   * Get all workflows
   * @returns {Promise<Object>} List of workflows
   */
  async getWorkflows() {
    try {
      console.log('📋 Fetching n8n workflows');

      const response = await this.client.get('/workflows');
      return response.data;

    } catch (error) {
      this._handleError(error, 'Failed to get workflows');
    }
  }

  /**
   * Get a specific workflow by ID
   * @param {string} workflowId - Workflow ID
   * @returns {Promise<Object>} Workflow details
   */
  async getWorkflow(workflowId) {
    try {
      console.log(`📋 Fetching n8n workflow: ${workflowId}`);

      const response = await this.client.get(`/workflows/${workflowId}`);
      return response.data;

    } catch (error) {
      this._handleError(error, `Failed to get workflow ${workflowId}`);
    }
  }

  /**
   * Execute a workflow by ID
   * @param {string} workflowId - Workflow ID
   * @param {Object} data - Optional data to pass to the workflow
   * @returns {Promise<Object>} Execution result
   */
  async executeWorkflow(workflowId, data = {}) {
    try {
      console.log(`▶️  Executing n8n workflow: ${workflowId}`);

      const response = await this.client.post(`/workflows/${workflowId}/execute`, data);
      return response.data;

    } catch (error) {
      this._handleError(error, `Failed to execute workflow ${workflowId}`);
    }
  }

  /**
   * Make a generic GET request to any n8n endpoint
   * @param {string} path - API path (relative to base URL)
   * @returns {Promise<Object>} Response data
   */
  async get(path) {
    try {
      console.log(`📋 n8n GET: ${path}`);

      const response = await this.client.get(path);
      return response.data;

    } catch (error) {
      this._handleError(error, `Failed to GET ${path}`);
    }
  }

  /**
   * Make a generic POST request to any n8n endpoint
   * @param {string} path - API path (relative to base URL)
   * @param {Object} data - Request body
   * @returns {Promise<Object>} Response data
   */
  async post(path, data = {}) {
    try {
      console.log(`📋 n8n POST: ${path}`);

      const response = await this.client.post(path, data);
      return response.data;

    } catch (error) {
      this._handleError(error, `Failed to POST ${path}`);
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
    console.error(`❌ n8n API Error: ${message}`, error.message);

    if (error.response) {
      const status = error.response.status;
      const n8nError = error.response.data;

      if (status === 401) {
        const formattedError = new Error('Invalid or expired n8n API key');
        formattedError.status = 401;
        throw formattedError;
      }

      if (status === 403) {
        const formattedError = new Error('Insufficient permissions for this n8n resource');
        formattedError.status = 403;
        throw formattedError;
      }

      if (status === 404) {
        const formattedError = new Error('n8n resource not found');
        formattedError.status = 404;
        throw formattedError;
      }

      if (status === 429) {
        const formattedError = new Error('n8n API rate limit exceeded');
        formattedError.status = 429;
        throw formattedError;
      }

      const formattedError = new Error(n8nError?.message || message);
      formattedError.status = status;
      formattedError.data = n8nError;
      throw formattedError;
    }

    const formattedError = new Error(message);
    formattedError.status = 500;
    formattedError.originalError = error.message;
    throw formattedError;
  }
}

/**
 * Create an n8n client instance
 * @param {string} apiKey - Optional API key override
 * @param {string} baseUrl - Optional base URL override
 * @returns {N8nClient} n8n client instance
 */
function createN8nClient(apiKey = null, baseUrl = null) {
  return new N8nClient(apiKey, baseUrl);
}

module.exports = {
  N8nClient,
  createN8nClient
};
