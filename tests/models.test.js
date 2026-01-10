import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  fetchModelsFromAPI,
  getCachedModels,
  setCachedModels,
  clearModelsCache,
  isCacheValid,
  getCacheAge,
  getModels,
  sortModels,
  filterModels,
  formatModelForDisplay,
  SortOption,
  MODELS_STORAGE_KEYS,
  CACHE_DURATION_MS
} from '../js/models.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.location.origin
Object.defineProperty(window, 'location', {
  value: { origin: 'http://localhost:3000' },
  writable: true
});

describe('Models Module', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockModels = [
    {
      id: 'openai/gpt-4o',
      name: 'GPT-4o',
      created: 1700000000,
      context_length: 128000,
      pricing: { prompt: '0.000005', completion: '0.000015' },
      description: 'OpenAI GPT-4o model'
    },
    {
      id: 'anthropic/claude-3-sonnet',
      name: 'Claude 3 Sonnet',
      created: 1709000000,
      context_length: 200000,
      pricing: { prompt: '0.000003', completion: '0.000015' },
      description: 'Anthropic Claude 3 Sonnet'
    },
    {
      id: 'meta-llama/llama-3.1-8b',
      name: 'Llama 3.1 8B',
      created: 1705000000,
      context_length: 8192,
      pricing: { prompt: '0.0000001', completion: '0.0000001' },
      description: 'Meta Llama 3.1 8B'
    }
  ];

  describe('fetchModelsFromAPI', () => {
    it('should throw error when no API key provided', async () => {
      await expect(fetchModelsFromAPI('')).rejects.toThrow('API key is required');
      await expect(fetchModelsFromAPI(null)).rejects.toThrow('API key is required');
    });

    it('should fetch models successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockModels })
      });

      const models = await fetchModelsFromAPI('test-api-key');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/models',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key'
          })
        })
      );
      expect(models).toEqual(mockModels);
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ error: { message: 'Invalid API key' } })
      });

      await expect(fetchModelsFromAPI('bad-key')).rejects.toThrow('Invalid API key');
    });

    it('should return empty array when no data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      const models = await fetchModelsFromAPI('test-api-key');
      expect(models).toEqual([]);
    });
  });

  describe('Cache Management', () => {
    it('should return null when no cache exists', () => {
      expect(getCachedModels()).toBeNull();
    });

    it('should store and retrieve cached models', () => {
      setCachedModels(mockModels);
      const cached = getCachedModels();

      expect(cached.models).toEqual(mockModels);
      expect(cached.timestamp).toBeDefined();
    });

    it('should clear the cache', () => {
      setCachedModels(mockModels);
      clearModelsCache();
      expect(getCachedModels()).toBeNull();
    });

    it('should handle corrupted cache gracefully', () => {
      localStorage.setItem(MODELS_STORAGE_KEYS.MODELS_CACHE, 'invalid json');
      expect(getCachedModels()).toBeNull();
    });
  });

  describe('Cache Validation', () => {
    it('should return false when no cache exists', () => {
      expect(isCacheValid()).toBe(false);
    });

    it('should return true for fresh cache', () => {
      vi.setSystemTime(new Date('2025-01-01T12:00:00Z'));
      setCachedModels(mockModels);
      expect(isCacheValid()).toBe(true);
    });

    it('should return false for expired cache (>24 hours)', () => {
      vi.setSystemTime(new Date('2025-01-01T12:00:00Z'));
      setCachedModels(mockModels);

      // Advance time by 25 hours
      vi.setSystemTime(new Date('2025-01-02T13:00:00Z'));
      expect(isCacheValid()).toBe(false);
    });

    it('should return true for cache just under 24 hours old', () => {
      vi.setSystemTime(new Date('2025-01-01T12:00:00Z'));
      setCachedModels(mockModels);

      // Advance time by 23 hours
      vi.setSystemTime(new Date('2025-01-02T11:00:00Z'));
      expect(isCacheValid()).toBe(true);
    });
  });

  describe('getCacheAge', () => {
    it('should return null when no cache exists', () => {
      expect(getCacheAge()).toBeNull();
    });

    it('should return "just now" for fresh cache', () => {
      vi.setSystemTime(new Date('2025-01-01T12:00:00Z'));
      setCachedModels(mockModels);
      expect(getCacheAge()).toBe('just now');
    });

    it('should return minutes ago', () => {
      vi.setSystemTime(new Date('2025-01-01T12:00:00Z'));
      setCachedModels(mockModels);

      vi.setSystemTime(new Date('2025-01-01T12:30:00Z'));
      expect(getCacheAge()).toBe('30 minutes ago');
    });

    it('should return hours ago', () => {
      vi.setSystemTime(new Date('2025-01-01T12:00:00Z'));
      setCachedModels(mockModels);

      vi.setSystemTime(new Date('2025-01-01T15:00:00Z'));
      expect(getCacheAge()).toBe('3 hours ago');
    });

    it('should return days ago', () => {
      vi.setSystemTime(new Date('2025-01-01T12:00:00Z'));
      setCachedModels(mockModels);

      vi.setSystemTime(new Date('2025-01-03T12:00:00Z'));
      expect(getCacheAge()).toBe('2 days ago');
    });

    it('should handle singular units correctly', () => {
      vi.setSystemTime(new Date('2025-01-01T12:00:00Z'));
      setCachedModels(mockModels);

      vi.setSystemTime(new Date('2025-01-01T13:00:00Z'));
      expect(getCacheAge()).toBe('1 hour ago');
    });
  });

  describe('getModels', () => {
    it('should use cache when valid', async () => {
      vi.setSystemTime(new Date('2025-01-01T12:00:00Z'));
      setCachedModels(mockModels);

      const result = await getModels('test-key', false);

      expect(result.models).toEqual(mockModels);
      expect(result.fromCache).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should fetch from API when cache expired', async () => {
      vi.setSystemTime(new Date('2025-01-01T12:00:00Z'));
      setCachedModels(mockModels);

      // Expire the cache
      vi.setSystemTime(new Date('2025-01-02T13:00:00Z'));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockModels })
      });

      const result = await getModels('test-key', false);

      expect(result.fromCache).toBe(false);
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should force refresh when requested', async () => {
      vi.setSystemTime(new Date('2025-01-01T12:00:00Z'));
      setCachedModels(mockModels);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockModels })
      });

      const result = await getModels('test-key', true);

      expect(result.fromCache).toBe(false);
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('sortModels', () => {
    it('should sort by name ascending', () => {
      const sorted = sortModels(mockModels, SortOption.NAME_ASC);
      expect(sorted[0].name).toBe('Claude 3 Sonnet');
      expect(sorted[1].name).toBe('GPT-4o');
      expect(sorted[2].name).toBe('Llama 3.1 8B');
    });

    it('should sort by name descending', () => {
      const sorted = sortModels(mockModels, SortOption.NAME_DESC);
      expect(sorted[0].name).toBe('Llama 3.1 8B');
      expect(sorted[2].name).toBe('Claude 3 Sonnet');
    });

    it('should sort by date newest first', () => {
      const sorted = sortModels(mockModels, SortOption.DATE_NEWEST);
      expect(sorted[0].id).toBe('anthropic/claude-3-sonnet');
    });

    it('should sort by date oldest first', () => {
      const sorted = sortModels(mockModels, SortOption.DATE_OLDEST);
      expect(sorted[0].id).toBe('openai/gpt-4o');
    });

    it('should sort by context length', () => {
      const sorted = sortModels(mockModels, SortOption.CONTEXT_LENGTH);
      expect(sorted[0].id).toBe('anthropic/claude-3-sonnet');
      expect(sorted[2].id).toBe('meta-llama/llama-3.1-8b');
    });

    it('should sort by price low to high', () => {
      const sorted = sortModels(mockModels, SortOption.PRICE_LOW);
      expect(sorted[0].id).toBe('meta-llama/llama-3.1-8b');
    });

    it('should sort by price high to low', () => {
      const sorted = sortModels(mockModels, SortOption.PRICE_HIGH);
      expect(sorted[0].id).toBe('openai/gpt-4o');
    });

    it('should not mutate original array', () => {
      const original = [...mockModels];
      sortModels(mockModels, SortOption.NAME_ASC);
      expect(mockModels).toEqual(original);
    });
  });

  describe('filterModels', () => {
    it('should return all models for empty query', () => {
      expect(filterModels(mockModels, '')).toEqual(mockModels);
      expect(filterModels(mockModels, '   ')).toEqual(mockModels);
      expect(filterModels(mockModels, null)).toEqual(mockModels);
    });

    it('should filter by name', () => {
      const filtered = filterModels(mockModels, 'claude');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('anthropic/claude-3-sonnet');
    });

    it('should filter by id', () => {
      const filtered = filterModels(mockModels, 'openai');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('openai/gpt-4o');
    });

    it('should filter by description', () => {
      const filtered = filterModels(mockModels, 'meta');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('meta-llama/llama-3.1-8b');
    });

    it('should be case insensitive', () => {
      expect(filterModels(mockModels, 'GPT')).toHaveLength(1);
      expect(filterModels(mockModels, 'gpt')).toHaveLength(1);
    });
  });

  describe('formatModelForDisplay', () => {
    it('should format model with all fields', () => {
      const formatted = formatModelForDisplay(mockModels[0]);

      expect(formatted.id).toBe('openai/gpt-4o');
      expect(formatted.name).toBe('GPT-4o');
      expect(formatted.contextLength).toBe(128000);
      expect(formatted.detailsText).toContain('128k ctx');
      expect(formatted.detailsText).toContain('$5.00/M tokens');
    });

    it('should handle missing fields', () => {
      const model = { id: 'test/model' };
      const formatted = formatModelForDisplay(model);

      expect(formatted.id).toBe('test/model');
      expect(formatted.name).toBe('test/model');
      expect(formatted.detailsText).toBe('');
    });

    it('should format created date', () => {
      const formatted = formatModelForDisplay(mockModels[0]);
      expect(formatted.createdDate).toBeDefined();
    });
  });
});
