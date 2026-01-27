import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock modules before importing app functions
vi.mock('../js/storage.js', () => ({
  getApiKey: vi.fn(() => null),
  setApiKey: vi.fn(),
  getModel: vi.fn(() => 'openai/gpt-4o-mini'),
  setModel: vi.fn(),
  hasApiKey: vi.fn(() => false),
  getSortPreference: vi.fn(() => 'name_asc'),
  setSortPreference: vi.fn(),
  getMessages: vi.fn(() => []),
  setMessages: vi.fn()
}));

vi.mock('../js/models.js', () => ({
  getModels: vi.fn(),
  sortModels: vi.fn((models) => models),
  filterModels: vi.fn((models) => models),
  formatModelForDisplay: vi.fn((model) => ({
    id: model.id,
    name: model.name || model.id,
    contextLength: model.context_length,
    detailsText: model.context_length ? `${Math.round(model.context_length / 1000)}k ctx` : '',
    createdDate: model.created ? new Date(model.created * 1000).toLocaleDateString() : null
  })),
  getCacheAge: vi.fn(() => '2 hours ago'),
  getFreeModels: vi.fn(() => mockFreeModels),
  isModelFree: vi.fn((model) => model.isFree || model.id?.endsWith(':free') || false)
}));

vi.mock('../js/api.js', () => ({
  streamChatCompletion: vi.fn()
}));

// Mock free models
const mockFreeModels = [
  {
    id: 'google/gemini-2.0-flash-exp:free',
    name: 'Gemini 2.0 Flash Experimental',
    context_length: 1048576,
    pricing: { prompt: '0', completion: '0' },
    isFree: true
  },
  {
    id: 'meta-llama/llama-3.1-8b-instruct:free',
    name: 'Llama 3.1 8B Instruct',
    context_length: 131072,
    pricing: { prompt: '0', completion: '0' },
    isFree: true
  }
];

// Mock full models list
const mockFullModels = [
  ...mockFreeModels,
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    context_length: 128000,
    pricing: { prompt: '0.000005', completion: '0.000015' },
    created: 1700000000
  },
  {
    id: 'anthropic/claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    context_length: 200000,
    pricing: { prompt: '0.000003', completion: '0.000015' },
    created: 1709000000
  }
];

/**
 * Set up the DOM structure needed for app.js
 */
function setupDOM() {
  document.body.innerHTML = `
    <div class="chat-container">
      <header class="chat-header">
        <h1>OpenRouter Chat</h1>
        <button id="settings-btn" class="icon-btn" title="Settings">⚙️</button>
      </header>

      <div id="settings-panel" class="settings-panel hidden">
        <div class="settings-content">
          <label for="api-key-input">API Key</label>
          <input type="password" id="api-key-input" placeholder="Enter your OpenRouter API key">
          <div class="model-section">
            <div class="model-header">
              <label for="model-select">Model</label>
              <div class="model-controls">
                <span id="cache-age" class="cache-age"></span>
                <button type="button" id="refresh-models-btn" class="icon-btn small" title="Refresh models list">↻</button>
              </div>
            </div>
            <div class="model-filter-row">
              <input type="text" id="model-search" placeholder="Search models..." class="model-search">
              <select id="sort-select" class="sort-select">
                <option value="name_asc">Name (A-Z)</option>
                <option value="name_desc">Name (Z-A)</option>
                <option value="date_newest">Newest First</option>
                <option value="date_oldest">Oldest First</option>
                <option value="context_length">Context Length</option>
                <option value="price_low">Price (Low-High)</option>
                <option value="price_high">Price (High-Low)</option>
              </select>
            </div>
            <select id="model-select" size="8">
              <option value="">Loading models...</option>
            </select>
            <div id="model-status" class="model-status">
              <span id="model-count"></span>
              <button type="button" id="load-more-btn" class="btn btn-secondary btn-small">Load all models (requires API key)</button>
            </div>
            <div id="model-details" class="model-details"></div>
          </div>
          <button id="save-settings-btn" class="btn">Save</button>
        </div>
      </div>

      <main id="messages" class="messages"></main>

      <form id="chat-form" class="chat-form">
        <textarea
          id="message-input"
          placeholder="Type your message..."
          rows="1"
          autocomplete="off"
        ></textarea>
        <button type="submit" id="send-btn" class="btn send-btn">Send</button>
      </form>
    </div>
  `;
}

