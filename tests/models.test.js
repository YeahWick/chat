/**
 * Tests for models.js module
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  fetchModels,
  getCachedModels,
  cacheModels,
  getCacheAge,
  clearModelsCache,
  getModels,
  sortModels,
  filterModels
} from '../js/models.js';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

global.localStorage = localStorageMock;

// Mock fetch
global.fetch = vi.fn();

describe('Models Module', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('fetchModels', () => {
    it('should fetch models from OpenRouter API', async () => {
      const mockModels = [
        { id: 'model-1', name: 'Model 1' },
        { id: 'model-2', name: 'Model 2' }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockModels })
      });

      const result = await fetchModels('test-api-key');

      expect(fetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/models',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key'
          })
        })
      );

      expect(result).toEqual(mockModels);
    });

    it('should throw error on failed fetch', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      await expect(fetchModels('invalid-key')).rejects.toThrow('Failed to fetch models: 401 Unauthorized');
    });
  });

  describe('Cache Management', () => {
    const mockModels = [
      { id: 'model-1', name: 'Model 1', created: 1704067200 },
      { id: 'model-2', name: 'Model 2', created: 1704153600 }
    ];

    it('should cache models with timestamp', () => {
      const beforeCache = Date.now();
      cacheModels(mockModels);
      const afterCache = Date.now();

      const cached = getCachedModels();
      expect(cached).toBeTruthy();
      expect(cached.models).toEqual(mockModels);
      expect(cached.timestamp).toBeGreaterThanOrEqual(beforeCache);
      expect(cached.timestamp).toBeLessThanOrEqual(afterCache);
    });

    it('should return null if cache does not exist', () => {
      const cached = getCachedModels();
      expect(cached).toBeNull();
    });

    it('should return null if cache is expired', () => {
      const expiredTimestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      localStorage.setItem('openrouter_models_cache', JSON.stringify({
        models: mockModels,
        timestamp: expiredTimestamp
      }));

      const cached = getCachedModels();
      expect(cached).toBeNull();
    });

    it('should return cached data if not expired', () => {
      const recentTimestamp = Date.now() - (1 * 60 * 60 * 1000); // 1 hour ago
      localStorage.setItem('openrouter_models_cache', JSON.stringify({
        models: mockModels,
        timestamp: recentTimestamp
      }));

      const cached = getCachedModels();
      expect(cached).toBeTruthy();
      expect(cached.models).toEqual(mockModels);
    });

    it('should clear cache', () => {
      cacheModels(mockModels);
      expect(getCachedModels()).toBeTruthy();

      clearModelsCache();
      expect(getCachedModels()).toBeNull();
    });
  });

  describe('getCacheAge', () => {
    it('should return null if no cache exists', () => {
      expect(getCacheAge()).toBeNull();
    });

    it('should return "Just now" for very recent cache', () => {
      cacheModels([]);
      expect(getCacheAge()).toBe('Just now');
    });

    it('should return minutes for recent cache', () => {
      const timestamp = Date.now() - (5 * 60 * 1000); // 5 minutes ago
      localStorage.setItem('openrouter_models_cache', JSON.stringify({
        models: [],
        timestamp
      }));

      expect(getCacheAge()).toBe('5 minutes ago');
    });

    it('should return hours for older cache', () => {
      const timestamp = Date.now() - (3 * 60 * 60 * 1000); // 3 hours ago
      localStorage.setItem('openrouter_models_cache', JSON.stringify({
        models: [],
        timestamp
      }));

      expect(getCacheAge()).toBe('3 hours ago');
    });

    it('should return null for expired cache (over 24 hours)', () => {
      const timestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      localStorage.setItem('openrouter_models_cache', JSON.stringify({
        models: [],
        timestamp
      }));

      // Expired cache is automatically removed, so getCacheAge returns null
      expect(getCacheAge()).toBeNull();
    });
  });

  describe('getModels', () => {
    const mockModels = [
      { id: 'model-1', name: 'Model 1' },
      { id: 'model-2', name: 'Model 2' }
    ];

    it('should use cached models if available and not forcing refresh', async () => {
      cacheModels(mockModels);

      const result = await getModels('test-api-key', false);

      expect(result).toEqual(mockModels);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should fetch fresh models if cache does not exist', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockModels })
      });

      const result = await getModels('test-api-key', false);

      expect(fetch).toHaveBeenCalled();
      expect(result).toEqual(mockModels);

      // Verify models were cached
      const cached = getCachedModels();
      expect(cached.models).toEqual(mockModels);
    });

    it('should fetch fresh models when forceRefresh is true', async () => {
      cacheModels([{ id: 'old-model', name: 'Old Model' }]);

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockModels })
      });

      const result = await getModels('test-api-key', true);

      expect(fetch).toHaveBeenCalled();
      expect(result).toEqual(mockModels);
    });
  });

  describe('sortModels', () => {
    const mockModels = [
      { id: 'a', name: 'Zeta Model', created: 1704067200, context_length: 8000 },
      { id: 'b', name: 'Alpha Model', created: 1704153600, context_length: 128000 },
      { id: 'c', name: 'Beta Model', created: 1704240000, context_length: 4000 }
    ];

    it('should sort by name ascending', () => {
      const sorted = sortModels(mockModels, 'name', true);
      expect(sorted.map(m => m.name)).toEqual(['Alpha Model', 'Beta Model', 'Zeta Model']);
    });

    it('should sort by name descending', () => {
      const sorted = sortModels(mockModels, 'name', false);
      expect(sorted.map(m => m.name)).toEqual(['Zeta Model', 'Beta Model', 'Alpha Model']);
    });

    it('should sort by created date ascending', () => {
      const sorted = sortModels(mockModels, 'created', true);
      expect(sorted.map(m => m.id)).toEqual(['a', 'b', 'c']);
    });

    it('should sort by created date descending', () => {
      const sorted = sortModels(mockModels, 'created', false);
      expect(sorted.map(m => m.id)).toEqual(['c', 'b', 'a']);
    });

    it('should sort by context length ascending', () => {
      const sorted = sortModels(mockModels, 'context', true);
      expect(sorted.map(m => m.context_length)).toEqual([4000, 8000, 128000]);
    });

    it('should sort by context length descending', () => {
      const sorted = sortModels(mockModels, 'context', false);
      expect(sorted.map(m => m.context_length)).toEqual([128000, 8000, 4000]);
    });

    it('should not modify the original array', () => {
      const original = [...mockModels];
      sortModels(mockModels, 'name', true);
      expect(mockModels).toEqual(original);
    });
  });

  describe('filterModels', () => {
    const mockModels = [
      { id: 'openai/gpt-4', name: 'GPT-4', description: 'Large language model by OpenAI' },
      { id: 'anthropic/claude-3', name: 'Claude 3', description: 'Advanced AI assistant' },
      { id: 'meta-llama/llama-3', name: 'Llama 3', description: 'Open source model by Meta' }
    ];

    it('should return all models if query is empty', () => {
      expect(filterModels(mockModels, '')).toEqual(mockModels);
      expect(filterModels(mockModels, null)).toEqual(mockModels);
      expect(filterModels(mockModels, undefined)).toEqual(mockModels);
    });

    it('should filter by name (case insensitive)', () => {
      const result = filterModels(mockModels, 'gpt');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('GPT-4');
    });

    it('should filter by id', () => {
      const result = filterModels(mockModels, 'anthropic');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('anthropic/claude-3');
    });

    it('should filter by description', () => {
      const result = filterModels(mockModels, 'open');
      expect(result).toHaveLength(2); // Matches "OpenAI" and "Open source"
    });

    it('should return empty array if no matches', () => {
      const result = filterModels(mockModels, 'nonexistent');
      expect(result).toEqual([]);
    });
  });
});
