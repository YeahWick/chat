import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseSSELine, formatMessages, OPENROUTER_API_URL } from '../js/api.js';

describe('API Module', () => {
  describe('parseSSELine', () => {
    it('should return null for empty line', () => {
      expect(parseSSELine('')).toBeNull();
      expect(parseSSELine('   ')).toBeNull();
    });

    it('should return null for [DONE] signal', () => {
      expect(parseSSELine('data: [DONE]')).toBeNull();
    });

    it('should parse valid SSE data', () => {
      const line = 'data: {"id":"123","choices":[{"delta":{"content":"Hello"}}]}';
      const result = parseSSELine(line);
      expect(result).toEqual({
        id: '123',
        choices: [{ delta: { content: 'Hello' } }]
      });
    });

    it('should handle whitespace in SSE data', () => {
      const line = '  data: {"id":"123"}  ';
      const result = parseSSELine(line);
      expect(result).toEqual({ id: '123' });
    });

    it('should return null for invalid JSON', () => {
      const line = 'data: {invalid json}';
      expect(parseSSELine(line)).toBeNull();
    });

    it('should return null for non-data lines', () => {
      expect(parseSSELine('event: message')).toBeNull();
      expect(parseSSELine('id: 123')).toBeNull();
    });
  });

  describe('formatMessages', () => {
    it('should format messages with only role and content', () => {
      const messages = [
        { role: 'user', content: 'Hello', timestamp: 123, extra: 'data' },
        { role: 'assistant', content: 'Hi!', metadata: {} }
      ];

      const result = formatMessages(messages);

      expect(result).toEqual([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi!' }
      ]);
    });

    it('should handle empty messages array', () => {
      expect(formatMessages([])).toEqual([]);
    });

    it('should preserve message order', () => {
      const messages = [
        { role: 'user', content: 'First' },
        { role: 'assistant', content: 'Second' },
        { role: 'user', content: 'Third' }
      ];

      const result = formatMessages(messages);

      expect(result[0].content).toBe('First');
      expect(result[1].content).toBe('Second');
      expect(result[2].content).toBe('Third');
    });
  });

  describe('Constants', () => {
    it('should have correct OpenRouter API URL', () => {
      expect(OPENROUTER_API_URL).toBe('https://openrouter.ai/api/v1/chat/completions');
    });
  });

  describe('streamChatCompletion', () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    it('should throw error when API key is missing', async () => {
      const { streamChatCompletion } = await import('../js/api.js');

      await expect(
        streamChatCompletion({
          apiKey: null,
          model: 'test',
          messages: [{ role: 'user', content: 'Hello' }]
        })
      ).rejects.toThrow('API key is required');
    });

    it('should throw error when messages array is empty', async () => {
      const { streamChatCompletion } = await import('../js/api.js');

      await expect(
        streamChatCompletion({
          apiKey: 'test-key',
          model: 'test',
          messages: []
        })
      ).rejects.toThrow('Messages array is required');
    });

    it('should throw error when messages is not an array', async () => {
      const { streamChatCompletion } = await import('../js/api.js');

      await expect(
        streamChatCompletion({
          apiKey: 'test-key',
          model: 'test',
          messages: 'not an array'
        })
      ).rejects.toThrow('Messages array is required');
    });

    it('should make fetch request with correct headers', async () => {
      const { streamChatCompletion } = await import('../js/api.js');

      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Hi"}}]}\n') })
          .mockResolvedValueOnce({ done: true, value: undefined })
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: { getReader: () => mockReader }
      });

      const onChunk = vi.fn();
      const onComplete = vi.fn();

      await streamChatCompletion({
        apiKey: 'test-api-key',
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
        onChunk,
        onComplete
      });

      expect(global.fetch).toHaveBeenCalledWith(
        OPENROUTER_API_URL,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key'
          })
        })
      );
    });

    it('should call onChunk for each streamed chunk', async () => {
      const { streamChatCompletion } = await import('../js/api.js');

      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Hello"}}]}\n')
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":" World"}}]}\n')
          })
          .mockResolvedValueOnce({ done: true, value: undefined })
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: { getReader: () => mockReader }
      });

      const onChunk = vi.fn();
      const onComplete = vi.fn();

      await streamChatCompletion({
        apiKey: 'test-key',
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hi' }],
        onChunk,
        onComplete
      });

      expect(onChunk).toHaveBeenCalledTimes(2);
      expect(onChunk).toHaveBeenNthCalledWith(1, 'Hello', 'Hello');
      expect(onChunk).toHaveBeenNthCalledWith(2, ' World', 'Hello World');
      expect(onComplete).toHaveBeenCalledWith('Hello World');
    });

    it('should handle HTTP errors', async () => {
      const { streamChatCompletion } = await import('../js/api.js');

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ error: { message: 'Invalid API key' } })
      });

      await expect(
        streamChatCompletion({
          apiKey: 'invalid-key',
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Hi' }]
        })
      ).rejects.toThrow('Invalid API key');
    });
  });
});
