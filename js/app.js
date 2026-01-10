/**
 * Main application entry point
 */

import { Chat } from './chat.js';
import { getApiKey, setApiKey, getModel, setModel, hasApiKey, getSortPreference, setSortPreference } from './storage.js';
import { getModels, sortModels, filterModels, formatModelForDisplay, getCacheAge, getFreeModels, isModelFree } from './models.js';

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
const modelCount = document.getElementById('model-count');
const loadMoreBtn = document.getElementById('load-more-btn');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const messagesContainer = document.getElementById('messages');
const sendBtn = document.getElementById('send-btn');

// State
let allModels = [];
let isLoadingModels = false;
let hasLoadedFullList = false;

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

    // Build display text
    let displayText = formatted.name;
    if (isModelFree(model)) {
      displayText = `🆓 ${displayText}`;
    }
    if (formatted.detailsText) {
      displayText += ` (${formatted.detailsText})`;
    }
    option.textContent = displayText;

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
  if (age && hasLoadedFullList) {
    cacheAgeSpan.textContent = `Updated ${age}`;
  } else {
    cacheAgeSpan.textContent = '';
  }
}

/**
 * Update the model count display
 */
function updateModelCount() {
  const freeCount = allModels.filter(m => isModelFree(m)).length;
  const totalCount = allModels.length;

  if (hasLoadedFullList) {
    modelCount.innerHTML = `<span class="free-badge">FREE</span> ${freeCount} free of ${totalCount} models`;
    loadMoreBtn.style.display = 'none';
  } else {
    modelCount.innerHTML = `<span class="free-badge">FREE</span> ${freeCount} free models`;
    loadMoreBtn.style.display = 'block';
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
  const isFree = isModelFree(model);
  const promptPrice = isFree ? 'Free' : (model.pricing?.prompt ? `$${(parseFloat(model.pricing.prompt) * 1000000).toFixed(2)}/M` : 'N/A');
  const completionPrice = isFree ? 'Free' : (model.pricing?.completion ? `$${(parseFloat(model.pricing.completion) * 1000000).toFixed(2)}/M` : 'N/A');
  const createdDate = formatted.createdDate || 'N/A';

  modelDetails.innerHTML = `
    <div class="detail-row">
      <span class="detail-label">Context:</span>
      <span class="detail-value">${contextK}k tokens</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Input Price:</span>
      <span class="detail-value">${promptPrice}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Output Price:</span>
      <span class="detail-value">${completionPrice}</span>
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
 * Load free models (no API key required)
 */
function loadFreeModels() {
  allModels = getFreeModels();
  hasLoadedFullList = false;

  updateModelCount();
  updateCacheAgeDisplay();
  applyFilterAndSort();

  console.log(`Loaded ${allModels.length} free models`);
}

/**
 * Load all models from API or cache (requires API key)
 * @param {boolean} forceRefresh - Force refresh from API
 */
async function loadAllModels(forceRefresh = false) {
  const apiKey = apiKeyInput.value.trim() || getApiKey();

  if (!apiKey) {
    modelDetails.innerHTML = '<em>Enter API key to load all models</em>';
    return;
  }

  isLoadingModels = true;
  refreshModelsBtn.disabled = true;
  loadMoreBtn.disabled = true;
  refreshModelsBtn.innerHTML = '<span class="loading-spinner">↻</span>';
  loadMoreBtn.textContent = 'Loading...';

  try {
    const result = await getModels(apiKey, forceRefresh);
    allModels = result.models;
    hasLoadedFullList = true;

    updateModelCount();
    updateCacheAgeDisplay();
    applyFilterAndSort();

    if (result.fromCache) {
      console.log(`Loaded ${allModels.length} models from cache`);
    } else {
      console.log(`Fetched ${allModels.length} models from API`);
    }
  } catch (error) {
    console.error('Failed to load models:', error);
    modelDetails.innerHTML = `<em>Error: ${error.message}</em>`;

    // Keep free models on error
    if (!hasLoadedFullList) {
      loadFreeModels();
    }
  } finally {
    isLoadingModels = false;
    refreshModelsBtn.disabled = false;
    loadMoreBtn.disabled = false;
    refreshModelsBtn.innerHTML = '↻';
    loadMoreBtn.textContent = 'Load all models (requires API key)';
  }
}

// Toggle settings panel
settingsBtn.addEventListener('click', () => {
  settingsPanel.classList.toggle('hidden');
  // Load free models when opening settings if we haven't loaded any
  if (!settingsPanel.classList.contains('hidden') && allModels.length === 0) {
    loadFreeModels();
    // Also load full list if we have an API key
    if (hasApiKey()) {
      loadAllModels();
    }
  }
});

// Refresh models button
refreshModelsBtn.addEventListener('click', () => {
  if (hasApiKey() || apiKeyInput.value.trim()) {
    loadAllModels(true);
  } else {
    loadFreeModels();
  }
});

// Load more button
loadMoreBtn.addEventListener('click', () => {
  const apiKey = apiKeyInput.value.trim() || getApiKey();
  if (!apiKey) {
    modelDetails.innerHTML = '<em>Please enter an API key first to load all models</em>';
    apiKeyInput.focus();
    return;
  }
  loadAllModels(false);
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

// API key input change - offer to load all models
apiKeyInput.addEventListener('change', () => {
  if (apiKeyInput.value.trim() && !hasLoadedFullList) {
    loadMoreBtn.textContent = 'Load all models';
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

// Load free models on startup (no API key needed)
loadFreeModels();

// If we have an API key cached, also load full list
if (hasApiKey()) {
  loadAllModels();
}
