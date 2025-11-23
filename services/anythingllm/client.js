const axios = require('axios');

const client = axios.create({
  // Change this line - point to your Mac Mini instead of localhost
  baseURL: process.env.ANYTHINGLLM_URL || 'http://jamess-mac-mini.local:3009/api/v1',
  headers: {
    'Authorization': `Bearer ${process.env.ANYTHINGLLM_API_KEY}`,
    'Content-Type': 'application/json'
  },
  timeout: 10000 // Add timeout
});

async function chat(message, workspaceSlug = null) {
  const slug = workspaceSlug || process.env.ANYTHINGLLM_WORKSPACE_SLUG || 'default';
  
  const response = await client.post(`/workspace/${slug}/chat`, {
    message: message,
    mode: 'chat'
  });
  
  return response.data.textResponse;
}

async function chatWithContext(message, context) {
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