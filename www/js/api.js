/**
 * OpenRouter API client with streaming support
 * Cordova-compatible version
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Get the appropriate HTTP-Referer header value
 * For Cordova apps, we use the app identifier instead of window.location.origin
 * @returns {string} The referer value
 */
function getReferer() {
  // In Cordova, window.location.origin is 'file://' which is not valid
  // Use the app identifier or a valid URL
  if (window.cordova) {
    return 'https://openrouter-chat-app.local';
  }
  return window.location.origin || 'https://openrouter-chat-app.local';
}

/**
 * Create a chat completion request with streaming
 * @param {Object} options - Request options
 * @param {string} options.apiKey - OpenRouter API key
 * @param {string} options.model - Model identifier
 * @param {Array} options.messages - Array of message objects
 * @param {Function} options.onChunk - Callback for each streamed chunk
 * @param {Function} options.onComplete - Callback when streaming completes
 * @param {Function} options.onError - Callback for errors
 * @param {AbortSignal} options.signal - Optional abort signal
 * @returns {Promise<void>}
 */
export async function streamChatCompletion({
  apiKey,
  model,
  messages,
  onChunk,
  onComplete,
  onError,
  signal
}) {
  if (!apiKey) {
    throw new Error('API key is required');
  }
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    throw new Error('Messages array is required');
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': getReferer(),
      'X-Title': 'OpenRouter Chat Mobile'
    },
    body: JSON.stringify({
      model: model || 'openai/gpt-4o-mini',
      messages: messages,
      stream: true
    }),
    signal
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(errorMessage);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullContent = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();

        if (!trimmedLine || trimmedLine === 'data: [DONE]') {
          continue;
        }

        if (trimmedLine.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmedLine.slice(6));
            const content = data.choices?.[0]?.delta?.content;

            if (content) {
              fullContent += content;
              if (onChunk) {
                onChunk(content, fullContent);
              }
            }
          } catch (parseError) {
            // Skip malformed JSON chunks
            console.warn('Failed to parse SSE chunk:', parseError);
          }
        }
      }
    }

    if (onComplete) {
      onComplete(fullContent);
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      if (onComplete) {
        onComplete(fullContent);
      }
    } else {
      if (onError) {
        onError(error);
      } else {
        throw error;
      }
    }
  }
}

/**
 * Parse SSE data line
 * @param {string} line - The SSE data line
 * @returns {Object|null} Parsed data or null
 */
export function parseSSELine(line) {
  const trimmedLine = line.trim();

  if (!trimmedLine || trimmedLine === 'data: [DONE]') {
    return null;
  }

  if (trimmedLine.startsWith('data: ')) {
    try {
      return JSON.parse(trimmedLine.slice(6));
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Format messages for the API
 * @param {Array} messages - Array of message objects
 * @returns {Array} Formatted messages
 */
export function formatMessages(messages) {
  return messages.map(msg => ({
    role: msg.role,
    content: msg.content
  }));
}

export { OPENROUTER_API_URL, getReferer };
