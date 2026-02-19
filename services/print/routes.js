/**
 * Print Service - API Routes
 * Thermal receipt printer text printing
 */

const express = require('express');
const controller = require('./controller');

const router = express.Router();

/**
 * POST /
 * Print text to thermal printer
 *
 * Body:
 * {
 *   text: string (required) - Plain text content to print
 *   align: string (optional, default "left") - "left", "center", or "right"
 *   cut: boolean (optional, default true) - Whether to cut paper after printing
 *   feed: number (optional, default 3) - Number of newlines before cutting
 * }
 *
 * Returns:
 * { success: true } on success
 * { success: false, error: "..." } on failure
 */
router.post('/', controller.print);

/**
 * GET /health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'print',
    status: 'ok',
    timestamp: new Date().toISOString(),
    config: {
      printerIp: process.env.PRINTER_IP || '192.168.1.114',
      printerPort: process.env.PRINTER_PORT || '9100'
    }
  });
});

module.exports = router;
