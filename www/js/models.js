/**
 * Models module for fetching and caching OpenRouter models
 * Cordova-compatible version
 */

const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

const STORAGE_KEYS = {
  MODELS_CACHE: 'openrouter_models_cache',
  MODELS_CACHE_TIMESTAMP: 'openrouter_models_cache_timestamp'
};

/**
 * Get the appropriate HTTP-Referer header value
 * @returns {string} The referer value
 */
function getReferer() {
  if (window.cordova) {
    return 'https://openrouter-chat-app.local';
  }
  return window.location.origin || 'https://openrouter-chat-app.local';
}

/**
 * Free models available without API key (curated list)
 * These are models with :free suffix or known free tier
 */
export const FREE_MODELS = [
  {
    id: 'google/gemini-2.0-flash-exp:free',
    name: 'Gemini 2.0 Flash Experimental',
    context_length: 1048576,
    pricing: { prompt: '0', completion: '0' },
    description: 'Google Gemini 2.0 Flash - fast and free experimental model',
    isFree: true
  },
  {
    id: 'google/gemma-3n-e4b-it:free',
    name: 'Gemma 3N E4B',
    context_length: 32000,
    pricing: { prompt: '0', completion: '0' },
    description: 'Google Gemma 3N - compact and efficient free model',
    isFree: true
  },
  {
    id: 'meta-llama/llama-3.3-8b-instruct:free',
    name: 'Llama 3.3 8B Instruct',
    context_length: 131072,
    pricing: { prompt: '0', completion: '0' },
    description: 'Meta Llama 3.3 8B - powerful open source model',
    isFree: true
  },
  {
    id: 'mistralai/mistral-small-3.1-24b-instruct:free',
    name: 'Mistral Small 3.1 24B',
    context_length: 96000,
    pricing: { prompt: '0', completion: '0' },
    description: 'Mistral Small 3.1 - excellent reasoning capabilities',
    isFree: true
  },
  {
    id: 'qwen/qwen3-4b-04-28:free',
    name: 'Qwen3 4B',
    context_length: 40960,
    pricing: { prompt: '0', completion: '0' },
    description: 'Alibaba Qwen3 4B - compact multilingual model',
    isFree: true
  },
  {
    id: 'deepseek/deepseek-r1-0528:free',
    name: 'DeepSeek R1',
    context_length: 163840,
    pricing: { prompt: '0', completion: '0' },
    description: 'DeepSeek R1 - advanced reasoning model',
    isFree: true
  },
  {
    id: 'deepseek/deepseek-r1-distill-llama-70b:free',
    name: 'DeepSeek R1 Distill Llama 70B',
    context_length: 131072,
    pricing: { prompt: '0', completion: '0' },
    description: 'DeepSeek R1 distilled into Llama 70B architecture',
    isFree: true
  },
  {
    id: 'microsoft/phi-4:free',
    name: 'Phi-4',
    context_length: 16384,
    pricing: { prompt: '0', completion: '0' },
    description: 'Microsoft Phi-4 - small but capable model',
    isFree: true
  },
  {
    id: 'nvidia/llama-3.1-nemotron-70b-instruct:free',
    name: 'Nemotron 70B Instruct',
    context_length: 131072,
    pricing: { prompt: '0', completion: '0' },
    description: 'NVIDIA Nemotron - optimized Llama 3.1 70B',
    isFree: true
  },
  {
    id: 'tngtech/deepseek-r1t2-chimera:free',
    name: 'DeepSeek R1T2 Chimera',
    context_length: 163840,
    pricing: { prompt: '0', completion: '0' },
    description: 'TNG Tech Chimera - experimental creative model',
    isFree: true
  }
];

/**
 * Sort options for models
 */
export const SortOption = {
  NAME_ASC: 'name_asc',
  NAME_DESC: 'name_desc',
  DATE_NEWEST: 'date_newest',
  DATE_OLDEST: 'date_oldest',
  CONTEXT_LENGTH: 'context_length',
  PRICE_LOW: 'price_low',
  PRICE_HIGH: 'price_high'
};

/**
 * Fetch models from OpenRouter API
 * @param {string} apiKey - OpenRouter API key
 * @returns {Promise<Array>} Array of model objects
 */
