/**
 * n8n Service - API Routes
 * Proxy for n8n API
 */

const express = require('express');
const controller = require('./controller');

const router = express.Router();

/**
 * GET /briefing/print
 * Trigger the briefing print workflow
 * This is a shortcut to call the specific workflow endpoint
 */
router.get('/briefing/print', controller.triggerBriefingPrint);

/**
 * GET /workflows
 * Get all workflows
 */
router.get('/workflows', controller.getWorkflows);

/**
 * GET /workflows/:id
 * Get a specific workflow by ID
 */
router.get('/workflows/:id', controller.getWorkflow);

/**
 * POST /workflows/:id/execute
 * Execute a workflow by ID
 *
 * Body: Optional data to pass to the workflow
 */
router.post('/workflows/:id/execute', controller.executeWorkflow);

/**
 * GET /proxy/*
 * Generic proxy for any n8n GET endpoint
 * Example: /proxy/executions -> n8n's /executions
 */
router.get('/proxy/*', controller.proxyGet);

/**
 * POST /proxy/*
 * Generic proxy for any n8n POST endpoint
 */
router.post('/proxy/*', controller.proxyPost);

/**
 * GET /health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  const n8nConfig = require('../../config/services').n8n;

  res.json({
    success: true,
    service: 'n8n',
    status: 'ok',
    timestamp: new Date().toISOString(),
    config: {
      baseUrl: n8nConfig?.baseUrl || 'http://jamess-mac-mini:5678/api/v1',
      hasApiKey: !!n8nConfig?.apiKey
    }
  });
});

module.exports = router;
