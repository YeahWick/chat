/**
 * OpenRouter Models API and Caching Module
 * Fetches available models from OpenRouter API and caches them locally
 */

const MODELS_CACHE_KEY = 'openrouter_models_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';

/**
 * Fetch models from OpenRouter API
 * @param {string} apiKey - OpenRouter API key
 * @returns {Promise<Array>} Array of model objects
 */
export async function fetchModels(apiKey) {
  const response = await fetch(OPENROUTER_MODELS_URL, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Get cached models from localStorage
 * @returns {Object|null} Cached data object with models array and timestamp, or null if cache is invalid/expired
 */
export function getCachedModels() {
  try {
    const cached = localStorage.getItem(MODELS_CACHE_KEY);
    if (!cached) {
      return null;
    }

    const cacheData = JSON.parse(cached);
    const now = Date.now();

    // Check if cache has expired
    if (now - cacheData.timestamp > CACHE_DURATION) {
      localStorage.removeItem(MODELS_CACHE_KEY);
      return null;
    }

    return cacheData;
  } catch (error) {
    console.error('Error reading models cache:', error);
    return null;
  }
}

/**
 * Save models to cache with current timestamp
 * @param {Array} models - Array of model objects to cache
 */
export function cacheModels(models) {
  const cacheData = {
    models,
    timestamp: Date.now()
  };
  localStorage.setItem(MODELS_CACHE_KEY, JSON.stringify(cacheData));
}

/**
 * Get cache age in a human-readable format
 * @returns {string|null} Cache age string or null if no cache exists
 */
export function getCacheAge() {
  const cached = getCachedModels();
  if (!cached) {
    return null;
  }

  const ageMs = Date.now() - cached.timestamp;
  const ageMinutes = Math.floor(ageMs / (60 * 1000));
  const ageHours = Math.floor(ageMs / (60 * 60 * 1000));

  if (ageMinutes < 1) {
    return 'Just now';
  } else if (ageMinutes < 60) {
    return `${ageMinutes} minute${ageMinutes !== 1 ? 's' : ''} ago`;
  } else if (ageHours < 24) {
    return `${ageHours} hour${ageHours !== 1 ? 's' : ''} ago`;
  } else {
    return 'Over a day ago';
  }
}

/**
 * Clear the models cache
 */
export function clearModelsCache() {
  localStorage.removeItem(MODELS_CACHE_KEY);
}

/**
 * Get models with automatic caching
 * Tries to use cache first, falls back to API if cache is expired or doesn't exist
 * @param {string} apiKey - OpenRouter API key
 * @param {boolean} forceRefresh - If true, bypass cache and fetch fresh data
 * @returns {Promise<Array>} Array of model objects
 */
export async function getModels(apiKey, forceRefresh = false) {
  if (!forceRefresh) {
    const cached = getCachedModels();
    if (cached) {
      return cached.models;
    }
  }

  // Fetch fresh data from API
  const models = await fetchModels(apiKey);
  cacheModels(models);
  return models;
}

/**
 * Sort models by different criteria
 * @param {Array} models - Array of model objects
 * @param {string} sortBy - Sort criteria: 'name', 'created', 'context'
 * @param {boolean} ascending - Sort direction
 * @returns {Array} Sorted array of models
 */
export function sortModels(models, sortBy = 'name', ascending = true) {
  const sorted = [...models];

  sorted.sort((a, b) => {
    let compareA, compareB;

    switch (sortBy) {
      case 'created':
        // Sort by creation date (Unix timestamp)
        compareA = a.created || 0;
        compareB = b.created || 0;
        break;
      case 'context':
        // Sort by context length
        compareA = a.context_length || 0;
        compareB = b.context_length || 0;
        break;
      case 'name':
      default:
        // Sort by name (case-insensitive)
        compareA = (a.name || '').toLowerCase();
        compareB = (b.name || '').toLowerCase();
        break;
    }

    if (compareA < compareB) return ascending ? -1 : 1;
    if (compareA > compareB) return ascending ? 1 : -1;
    return 0;
  });

  return sorted;
}

/**
 * Filter models by search query
 * @param {Array} models - Array of model objects
 * @param {string} query - Search query
 * @returns {Array} Filtered array of models
 */
export function filterModels(models, query) {
  if (!query) return models;

  const lowerQuery = query.toLowerCase();
  return models.filter(model => {
    const name = (model.name || '').toLowerCase();
    const id = (model.id || '').toLowerCase();
    const description = (model.description || '').toLowerCase();

    return name.includes(lowerQuery) ||
           id.includes(lowerQuery) ||
           description.includes(lowerQuery);
  });
}
