/**
 * Main application entry point
 */

import { Chat } from './chat.js';
import { getApiKey, setApiKey, getModel, setModel, hasApiKey, getSortPreference, setSortPreference } from './storage.js';
import { getModels, sortModels, filterModels, formatModelForDisplay, getCacheAge, SortOption } from './models.js';

// DOM Elements
const settingsBtn = document.getElementById('settings-btn');
const settingsPanel = document.getElementById('settings-panel');
const apiKeyInput = document.getElementById('api-key-input');
const modelSelect = document.getElementById('model-select');
const modelSearch = document.getElementById('model-search');
const sortSelect = document.getElementById('sort-select');
const refreshModelsBtn = document.getElementById('refresh-models-btn');
const cacheAgeSpan = document.getElementById('cache-age');
const modelDetails = document.getElementById('model-details');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const messagesContainer = document.getElementById('messages');
const sendBtn = document.getElementById('send-btn');

// State
let allModels = [];
let isLoadingModels = false;

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
  sortSelect.value = getSortPreference();
}

loadSettings();

// Show settings if no API key
if (!hasApiKey()) {
  settingsPanel.classList.remove('hidden');
}

/**
 * Render models in the select dropdown
 * @param {Array} models - Array of model objects
 */
function renderModelOptions(models) {
  const currentModel = getModel();
  modelSelect.innerHTML = '';

  if (models.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'No models found';
    modelSelect.appendChild(option);
    return;
  }

  models.forEach(model => {
    const formatted = formatModelForDisplay(model);
    const option = document.createElement('option');
    option.value = model.id;
    option.textContent = formatted.name;
    if (formatted.detailsText) {
      option.textContent += ` (${formatted.detailsText})`;
    }
    if (model.id === currentModel) {
      option.selected = true;
    }
    modelSelect.appendChild(option);
  });

  // If current model not found in list, add it as first option
  if (currentModel && !models.find(m => m.id === currentModel)) {
    const option = document.createElement('option');
    option.value = currentModel;
    option.textContent = currentModel + ' (not in list)';
    option.selected = true;
    modelSelect.insertBefore(option, modelSelect.firstChild);
  }
}

/**
 * Update the cache age display
 */
function updateCacheAgeDisplay() {
  const age = getCacheAge();
  if (age) {
    cacheAgeSpan.textContent = `Updated ${age}`;
  } else {
    cacheAgeSpan.textContent = '';
  }
}

/**
 * Update model details display
 * @param {Object} model - The selected model object
 */
function updateModelDetails(model) {
  if (!model) {
    modelDetails.innerHTML = '<em>Select a model to see details</em>';
    return;
  }

  const formatted = formatModelForDisplay(model);
  const contextK = model.context_length ? Math.round(model.context_length / 1000) : 'N/A';
  const promptPrice = model.pricing?.prompt ? (parseFloat(model.pricing.prompt) * 1000000).toFixed(2) : 'N/A';
  const completionPrice = model.pricing?.completion ? (parseFloat(model.pricing.completion) * 1000000).toFixed(2) : 'N/A';
  const createdDate = formatted.createdDate || 'N/A';

  modelDetails.innerHTML = `
    <div class="detail-row">
      <span class="detail-label">Context:</span>
      <span class="detail-value">${contextK}k tokens</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Input Price:</span>
      <span class="detail-value">$${promptPrice}/M tokens</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Output Price:</span>
      <span class="detail-value">$${completionPrice}/M tokens</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Created:</span>
      <span class="detail-value">${createdDate}</span>
    </div>
  `;
}

/**
 * Apply current filter and sort to models
 */
function applyFilterAndSort() {
  const query = modelSearch.value;
  const sortOption = sortSelect.value;

  let filtered = filterModels(allModels, query);
  let sorted = sortModels(filtered, sortOption);

  renderModelOptions(sorted);

  // Update details for currently selected model
  const selectedId = modelSelect.value;
  const selectedModel = allModels.find(m => m.id === selectedId);
  updateModelDetails(selectedModel);
}

/**
 * Load models from API or cache
 * @param {boolean} forceRefresh - Force refresh from API
 */
async function loadModels(forceRefresh = false) {
  const apiKey = apiKeyInput.value.trim() || getApiKey();

  if (!apiKey) {
    modelSelect.innerHTML = '<option value="">Enter API key first</option>';
    modelDetails.innerHTML = '<em>API key required to load models</em>';
    return;
  }

  isLoadingModels = true;
  refreshModelsBtn.disabled = true;
  refreshModelsBtn.innerHTML = '<span class="loading-spinner">↻</span>';
  modelSelect.innerHTML = '<option value="">Loading models...</option>';

  try {
    const result = await getModels(apiKey, forceRefresh);
    allModels = result.models;

    updateCacheAgeDisplay();
    applyFilterAndSort();

    if (result.fromCache) {
      console.log(`Loaded ${allModels.length} models from cache`);
    } else {
      console.log(`Fetched ${allModels.length} models from API`);
    }
  } catch (error) {
    console.error('Failed to load models:', error);
    modelSelect.innerHTML = '<option value="">Failed to load models</option>';
    modelDetails.innerHTML = `<em>Error: ${error.message}</em>`;

    // Add some fallback options
    const fallbackModels = [
      { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'openai/gpt-4o', name: 'GPT-4o' },
      { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
      { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku' }
    ];
    allModels = fallbackModels;
    renderModelOptions(fallbackModels);
  } finally {
    isLoadingModels = false;
    refreshModelsBtn.disabled = false;
    refreshModelsBtn.innerHTML = '↻';
  }
}

// Toggle settings panel
settingsBtn.addEventListener('click', () => {
  settingsPanel.classList.toggle('hidden');
  // Load models when opening settings if we have an API key
  if (!settingsPanel.classList.contains('hidden') && allModels.length === 0) {
    loadModels();
  }
});

// Refresh models button
refreshModelsBtn.addEventListener('click', () => {
  loadModels(true);
});

// Search input
modelSearch.addEventListener('input', () => {
  applyFilterAndSort();
});

// Sort select change
sortSelect.addEventListener('change', () => {
  setSortPreference(sortSelect.value);
  applyFilterAndSort();
});

// Model select change - update details
modelSelect.addEventListener('change', () => {
  const selectedId = modelSelect.value;
  const selectedModel = allModels.find(m => m.id === selectedId);
  updateModelDetails(selectedModel);
});

// API key input change - reload models
apiKeyInput.addEventListener('change', () => {
  if (apiKeyInput.value.trim()) {
    loadModels();
  }
});

// Save settings
saveSettingsBtn.addEventListener('click', () => {
  const apiKey = apiKeyInput.value.trim();
  const model = modelSelect.value;

  if (apiKey) {
    setApiKey(apiKey);
  }
  if (model) {
    setModel(model);
  }
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

// Load models on startup if we have an API key
if (hasApiKey()) {
  loadModels();
}
