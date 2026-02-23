/**
 * Poem Service - Routes
 * API endpoints for random poem generation
 */

const express = require('express');
const router = express.Router();
const controller = require('./controller');

/**
 * GET /api/poem/preview
 * Generate a poem without printing
 * Query params:
 *   - category: (optional) topic category
 *   - topic: (optional) specific topic
 *   - style: (optional) poem style
 */
router.get('/preview', controller.previewPoem);

/**
 * GET /api/poem/print
 * Generate and print a poem (easy trigger)
 */
router.get('/print', controller.printPoem);

/**
 * POST /api/poem/print
 * Generate and print a poem
 */
router.post('/print', controller.printPoem);

/**
 * GET /api/poem/topics
 * List all available topics and categories
 */
router.get('/topics', controller.listTopics);

/**
 * GET /api/poem/random
 * Get a random topic suggestion
 */
router.get('/random', controller.randomTopic);

module.exports = router;
