/**
 * Main application entry point
 */

import { Chat } from './chat.js';
import { getApiKey, setApiKey, getModel, setModel, hasApiKey } from './storage.js';
import { getModels, getCacheAge, sortModels, filterModels } from './models.js';

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
const refreshModelsBtn = document.getElementById('refresh-models-btn');
const cacheAgeSpan = document.getElementById('cache-age');
const modelSearchInput = document.getElementById('model-search');
const modelSortSelect = document.getElementById('model-sort');
const modelInfo = document.getElementById('model-info');

// Initialize Chat
const chat = new Chat({
  messagesContainer,
  getApiKey,
  getModel
});

// Load existing messages
chat.init();

// State for models
let allModels = [];
let filteredModels = [];

// Load saved settings
function loadSettings() {
  const apiKey = getApiKey();
  if (apiKey) {
    apiKeyInput.value = apiKey;
  }
  const savedModel = getModel();
  modelSelect.value = savedModel;
}

// Update cache age display
function updateCacheAge() {
  const age = getCacheAge();
  if (age) {
    cacheAgeSpan.textContent = `Updated ${age}`;
  } else {
    cacheAgeSpan.textContent = '';
  }
}

// Format model info for display
function formatModelInfo(model) {
  if (!model) return '';

  const parts = [];

  // Release date
  if (model.created) {
    const date = new Date(model.created * 1000);
    parts.push(`<strong>Released:</strong> ${date.toLocaleDateString()}`);
  }

  // Context length
  if (model.context_length) {
    parts.push(`<strong>Context:</strong> ${model.context_length.toLocaleString()} tokens`);
  }

  // Pricing
  if (model.pricing) {
    const promptPrice = model.pricing.prompt ? `$${(parseFloat(model.pricing.prompt) * 1000000).toFixed(2)}/M` : 'N/A';
    const completionPrice = model.pricing.completion ? `$${(parseFloat(model.pricing.completion) * 1000000).toFixed(2)}/M` : 'N/A';
    parts.push(`<strong>Pricing:</strong> ${promptPrice} prompt, ${completionPrice} completion`);
  }

  // Description (truncated)
  if (model.description) {
    const desc = model.description.length > 150
      ? model.description.substring(0, 150) + '...'
      : model.description;
    parts.push(`<strong>Description:</strong> ${desc}`);
  }

  return parts.join('<br>');
}

// Populate model select dropdown
function populateModelSelect(models, selectedModelId = null) {
  modelSelect.innerHTML = '';

  if (models.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'No models found';
    modelSelect.appendChild(option);
    return;
  }

  models.forEach(model => {
    const option = document.createElement('option');
    option.value = model.id;
    option.textContent = model.name || model.id;

    if (model.id === selectedModelId) {
      option.selected = true;
    }

    modelSelect.appendChild(option);
  });
}

// Apply filters and sorting to models
function updateModelList() {
  const searchQuery = modelSearchInput.value;
  const sortBy = modelSortSelect.value;

  // Filter models
  filteredModels = filterModels(allModels, searchQuery);

  // Sort models
  const ascending = sortBy === 'name'; // Name ascending, others descending (newer/larger first)
  filteredModels = sortModels(filteredModels, sortBy, ascending);

  // Get currently selected model
  const currentSelection = modelSelect.value;

  // Update the select dropdown
  populateModelSelect(filteredModels, currentSelection);

  // Update model info if a model is selected
  if (modelSelect.value) {
    const selectedModel = allModels.find(m => m.id === modelSelect.value);
    modelInfo.innerHTML = formatModelInfo(selectedModel);
  }
}

// Load models from API or cache
async function loadModels(forceRefresh = false) {
  const apiKey = getApiKey();
  if (!apiKey) {
    modelSelect.innerHTML = '<option value="">Set API key first</option>';
    return;
  }

  try {
    if (forceRefresh) {
      refreshModelsBtn.classList.add('refreshing');
    }

    modelSelect.innerHTML = '<option value="">Loading models...</option>';

    allModels = await getModels(apiKey, forceRefresh);
    updateModelList();
    updateCacheAge();

  } catch (error) {
    console.error('Failed to load models:', error);
    modelSelect.innerHTML = '<option value="">Failed to load models</option>';
    alert(`Failed to load models: ${error.message}`);
  } finally {
    refreshModelsBtn.classList.remove('refreshing');
  }
}

loadSettings();

// Show settings if no API key
if (!hasApiKey()) {
  settingsPanel.classList.remove('hidden');
}

// Toggle settings panel
settingsBtn.addEventListener('click', async () => {
  const wasHidden = settingsPanel.classList.contains('hidden');
  settingsPanel.classList.toggle('hidden');

  // Load models when opening settings panel if we don't have models yet
  if (wasHidden && allModels.length === 0 && getApiKey()) {
    await loadModels();
  } else if (wasHidden) {
    updateCacheAge();
  }
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

// Refresh models button
refreshModelsBtn.addEventListener('click', async () => {
  await loadModels(true);
});

// Model search input
modelSearchInput.addEventListener('input', () => {
  updateModelList();
});

// Model sort select
modelSortSelect.addEventListener('change', () => {
  updateModelList();
});

// Model selection change - show model info
modelSelect.addEventListener('change', () => {
  if (modelSelect.value) {
    const selectedModel = allModels.find(m => m.id === modelSelect.value);
    modelInfo.innerHTML = formatModelInfo(selectedModel);
  } else {
    modelInfo.innerHTML = '';
  }
});