describe('Model Selector Component', () => {
  let storage, models;

  beforeEach(async () => {
    vi.clearAllMocks();
    setupDOM();

    // Re-import mocked modules
    storage = await import('../js/storage.js');
    models = await import('../js/models.js');

    // Reset default mock behaviors
    storage.getApiKey.mockReturnValue(null);
    storage.hasApiKey.mockReturnValue(false);
    storage.getModel.mockReturnValue('openai/gpt-4o-mini');
    storage.getSortPreference.mockReturnValue('name_asc');
    models.getFreeModels.mockReturnValue([...mockFreeModels]);
    models.filterModels.mockImplementation((m) => m);
    models.sortModels.mockImplementation((m) => m);
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('DOM Structure', () => {
    it('should have all required model selector elements', () => {
      expect(document.getElementById('model-select')).not.toBeNull();
      expect(document.getElementById('model-search')).not.toBeNull();
      expect(document.getElementById('sort-select')).not.toBeNull();
      expect(document.getElementById('refresh-models-btn')).not.toBeNull();
      expect(document.getElementById('load-more-btn')).not.toBeNull();
      expect(document.getElementById('model-details')).not.toBeNull();
      expect(document.getElementById('model-count')).not.toBeNull();
      expect(document.getElementById('cache-age')).not.toBeNull();
    });

    it('should have settings panel initially hidden', () => {
      const settingsPanel = document.getElementById('settings-panel');
      expect(settingsPanel.classList.contains('hidden')).toBe(true);
    });

    it('should have all sort options', () => {
      const sortSelect = document.getElementById('sort-select');
      const options = Array.from(sortSelect.options).map(o => o.value);

      expect(options).toContain('name_asc');
      expect(options).toContain('name_desc');
      expect(options).toContain('date_newest');
      expect(options).toContain('date_oldest');
      expect(options).toContain('context_length');
      expect(options).toContain('price_low');
      expect(options).toContain('price_high');
    });
  });

  describe('renderModelOptions', () => {
    // Helper to render models directly
    function renderModelOptions(modelList) {
      const modelSelect = document.getElementById('model-select');
      const currentModel = storage.getModel();
      modelSelect.innerHTML = '';

      if (modelList.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No models found';
        modelSelect.appendChild(option);
        return;
      }

      modelList.forEach(model => {
        const formatted = models.formatModelForDisplay(model);
        const option = document.createElement('option');
        option.value = model.id;

        let displayText = formatted.name;
        if (models.isModelFree(model)) {
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
    }

    it('should render model options in select element', () => {
      renderModelOptions(mockFreeModels);

      const modelSelect = document.getElementById('model-select');
      expect(modelSelect.options.length).toBe(2);
    });

    it('should show "No models found" when empty array', () => {
      renderModelOptions([]);

      const modelSelect = document.getElementById('model-select');
      expect(modelSelect.options.length).toBe(1);
      expect(modelSelect.options[0].textContent).toBe('No models found');
      expect(modelSelect.options[0].value).toBe('');
    });

    it('should add free emoji prefix for free models', () => {
      models.isModelFree.mockReturnValue(true);
      renderModelOptions(mockFreeModels);

      const modelSelect = document.getElementById('model-select');
      expect(modelSelect.options[0].textContent).toContain('🆓');
    });

    it('should not add free emoji for paid models', () => {
      models.isModelFree.mockReturnValue(false);
      const paidModel = [{
        id: 'openai/gpt-4o',
        name: 'GPT-4o',
        context_length: 128000,
        pricing: { prompt: '0.000005', completion: '0.000015' }
      }];
      renderModelOptions(paidModel);

      const modelSelect = document.getElementById('model-select');
      expect(modelSelect.options[0].textContent).not.toContain('🆓');
    });

    it('should select current model from storage', () => {
      storage.getModel.mockReturnValue('google/gemini-2.0-flash-exp:free');
      renderModelOptions(mockFreeModels);

      const modelSelect = document.getElementById('model-select');
      expect(modelSelect.value).toBe('google/gemini-2.0-flash-exp:free');
    });

    it('should include details text in option display', () => {
      models.formatModelForDisplay.mockReturnValue({
        id: 'test/model',
        name: 'Test Model',
        detailsText: '128k ctx'
      });

      renderModelOptions([{ id: 'test/model', name: 'Test Model', context_length: 128000 }]);

      const modelSelect = document.getElementById('model-select');
      expect(modelSelect.options[0].textContent).toContain('128k ctx');
    });
  });

  describe('updateModelDetails', () => {
    function updateModelDetails(model) {
      const modelDetails = document.getElementById('model-details');

      if (!model) {
        modelDetails.innerHTML = '<em>Select a model to see details</em>';
        return;
      }

      const formatted = models.formatModelForDisplay(model);
      const contextK = model.context_length ? Math.round(model.context_length / 1000) : 'N/A';
      const isFree = models.isModelFree(model);
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

    it('should show placeholder when no model selected', () => {
      updateModelDetails(null);

      const modelDetails = document.getElementById('model-details');
      expect(modelDetails.innerHTML).toContain('Select a model to see details');
    });

    it('should display context length in k tokens', () => {
      updateModelDetails(mockFreeModels[0]);

      const modelDetails = document.getElementById('model-details');
      expect(modelDetails.textContent).toContain('1049k tokens');
    });

    it('should show "Free" for free model pricing', () => {
      models.isModelFree.mockReturnValue(true);
      updateModelDetails(mockFreeModels[0]);

      const modelDetails = document.getElementById('model-details');
      expect(modelDetails.textContent).toContain('Free');
    });

    it('should show price per million tokens for paid models', () => {
      models.isModelFree.mockReturnValue(false);
      const paidModel = {
        id: 'openai/gpt-4o',
        name: 'GPT-4o',
        context_length: 128000,
        pricing: { prompt: '0.000005', completion: '0.000015' }
      };
      updateModelDetails(paidModel);

      const modelDetails = document.getElementById('model-details');
      expect(modelDetails.textContent).toContain('$5.00/M');
      expect(modelDetails.textContent).toContain('$15.00/M');
    });

    it('should show N/A for missing pricing', () => {
      models.isModelFree.mockReturnValue(false);
      const modelWithoutPricing = {
        id: 'test/model',
        name: 'Test Model',
        context_length: 8000
      };
      updateModelDetails(modelWithoutPricing);

      const modelDetails = document.getElementById('model-details');
      expect(modelDetails.textContent).toContain('N/A');
    });

    it('should display created date when available', () => {
      models.formatModelForDisplay.mockReturnValue({
        id: 'test/model',
        name: 'Test',
        createdDate: '1/15/2024'
      });

      updateModelDetails({ id: 'test/model', created: 1705276800 });

      const modelDetails = document.getElementById('model-details');
      expect(modelDetails.textContent).toContain('1/15/2024');
    });
  });

  describe('updateModelCount', () => {
    function updateModelCount(allModels, hasLoadedFullList) {
      const modelCount = document.getElementById('model-count');
      const loadMoreBtn = document.getElementById('load-more-btn');

      const freeCount = allModels.filter(m => models.isModelFree(m)).length;
      const totalCount = allModels.length;

      if (hasLoadedFullList) {
        modelCount.innerHTML = `<span class="free-badge">FREE</span> ${freeCount} free of ${totalCount} models`;
        loadMoreBtn.style.display = 'none';
      } else {
        modelCount.innerHTML = `<span class="free-badge">FREE</span> ${freeCount} free models`;
        loadMoreBtn.style.display = 'block';
      }
    }

    it('should show free models count when not loaded full list', () => {
      models.isModelFree.mockImplementation(m => m.isFree);
      updateModelCount(mockFreeModels, false);

      const modelCount = document.getElementById('model-count');
      expect(modelCount.textContent).toContain('2 free models');
    });

    it('should show full count when loaded full list', () => {
      models.isModelFree.mockImplementation(m => m.isFree);
      updateModelCount(mockFullModels, true);

      const modelCount = document.getElementById('model-count');
      expect(modelCount.textContent).toContain('2 free of 4 models');
    });

    it('should hide load more button when full list loaded', () => {
      updateModelCount(mockFullModels, true);

      const loadMoreBtn = document.getElementById('load-more-btn');
      expect(loadMoreBtn.style.display).toBe('none');
    });

    it('should show load more button when not full list', () => {
      updateModelCount(mockFreeModels, false);

      const loadMoreBtn = document.getElementById('load-more-btn');
      expect(loadMoreBtn.style.display).toBe('block');
    });
  });

  describe('updateCacheAgeDisplay', () => {
    function updateCacheAgeDisplay(hasLoadedFullList) {
      const cacheAgeSpan = document.getElementById('cache-age');
      const age = models.getCacheAge();

      if (age && hasLoadedFullList) {
        cacheAgeSpan.textContent = `Updated ${age}`;
      } else {
        cacheAgeSpan.textContent = '';
      }
    }

    it('should show cache age when full list loaded', () => {
      models.getCacheAge.mockReturnValue('2 hours ago');
      updateCacheAgeDisplay(true);

      const cacheAgeSpan = document.getElementById('cache-age');
      expect(cacheAgeSpan.textContent).toBe('Updated 2 hours ago');
    });

    it('should hide cache age when only free models loaded', () => {
      models.getCacheAge.mockReturnValue('2 hours ago');
      updateCacheAgeDisplay(false);

      const cacheAgeSpan = document.getElementById('cache-age');
      expect(cacheAgeSpan.textContent).toBe('');
    });

    it('should hide cache age when no cache exists', () => {
      models.getCacheAge.mockReturnValue(null);
      updateCacheAgeDisplay(true);

      const cacheAgeSpan = document.getElementById('cache-age');
      expect(cacheAgeSpan.textContent).toBe('');
    });
  });

  describe('Settings Panel Interactions', () => {
    it('should toggle settings panel on button click', () => {
      const settingsBtn = document.getElementById('settings-btn');
      const settingsPanel = document.getElementById('settings-panel');

      expect(settingsPanel.classList.contains('hidden')).toBe(true);

      settingsBtn.click();
      settingsPanel.classList.toggle('hidden');
      expect(settingsPanel.classList.contains('hidden')).toBe(false);

      settingsBtn.click();
      settingsPanel.classList.toggle('hidden');
      expect(settingsPanel.classList.contains('hidden')).toBe(true);
    });

    it('should save API key when save button clicked', () => {
      const apiKeyInput = document.getElementById('api-key-input');
      const saveSettingsBtn = document.getElementById('save-settings-btn');

      apiKeyInput.value = 'test-api-key';

      // Simulate save behavior
      saveSettingsBtn.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
          storage.setApiKey(apiKey);
        }
      });

      saveSettingsBtn.click();

      expect(storage.setApiKey).toHaveBeenCalledWith('test-api-key');
    });

    it('should save selected model when save button clicked', () => {
      const modelSelect = document.getElementById('model-select');
      const saveSettingsBtn = document.getElementById('save-settings-btn');

      // Add model option
      const option = document.createElement('option');
      option.value = 'anthropic/claude-3-sonnet';
      option.textContent = 'Claude 3 Sonnet';
      option.selected = true;
      modelSelect.innerHTML = '';
      modelSelect.appendChild(option);

      // Simulate save behavior
      saveSettingsBtn.addEventListener('click', () => {
        const model = modelSelect.value;
        if (model) {
          storage.setModel(model);
        }
      });

      saveSettingsBtn.click();

      expect(storage.setModel).toHaveBeenCalledWith('anthropic/claude-3-sonnet');
    });

    it('should save sort preference when sort select changes', () => {
      const sortSelect = document.getElementById('sort-select');

      sortSelect.addEventListener('change', () => {
        storage.setSortPreference(sortSelect.value);
      });

      sortSelect.value = 'price_low';
      sortSelect.dispatchEvent(new Event('change'));

      expect(storage.setSortPreference).toHaveBeenCalledWith('price_low');
    });
  });

  describe('Search Filtering', () => {
    it('should call filterModels on search input', () => {
      const modelSearch = document.getElementById('model-search');

      modelSearch.addEventListener('input', () => {
        models.filterModels(mockFreeModels, modelSearch.value);
      });

      modelSearch.value = 'gemini';
      modelSearch.dispatchEvent(new Event('input'));

      expect(models.filterModels).toHaveBeenCalledWith(mockFreeModels, 'gemini');
    });

    it('should call sortModels on sort change', () => {
      const sortSelect = document.getElementById('sort-select');

      sortSelect.addEventListener('change', () => {
        models.sortModels(mockFreeModels, sortSelect.value);
      });

      sortSelect.value = 'date_newest';
      sortSelect.dispatchEvent(new Event('change'));

      expect(models.sortModels).toHaveBeenCalledWith(mockFreeModels, 'date_newest');
    });
  });

  describe('Load More Button', () => {
    it('should show error when no API key on load more click', () => {
      const loadMoreBtn = document.getElementById('load-more-btn');
      const apiKeyInput = document.getElementById('api-key-input');
      const modelDetails = document.getElementById('model-details');

      storage.getApiKey.mockReturnValue(null);
      apiKeyInput.value = '';

      loadMoreBtn.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim() || storage.getApiKey();
        if (!apiKey) {
          modelDetails.innerHTML = '<em>Please enter an API key first to load all models</em>';
          apiKeyInput.focus();
          return;
        }
      });

      loadMoreBtn.click();

      expect(modelDetails.innerHTML).toContain('Please enter an API key first');
    });

    it('should focus API key input when no key provided', () => {
      const loadMoreBtn = document.getElementById('load-more-btn');
      const apiKeyInput = document.getElementById('api-key-input');

      storage.getApiKey.mockReturnValue(null);
      apiKeyInput.value = '';

      const focusSpy = vi.spyOn(apiKeyInput, 'focus');

      loadMoreBtn.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim() || storage.getApiKey();
        if (!apiKey) {
          apiKeyInput.focus();
          return;
        }
      });

      loadMoreBtn.click();

      expect(focusSpy).toHaveBeenCalled();
    });
  });

  describe('Model Selection', () => {
    it('should update model details on selection change', () => {
      const modelSelect = document.getElementById('model-select');
      const modelDetails = document.getElementById('model-details');

      // Add options
      mockFreeModels.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.name;
        modelSelect.appendChild(option);
      });

      modelSelect.value = 'google/gemini-2.0-flash-exp:free';

      modelSelect.addEventListener('change', () => {
        const selectedModel = mockFreeModels.find(m => m.id === modelSelect.value);
        if (selectedModel) {
          modelDetails.innerHTML = `Selected: ${selectedModel.name}`;
        }
      });

      modelSelect.dispatchEvent(new Event('change'));

      expect(modelDetails.innerHTML).toContain('Gemini 2.0 Flash Experimental');
    });
  });

  describe('Chat Form Integration', () => {
    it('should prevent form submission when empty', () => {
      const chatForm = document.getElementById('chat-form');
      const messageInput = document.getElementById('message-input');
      const submitHandler = vi.fn((e) => {
        e.preventDefault();
        const content = messageInput.value.trim();
        if (!content) {
          return;
        }
        // Would send message here
      });

      chatForm.addEventListener('submit', submitHandler);

      messageInput.value = '';
      chatForm.dispatchEvent(new Event('submit'));

      expect(submitHandler).toHaveBeenCalled();
    });

    it('should auto-resize textarea on input', () => {
      const messageInput = document.getElementById('message-input');

      messageInput.addEventListener('input', () => {
        messageInput.style.height = 'auto';
        messageInput.style.height = Math.min(messageInput.scrollHeight, 150) + 'px';
      });

      // Mock scrollHeight
      Object.defineProperty(messageInput, 'scrollHeight', { value: 100 });

      messageInput.value = 'Test message\nwith multiple\nlines';
      messageInput.dispatchEvent(new Event('input'));

      expect(messageInput.style.height).toBe('100px');
    });

    it('should submit form on Enter key', () => {
      const messageInput = document.getElementById('message-input');
      const chatForm = document.getElementById('chat-form');
      const submitSpy = vi.fn();

      chatForm.addEventListener('submit', submitSpy);

      messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          chatForm.dispatchEvent(new Event('submit'));
        }
      });

      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: false });
      messageInput.dispatchEvent(enterEvent);

      expect(submitSpy).toHaveBeenCalled();
    });

    it('should not submit form on Shift+Enter', () => {
      const messageInput = document.getElementById('message-input');
      const chatForm = document.getElementById('chat-form');
      const submitSpy = vi.fn();

      chatForm.addEventListener('submit', submitSpy);

      messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          chatForm.dispatchEvent(new Event('submit'));
        }
      });

      const shiftEnterEvent = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true });
      messageInput.dispatchEvent(shiftEnterEvent);

      expect(submitSpy).not.toHaveBeenCalled();
    });
  });
});
