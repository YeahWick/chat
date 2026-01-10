/**
 * Chat module for managing conversation state and UI
 */

import { streamChatCompletion, formatMessages } from './api.js';
import { getMessages, setMessages } from './storage.js';

/**
 * Chat class for managing the chat interface
 */
export class Chat {
  /**
   * @param {Object} options - Chat options
   * @param {HTMLElement} options.messagesContainer - Container for messages
   * @param {Function} options.getApiKey - Function to get API key
   * @param {Function} options.getModel - Function to get current model
   */
  constructor({ messagesContainer, getApiKey, getModel }) {
    this.messagesContainer = messagesContainer;
    this.getApiKey = getApiKey;
    this.getModel = getModel;
    this.messages = [];
    this.isStreaming = false;
    this.abortController = null;
  }

  /**
   * Initialize the chat with stored messages
   */
  init() {
    this.messages = getMessages();
    this.renderAllMessages();
  }

  /**
   * Add a user message and get assistant response
   * @param {string} content - User message content
   * @returns {Promise<void>}
   */
  async sendMessage(content) {
    if (!content.trim()) {
      return;
    }

    const apiKey = this.getApiKey();
    if (!apiKey) {
      this.addErrorMessage('Please set your API key in settings');
      return;
    }

    // Add user message
    const userMessage = { role: 'user', content: content.trim() };
    this.messages.push(userMessage);
    this.renderMessage(userMessage);
    this.saveMessages();

    // Create assistant message placeholder
    const assistantMessage = { role: 'assistant', content: '' };
    this.messages.push(assistantMessage);
    const messageElement = this.renderMessage(assistantMessage, true);

    this.isStreaming = true;
    this.abortController = new AbortController();

    try {
      await streamChatCompletion({
        apiKey,
        model: this.getModel(),
        messages: formatMessages(this.messages.slice(0, -1)),
        onChunk: (chunk, fullContent) => {
          assistantMessage.content = fullContent;
          messageElement.textContent = fullContent;
          this.scrollToBottom();
        },
        onComplete: (fullContent) => {
          assistantMessage.content = fullContent;
          messageElement.classList.remove('streaming');
          this.saveMessages();
        },
        onError: (error) => {
          this.messages.pop();
          messageElement.remove();
          this.addErrorMessage(error.message);
        },
        signal: this.abortController.signal
      });
    } catch (error) {
      this.messages.pop();
      messageElement.remove();
      this.addErrorMessage(error.message);
    } finally {
      this.isStreaming = false;
      this.abortController = null;
    }
  }

  /**
   * Stop the current streaming response
   */
  stopStreaming() {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * Render a single message to the UI
   * @param {Object} message - Message object with role and content
   * @param {boolean} isStreaming - Whether this is a streaming message
   * @returns {HTMLElement} The created message element
   */
  renderMessage(message, isStreaming = false) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${message.role}`;
    messageElement.textContent = message.content;

    if (isStreaming) {
      messageElement.classList.add('streaming');
    }

    this.messagesContainer.appendChild(messageElement);
    this.scrollToBottom();

    return messageElement;
  }

  /**
   * Render all messages to the UI
   */
  renderAllMessages() {
    this.messagesContainer.innerHTML = '';
    for (const message of this.messages) {
      this.renderMessage(message);
    }
  }

  /**
   * Add an error message to the UI
   * @param {string} message - Error message text
   */
  addErrorMessage(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'message error';
    errorElement.textContent = `Error: ${message}`;
    this.messagesContainer.appendChild(errorElement);
    this.scrollToBottom();
  }

  /**
   * Scroll the messages container to the bottom
   */
  scrollToBottom() {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  /**
   * Save messages to local storage
   */
  saveMessages() {
    setMessages(this.messages);
  }

  /**
   * Clear all messages
   */
  clearMessages() {
    this.messages = [];
    this.messagesContainer.innerHTML = '';
    setMessages([]);
  }

  /**
   * Get current message count
   * @returns {number} Number of messages
   */
  getMessageCount() {
    return this.messages.length;
  }
}

/**
 * Create a message object
 * @param {string} role - 'user' or 'assistant'
 * @param {string} content - Message content
 * @returns {Object} Message object
 */
export function createMessage(role, content) {
  if (!['user', 'assistant', 'system'].includes(role)) {
    throw new Error('Invalid role');
  }
  return { role, content };
}
