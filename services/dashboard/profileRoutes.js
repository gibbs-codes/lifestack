/**
 * Profile Service - API Routes
 * Profile management endpoints (mounted at /api/profile)
 */

const express = require('express');
const controller = require('./controller');

const router = express.Router();

/**
 * GET /
 * Get current profile
 *
 * Returns:
 * {
 *   success: true,
 *   data: {
 *     profile: string,
 *     name: string,
 *     description: string,
 *     includes: { ... },
 *     lastChanged: string
 *   }
 * }
 */
router.get('/', controller.getCurrentProfile);

/**
 * POST /
 * Set current profile
 *
 * Body:
 * {
 *   profile: "gallery" | "morning" | "focus" | "work" | "relax" | "default" | ...
 * }
 */
router.post('/', controller.setProfile);

/**
 * GET /history
 * Get profile change history
 */
router.get('/history', controller.getProfileHistory);

/**
 * POST /reset
 * Reset to default profile
 */
router.post('/reset', controller.resetProfile);

/**
 * GET /available
 * Get list of all available profiles
 */
router.get('/available', controller.getAvailableProfiles);

module.exports = router;
