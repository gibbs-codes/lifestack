const express = require('express');
const router = express.Router();
const controller = require('./controller');

router.post('/voice', async (req, res, next) => {
  try {
    const { message } = req.body;
    const response = await controller.processVoiceCommand(message);
    res.json({ success: true, data: { response } });
  } catch (error) {
    next(error);
  }
});

module.exports = router;