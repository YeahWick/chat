/**
 * Main application entry point
 */

import { Chat } from './chat.js';
import { getApiKey, setApiKey, getModel, setModel, hasApiKey } from './storage.js';

// DOM Elements
const settingsBtn = document.getElementById('settings-btn');
const settingsPanel = document.getElementById('settings-panel');
const apiKeyInput = document.getElementById('api-key-input');
const modelSelect = document.getElementById('model-select');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const messagesContainer = document.getElementById('messages');
const sendBtn = document.getElementById('send-btn');

// Initialize Chat
const chat = new Chat({
  messagesContainer,
  getApiKey,
  getModel
});

// Load existing messages
chat.init();

// Load saved settings
function loadSettings() {
  const apiKey = getApiKey();
  if (apiKey) {
    apiKeyInput.value = apiKey;
  }
  modelSelect.value = getModel();
}

loadSettings();

// Show settings if no API key
if (!hasApiKey()) {
  settingsPanel.classList.remove('hidden');
}

// Toggle settings panel
settingsBtn.addEventListener('click', () => {
  settingsPanel.classList.toggle('hidden');
});

// Save settings
saveSettingsBtn.addEventListener('click', () => {
  const apiKey = apiKeyInput.value.trim();
  const model = modelSelect.value;

  if (apiKey) {
    setApiKey(apiKey);
  }
  setModel(model);
  settingsPanel.classList.add('hidden');
});

// Auto-resize textarea
messageInput.addEventListener('input', () => {
  messageInput.style.height = 'auto';
  messageInput.style.height = Math.min(messageInput.scrollHeight, 150) + 'px';
});

// Handle form submission
chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const content = messageInput.value.trim();
  if (!content || chat.isStreaming) {
    return;
  }

  messageInput.value = '';
  messageInput.style.height = 'auto';
  sendBtn.disabled = true;

  await chat.sendMessage(content);

  sendBtn.disabled = false;
  messageInput.focus();
});

// Handle Enter key (submit on Enter, new line on Shift+Enter)
messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    chatForm.dispatchEvent(new Event('submit'));
  }
});

// Stop streaming on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && chat.isStreaming) {
    chat.stopStreaming();
  }
});
