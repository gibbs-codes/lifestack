/**
 * Print Service - Controller
 * Handles thermal receipt printer communication via ESC/POS
 */

const net = require('net');

// Printer configuration from environment
const PRINTER_IP = process.env.PRINTER_IP || '192.168.1.114';
const PRINTER_PORT = parseInt(process.env.PRINTER_PORT, 10) || 9100;

// ESC/POS command bytes
const ESC_POS = {
  INIT: Buffer.from([0x1B, 0x40]),                    // Initialize printer
  ALIGN_LEFT: Buffer.from([0x1B, 0x61, 0x00]),        // Left alignment
  ALIGN_CENTER: Buffer.from([0x1B, 0x61, 0x01]),      // Center alignment
  ALIGN_RIGHT: Buffer.from([0x1B, 0x61, 0x02]),       // Right alignment
  CUT: Buffer.from([0x1D, 0x56, 0x42, 0x03])          // Partial cut with feed
};

/**
 * Get alignment command buffer
 * @param {string} align - Alignment: "left", "center", or "right"
 * @returns {Buffer} ESC/POS alignment command
 */
function getAlignmentCommand(align) {
  switch (align) {
    case 'center':
      return ESC_POS.ALIGN_CENTER;
    case 'right':
      return ESC_POS.ALIGN_RIGHT;
    case 'left':
    default:
      return ESC_POS.ALIGN_LEFT;
  }
}

/**
 * Sanitize text for thermal printer compatibility
 * Replaces Unicode characters with ASCII equivalents
 * @param {string} text - Input text
 * @returns {string} Sanitized text
 */
function sanitizeForPrinter(text) {
  return text
    .replace(/°/g, 'deg')    // Degree symbol
    .replace(/'/g, "'")      // Smart quotes
    .replace(/'/g, "'")
    .replace(/"/g, '"')
    .replace(/"/g, '"')
    .replace(/—/g, '--')     // Em dash
    .replace(/–/g, '-')      // En dash
    .replace(/…/g, '...')    // Ellipsis
    .replace(/[^\x00-\x7F]/g, ''); // Remove any remaining non-ASCII
}

/**
 * Build ESC/POS payload for printing
 * @param {Object} options - Print options
 * @param {string} options.text - Text to print
 * @param {string} options.align - Alignment
 * @param {boolean} options.cut - Whether to cut paper
 * @param {number} options.feed - Number of newlines before cut
 * @returns {Buffer} Complete ESC/POS payload
 */
function buildPayload({ text, align = 'left', cut = true, feed = 3 }) {
  const sanitizedText = sanitizeForPrinter(text);
  const parts = [
    ESC_POS.INIT,
    getAlignmentCommand(align),
    Buffer.from(sanitizedText, 'utf8'),
    Buffer.from('\n'.repeat(feed), 'utf8')
  ];

  if (cut) {
    parts.push(ESC_POS.CUT);
  }

  return Buffer.concat(parts);
}

/**
 * Send data to printer via TCP
 * @param {Buffer} payload - ESC/POS payload
 * @returns {Promise<void>}
 */
function sendToPrinter(payload) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let connected = false;

    socket.setTimeout(5000);

    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('Connection timeout'));
    });

    socket.on('error', (err) => {
      if (!connected) {
        reject(new Error(`Failed to connect to printer: ${err.message}`));
      } else {
        reject(new Error(`Printer communication error: ${err.message}`));
      }
    });

    socket.connect(PRINTER_PORT, PRINTER_IP, () => {
      connected = true;
      console.log(`🖨️  Connected to printer at ${PRINTER_IP}:${PRINTER_PORT}`);

      socket.write(payload, (err) => {
        if (err) {
          socket.destroy();
          reject(new Error(`Failed to write to printer: ${err.message}`));
        } else {
          socket.end(() => {
            console.log('🖨️  Print job sent successfully');
            resolve();
          });
        }
      });
    });
  });
}

/**
 * POST /
 * Print text to thermal printer
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function print(req, res) {
  try {
    const { text, align = 'left', cut = true, feed = 3 } = req.body;

    // Validate required field
    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: text'
      });
    }

    // Validate align
    if (align && !['left', 'center', 'right'].includes(align)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid align value. Must be "left", "center", or "right"'
      });
    }

    // Validate feed
    const feedNum = typeof feed === 'number' ? feed : parseInt(feed, 10);
    if (isNaN(feedNum) || feedNum < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid feed value. Must be a non-negative number'
      });
    }

    // Build and send payload
    const payload = buildPayload({
      text,
      align,
      cut: cut !== false,
      feed: feedNum
    });

    await sendToPrinter(payload);

    res.json({ success: true });

  } catch (error) {
    handleError(res, error, 'Failed to print');
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

  res.status(500).json({
    success: false,
    error: error.message
  });
}

module.exports = {
  print
};
