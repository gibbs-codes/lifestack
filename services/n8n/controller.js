/**
 * n8n Service - Controller
 * Handles n8n API requests
 */

const { createN8nClient } = require('./client');

// Lazy-loaded client instance
let client = null;

/**
 * Get or create the n8n client
 * @returns {N8nClient} n8n client instance
 */
function getClient() {
  if (!client) {
    client = createN8nClient();
  }
  return client;
}

/**
 * GET /briefing/print
 * Trigger the briefing print workflow
 */
async function triggerBriefingPrint(req, res) {
  try {
    const n8n = getClient();
    const result = await n8n.triggerBriefingPrint();

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    handleError(res, error, 'Failed to trigger briefing print');
  }
}

/**
 * GET /workflows
 * Get all workflows
 */
async function getWorkflows(req, res) {
  try {
    const n8n = getClient();
    const result = await n8n.getWorkflows();

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    handleError(res, error, 'Failed to get workflows');
  }
}

/**
 * GET /workflows/:id
 * Get a specific workflow
 */
async function getWorkflow(req, res) {
  try {
    const { id } = req.params;
    const n8n = getClient();
    const result = await n8n.getWorkflow(id);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    handleError(res, error, 'Failed to get workflow');
  }
}

/**
 * POST /workflows/:id/execute
 * Execute a workflow
 */
async function executeWorkflow(req, res) {
  try {
    const { id } = req.params;
    const data = req.body || {};
    const n8n = getClient();
    const result = await n8n.executeWorkflow(id, data);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    handleError(res, error, 'Failed to execute workflow');
  }
}

/**
 * GET /proxy/*
 * Generic proxy for any n8n GET endpoint
 */
async function proxyGet(req, res) {
  try {
    const path = '/' + req.params[0];
    const n8n = getClient();
    const result = await n8n.get(path);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    handleError(res, error, `Failed to proxy GET ${req.params[0]}`);
  }
}

/**
 * POST /proxy/*
 * Generic proxy for any n8n POST endpoint
 */
async function proxyPost(req, res) {
  try {
    const path = '/' + req.params[0];
    const data = req.body || {};
    const n8n = getClient();
    const result = await n8n.post(path, data);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    handleError(res, error, `Failed to proxy POST ${req.params[0]}`);
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

  const status = error.status || 500;

  res.status(status).json({
    success: false,
    error: error.message || message
  });
}

module.exports = {
  triggerBriefingPrint,
  getWorkflows,
  getWorkflow,
  executeWorkflow,
  proxyGet,
  proxyPost
};
