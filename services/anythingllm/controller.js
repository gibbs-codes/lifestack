const client = require('./client');

async function processVoiceCommand(message) {
  // Send to AnythingLLM
  const response = await client.chat(message);

  return response;
}

module.exports = { processVoiceCommand };