/**
 * Storage module for managing local storage of API key and settings
 */

const STORAGE_KEYS = {
  API_KEY: 'openrouter_api_key',
  MODEL: 'openrouter_model',
  MESSAGES: 'openrouter_messages'
};

/**
 * Get the stored API key
 * @returns {string|null} The stored API key or null
 */
export function getApiKey() {
  return localStorage.getItem(STORAGE_KEYS.API_KEY);
}

/**
 * Save the API key to local storage
 * @param {string} apiKey - The API key to store
 */
export function setApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('Invalid API key');
  }
  localStorage.setItem(STORAGE_KEYS.API_KEY, apiKey.trim());
}

/**
 * Remove the stored API key
 */
export function clearApiKey() {
  localStorage.removeItem(STORAGE_KEYS.API_KEY);
}

/**
 * Check if an API key is stored
 * @returns {boolean} True if an API key exists
 */
export function hasApiKey() {
  const key = getApiKey();
  return key !== null && key.length > 0;
}

/**
 * Get the stored model preference
 * @param {string} defaultModel - Default model if none stored
 * @returns {string} The stored model or default
 */
export function getModel(defaultModel = 'openai/gpt-4o-mini') {
  return localStorage.getItem(STORAGE_KEYS.MODEL) || defaultModel;
}

/**
 * Save the model preference
 * @param {string} model - The model identifier to store
 */
export function setModel(model) {
  if (!model || typeof model !== 'string') {
    throw new Error('Invalid model');
  }
  localStorage.setItem(STORAGE_KEYS.MODEL, model);
}

/**
 * Get stored conversation messages
 * @returns {Array} Array of message objects
 */
export function getMessages() {
  try {
    const messages = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    return messages ? JSON.parse(messages) : [];
  } catch {
    return [];
  }
}

/**
 * Save conversation messages
 * @param {Array} messages - Array of message objects
 */
export function setMessages(messages) {
  if (!Array.isArray(messages)) {
    throw new Error('Messages must be an array');
  }
  localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
}

/**
 * Clear stored messages
 */
export function clearMessages() {
  localStorage.removeItem(STORAGE_KEYS.MESSAGES);
}

/**
 * Clear all stored data
 */
export function clearAll() {
  clearApiKey();
  clearMessages();
  localStorage.removeItem(STORAGE_KEYS.MODEL);
}

export { STORAGE_KEYS };