export async function fetchModelsFromAPI(apiKey) {
  if (!apiKey) {
    throw new Error('API key is required to fetch models');
  }

  const response = await fetch(OPENROUTER_MODELS_URL, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': getReferer(),
      'X-Title': 'OpenRouter Chat Mobile'
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Get cached models from localStorage
 * @returns {{models: Array, timestamp: number}|null} Cached data or null
 */
export function getCachedModels() {
  try {
    const modelsJson = localStorage.getItem(STORAGE_KEYS.MODELS_CACHE);
    const timestamp = localStorage.getItem(STORAGE_KEYS.MODELS_CACHE_TIMESTAMP);

    if (!modelsJson || !timestamp) {
      return null;
    }

    return {
      models: JSON.parse(modelsJson),
      timestamp: parseInt(timestamp, 10)
    };
  } catch {
    return null;
  }
}

/**
 * Save models to cache
 * @param {Array} models - Array of model objects
 */
export function setCachedModels(models) {
  const timestamp = Date.now();
  localStorage.setItem(STORAGE_KEYS.MODELS_CACHE, JSON.stringify(models));
  localStorage.setItem(STORAGE_KEYS.MODELS_CACHE_TIMESTAMP, timestamp.toString());
}

/**
 * Clear the models cache
 */
export function clearModelsCache() {
  localStorage.removeItem(STORAGE_KEYS.MODELS_CACHE);
  localStorage.removeItem(STORAGE_KEYS.MODELS_CACHE_TIMESTAMP);
}

/**
 * Check if the cache is still valid (less than 24 hours old)
 * @returns {boolean} True if cache is valid
 */
export function isCacheValid() {
  const cached = getCachedModels();
  if (!cached) {
    return false;
  }

  const age = Date.now() - cached.timestamp;
  return age < CACHE_DURATION_MS;
}

/**
 * Get cache age in a human-readable format
 * @returns {string|null} Human-readable cache age or null if no cache
 */
export function getCacheAge() {
  const cached = getCachedModels();
  if (!cached) {
    return null;
  }

  const ageMs = Date.now() - cached.timestamp;
  const seconds = Math.floor(ageMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

/**
 * Get models - uses cache if valid, otherwise fetches from API
 * @param {string} apiKey - OpenRouter API key
 * @param {boolean} forceRefresh - Force refresh from API
 * @returns {Promise<{models: Array, fromCache: boolean, cacheAge: string|null}>}
 */
export async function getModels(apiKey, forceRefresh = false) {
  if (!forceRefresh && isCacheValid()) {
    const cached = getCachedModels();
    return {
      models: cached.models,
      fromCache: true,
      cacheAge: getCacheAge()
    };
  }

  const models = await fetchModelsFromAPI(apiKey);
  setCachedModels(models);

  return {
    models,
    fromCache: false,
    cacheAge: getCacheAge()
  };
}

/**
 * Sort models by the specified option
 * @param {Array} models - Array of model objects
 * @param {string} sortOption - Sort option from SortOption enum
 * @returns {Array} Sorted array of models
 */
export function sortModels(models, sortOption) {
  const sorted = [...models];

  switch (sortOption) {
    case SortOption.NAME_ASC:
      return sorted.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));

    case SortOption.NAME_DESC:
      return sorted.sort((a, b) => (b.name || b.id).localeCompare(a.name || a.id));

    case SortOption.DATE_NEWEST:
      return sorted.sort((a, b) => (b.created || 0) - (a.created || 0));

    case SortOption.DATE_OLDEST:
      return sorted.sort((a, b) => (a.created || 0) - (b.created || 0));

    case SortOption.CONTEXT_LENGTH:
      return sorted.sort((a, b) => (b.context_length || 0) - (a.context_length || 0));

    case SortOption.PRICE_LOW:
      return sorted.sort((a, b) => {
        const priceA = parseFloat(a.pricing?.prompt || '0');
        const priceB = parseFloat(b.pricing?.prompt || '0');
        return priceA - priceB;
      });

    case SortOption.PRICE_HIGH:
      return sorted.sort((a, b) => {
        const priceA = parseFloat(a.pricing?.prompt || '0');
        const priceB = parseFloat(b.pricing?.prompt || '0');
        return priceB - priceA;
      });

    default:
      return sorted;
  }
}

/**
 * Format model for display in dropdown
 * @param {Object} model - Model object from API
 * @returns {Object} Formatted model with display info
 */
export function formatModelForDisplay(model) {
  const contextK = model.context_length ? Math.round(model.context_length / 1000) : null;
  const promptPrice = model.pricing?.prompt ? parseFloat(model.pricing.prompt) * 1000000 : null;

  let details = [];
  if (contextK) {
    details.push(`${contextK}k ctx`);
  }
  if (promptPrice !== null) {
    details.push(`$${promptPrice.toFixed(2)}/M tokens`);
  }

  return {
    id: model.id,
    name: model.name || model.id,
    description: model.description || '',
    contextLength: model.context_length,
    created: model.created,
    pricing: model.pricing,
    detailsText: details.length > 0 ? details.join(' | ') : '',
    createdDate: model.created ? new Date(model.created * 1000).toLocaleDateString() : null
  };
}

/**
 * Filter models by search query
 * @param {Array} models - Array of model objects
 * @param {string} query - Search query
 * @returns {Array} Filtered models
 */
export function filterModels(models, query) {
  if (!query || query.trim() === '') {
    return models;
  }

  const lowerQuery = query.toLowerCase().trim();
  return models.filter(model => {
    const name = (model.name || '').toLowerCase();
    const id = (model.id || '').toLowerCase();
    const description = (model.description || '').toLowerCase();

    return name.includes(lowerQuery) ||
           id.includes(lowerQuery) ||
           description.includes(lowerQuery);
  });
}

/**
 * Get free models (no API key required)
 * @returns {Array} Array of free model objects
 */
export function getFreeModels() {
  return [...FREE_MODELS];
}

/**
 * Check if a model is free
 * @param {Object} model - Model object
 * @returns {boolean} True if model is free
 */
export function isModelFree(model) {
  if (model.isFree) return true;
  if (model.id?.endsWith(':free')) return true;
  const promptPrice = parseFloat(model.pricing?.prompt || '1');
  const completionPrice = parseFloat(model.pricing?.completion || '1');
  return promptPrice === 0 && completionPrice === 0;
}

export { STORAGE_KEYS as MODELS_STORAGE_KEYS, CACHE_DURATION_MS };
