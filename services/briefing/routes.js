/**
 * Briefing Service - Routes
 * API endpoints for morning briefing generation and printing
 */

const express = require('express');
const router = express.Router();
const controller = require('./controller');

/**
 * GET /api/briefing/preview
 * Preview the morning briefing without printing
 * Query params:
 *   - sign: Zodiac sign for horoscope (default: Aquarius)
 */
router.get('/preview', controller.previewBriefing);

/**
 * POST /api/briefing/print
 * Generate and print the morning briefing
 * Body/Query params:
 *   - sign: Zodiac sign for horoscope (default: Aquarius)
 */
router.post('/print', controller.printBriefing);

/**
 * GET /api/briefing/print
 * Alternative GET endpoint for easy triggering (e.g., from shortcuts, webhooks)
 */
router.get('/print', async (req, res) => {
  // Forward to POST handler with query params as body
  req.body = { sign: req.query.sign };
  return controller.printBriefing(req, res);
});

/**
 * GET /api/briefing/newspaper
 * Generate LLM-powered newspaper-style briefing (1920s broadsheet)
 * Query params:
 *   - sign: Zodiac sign for horoscope (default: Aquarius)
 */
router.get('/newspaper', controller.generateNewspaperBriefing);

/**
 * GET /api/briefing/newspaper/print
 * Generate and print newspaper-style briefing
 * Query params:
 *   - sign: Zodiac sign for horoscope (default: Aquarius)
 */
router.get('/newspaper/print', controller.printNewspaperBriefing);

module.exports = router;
