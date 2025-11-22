const axios = require('axios');

const client = axios.create({
  baseURL: 'http://localhost:3009/api/v1',
  headers: {
    'Authorization': `Bearer ${process.env.ANYTHINGLLM_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

async function chat(message, workspaceSlug = 'home-assistant') {
  const response = await client.post(`/workspace/${workspaceSlug}/chat`, {
    message: message,
    mode: 'chat'
  });
  
  return response.data.textResponse;
}

async function chatWithContext(message, context) {
  // Inject context into the message
  const contextualMessage = `
Current context:
- Time: ${new Date().toLocaleTimeString()}
- Location: ${context.location.state} ${context.location.zone !== 'none' ? '(' + context.location.zone + ')' : ''}
- Next event: ${context.calendar.next_event?.summary || 'None'}

User question: ${message}
`;
  
  return await chat(contextualMessage);
}

module.exports = { chat, chatWithContext };