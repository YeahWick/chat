import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getApiKey,
  setApiKey,
  clearApiKey,
  hasApiKey,
  getModel,
  setModel,
  getMessages,
  setMessages,
  clearMessages,
  clearAll,
  STORAGE_KEYS
} from '../js/storage.js';

describe('Storage Module', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('API Key Management', () => {
    it('should return null when no API key is stored', () => {
      expect(getApiKey()).toBeNull();
    });

    it('should store and retrieve an API key', () => {
      setApiKey('test-api-key-123');
      expect(getApiKey()).toBe('test-api-key-123');
    });

    it('should trim whitespace from API key', () => {
      setApiKey('  test-key  ');
      expect(getApiKey()).toBe('test-key');
    });

    it('should throw error for invalid API key', () => {
      expect(() => setApiKey('')).toThrow('Invalid API key');
      expect(() => setApiKey(null)).toThrow('Invalid API key');
      expect(() => setApiKey(123)).toThrow('Invalid API key');
    });

    it('should clear the API key', () => {
      setApiKey('test-key');
      clearApiKey();
      expect(getApiKey()).toBeNull();
    });

    it('should check if API key exists', () => {
      expect(hasApiKey()).toBe(false);
      setApiKey('test-key');
      expect(hasApiKey()).toBe(true);
    });

    it('should return false for empty string API key', () => {
      localStorage.setItem(STORAGE_KEYS.API_KEY, '');
      expect(hasApiKey()).toBe(false);
    });
  });

  describe('Model Management', () => {
    it('should return default model when none stored', () => {
      expect(getModel()).toBe('openai/gpt-4o-mini');
    });

    it('should return custom default model', () => {
      expect(getModel('anthropic/claude-3-haiku')).toBe('anthropic/claude-3-haiku');
    });

    it('should store and retrieve model', () => {
      setModel('anthropic/claude-3.5-sonnet');
      expect(getModel()).toBe('anthropic/claude-3.5-sonnet');
    });

    it('should throw error for invalid model', () => {
      expect(() => setModel('')).toThrow('Invalid model');
      expect(() => setModel(null)).toThrow('Invalid model');
    });
  });

  describe('Messages Management', () => {
    it('should return empty array when no messages stored', () => {
      expect(getMessages()).toEqual([]);
    });

    it('should store and retrieve messages', () => {
      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ];
      setMessages(messages);
      expect(getMessages()).toEqual(messages);
    });

    it('should throw error for non-array messages', () => {
      expect(() => setMessages('not an array')).toThrow('Messages must be an array');
      expect(() => setMessages(null)).toThrow('Messages must be an array');
    });

    it('should clear messages', () => {
      setMessages([{ role: 'user', content: 'Hello' }]);
      clearMessages();
      expect(getMessages()).toEqual([]);
    });

    it('should handle corrupted JSON gracefully', () => {
      localStorage.setItem(STORAGE_KEYS.MESSAGES, 'invalid json');
      expect(getMessages()).toEqual([]);
    });
  });

  describe('Clear All', () => {
    it('should clear all stored data', () => {
      setApiKey('test-key');
      setModel('test-model');
      setMessages([{ role: 'user', content: 'Hello' }]);

      clearAll();

      expect(getApiKey()).toBeNull();
      expect(getModel()).toBe('openai/gpt-4o-mini');
      expect(getMessages()).toEqual([]);
    });
  });
});
