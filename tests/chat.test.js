import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Chat, createMessage } from '../js/chat.js';

// Mock the storage module
vi.mock('../js/storage.js', () => ({
  getMessages: vi.fn(() => []),
  setMessages: vi.fn()
}));

// Mock the api module
vi.mock('../js/api.js', () => ({
  streamChatCompletion: vi.fn(),
  formatMessages: vi.fn((msgs) => msgs.map(m => ({ role: m.role, content: m.content })))
}));

describe('Chat Module', () => {
  describe('createMessage', () => {
    it('should create a user message', () => {
      const message = createMessage('user', 'Hello');
      expect(message).toEqual({ role: 'user', content: 'Hello' });
    });

    it('should create an assistant message', () => {
      const message = createMessage('assistant', 'Hi there!');
      expect(message).toEqual({ role: 'assistant', content: 'Hi there!' });
    });

    it('should create a system message', () => {
      const message = createMessage('system', 'You are a helpful assistant');
      expect(message).toEqual({ role: 'system', content: 'You are a helpful assistant' });
    });

    it('should throw error for invalid role', () => {
      expect(() => createMessage('invalid', 'Hello')).toThrow('Invalid role');
      expect(() => createMessage('', 'Hello')).toThrow('Invalid role');
    });
  });

  describe('Chat Class', () => {
    let chat;
    let messagesContainer;
    let getApiKey;
    let getModel;

    beforeEach(() => {
      // Create a mock DOM container
      messagesContainer = document.createElement('div');
      getApiKey = vi.fn(() => 'test-api-key');
      getModel = vi.fn(() => 'gpt-4');

      chat = new Chat({
        messagesContainer,
        getApiKey,
        getModel
      });

      vi.clearAllMocks();
    });

    describe('init', () => {
      it('should initialize with empty messages', () => {
        chat.init();
        expect(chat.messages).toEqual([]);
        expect(messagesContainer.children.length).toBe(0);
      });

      it('should load and render stored messages', async () => {
        const { getMessages } = await import('../js/storage.js');
        getMessages.mockReturnValue([
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi!' }
        ]);

        chat.init();

        expect(chat.messages.length).toBe(2);
        expect(messagesContainer.children.length).toBe(2);
      });
    });

    describe('renderMessage', () => {
      it('should create a message element with correct class', () => {
        const element = chat.renderMessage({ role: 'user', content: 'Hello' });

        expect(element.classList.contains('message')).toBe(true);
        expect(element.classList.contains('user')).toBe(true);
        expect(element.textContent).toBe('Hello');
      });

      it('should add streaming class when streaming', () => {
        const element = chat.renderMessage({ role: 'assistant', content: '' }, true);

        expect(element.classList.contains('streaming')).toBe(true);
      });

      it('should append message to container', () => {
        chat.renderMessage({ role: 'user', content: 'Test' });

        expect(messagesContainer.children.length).toBe(1);
      });
    });

    describe('renderAllMessages', () => {
      it('should clear container and render all messages', () => {
        chat.messages = [
          { role: 'user', content: 'First' },
          { role: 'assistant', content: 'Second' }
        ];

        chat.renderAllMessages();

        expect(messagesContainer.children.length).toBe(2);
        expect(messagesContainer.children[0].textContent).toBe('First');
        expect(messagesContainer.children[1].textContent).toBe('Second');
      });
    });

    describe('addErrorMessage', () => {
      it('should add error message with error class', () => {
        chat.addErrorMessage('Something went wrong');

        const errorElement = messagesContainer.querySelector('.error');
        expect(errorElement).not.toBeNull();
        expect(errorElement.textContent).toBe('Error: Something went wrong');
      });
    });

    describe('clearMessages', () => {
      it('should clear all messages', async () => {
        const { setMessages } = await import('../js/storage.js');

        chat.messages = [{ role: 'user', content: 'Test' }];
        chat.renderMessage({ role: 'user', content: 'Test' });

        chat.clearMessages();

        expect(chat.messages).toEqual([]);
        expect(messagesContainer.children.length).toBe(0);
        expect(setMessages).toHaveBeenCalledWith([]);
      });
    });

    describe('getMessageCount', () => {
      it('should return correct message count', () => {
        expect(chat.getMessageCount()).toBe(0);

        chat.messages = [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi' }
        ];

        expect(chat.getMessageCount()).toBe(2);
      });
    });

    describe('sendMessage', () => {
      it('should not send empty messages', async () => {
        const { streamChatCompletion } = await import('../js/api.js');

        await chat.sendMessage('');
        await chat.sendMessage('   ');

        expect(streamChatCompletion).not.toHaveBeenCalled();
      });

      it('should show error when no API key', async () => {
        getApiKey.mockReturnValue(null);

        await chat.sendMessage('Hello');

        const errorElement = messagesContainer.querySelector('.error');
        expect(errorElement).not.toBeNull();
        expect(errorElement.textContent).toContain('API key');
      });

      it('should add user message to messages array', async () => {
        const { streamChatCompletion } = await import('../js/api.js');
        streamChatCompletion.mockImplementation(({ onComplete }) => {
          onComplete('Response');
          return Promise.resolve();
        });

        await chat.sendMessage('Hello');

        expect(chat.messages[0]).toEqual({ role: 'user', content: 'Hello' });
      });

      it('should call streamChatCompletion with correct parameters', async () => {
        const { streamChatCompletion } = await import('../js/api.js');
        streamChatCompletion.mockImplementation(({ onComplete }) => {
          onComplete('Response');
          return Promise.resolve();
        });

        await chat.sendMessage('Hello');

        expect(streamChatCompletion).toHaveBeenCalledWith(
          expect.objectContaining({
            apiKey: 'test-api-key',
            model: 'gpt-4'
          })
        );
      });
    });

    describe('stopStreaming', () => {
      it('should abort streaming when controller exists', () => {
        const mockAbort = vi.fn();
        chat.abortController = { abort: mockAbort };

        chat.stopStreaming();

        expect(mockAbort).toHaveBeenCalled();
      });

      it('should not throw when no controller', () => {
        expect(() => chat.stopStreaming()).not.toThrow();
      });
    });

    describe('scrollToBottom', () => {
      it('should scroll container to bottom', () => {
        // Mock scrollHeight
        Object.defineProperty(messagesContainer, 'scrollHeight', {
          value: 500,
          writable: true
        });

        chat.scrollToBottom();

        expect(messagesContainer.scrollTop).toBe(500);
      });
    });
  });
});
