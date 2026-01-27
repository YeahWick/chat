# OpenRouter Chat Client

A minimal, lightweight chat web client for the [OpenRouter API](https://openrouter.ai/) with streaming support.

## Features

- Streaming chat responses with real-time updates
- Dynamic model selector with search and sorting
- Free models available without API key
- Full model list with caching (requires API key)
- Persistent conversation history via localStorage
- Keyboard shortcuts (Enter to send, Shift+Enter for newline, Escape to stop)
- Dark theme UI

## Quick Start

### Prerequisites

- Node.js 18+ (for development/testing)
- An [OpenRouter API key](https://openrouter.ai/keys) (optional for free models)

### Installation

```bash
# Clone the repository
git clone https://github.com/YeahWick/chat.git
cd chat

# Install dependencies (for testing only)
npm install
```

### Running Locally

```bash
# Start a local server
npm run serve

# Or use any static file server
npx serve .
python -m http.server 8000
```

Then open `http://localhost:3000` (or the port shown) in your browser.

### Configuration

1. Click the settings button (gear icon) in the top right
2. Enter your OpenRouter API key (optional - free models work without a key)
3. Select a model from the dropdown
4. Click "Save"

## Development

### Project Structure

```
chat/
├── js/
│   ├── app.js      # UI initialization and event handling
│   ├── api.js      # OpenRouter API client with streaming
│   ├── chat.js     # Chat conversation management
│   ├── models.js   # Model fetching, caching, sorting
│   └── storage.js  # LocalStorage management
├── css/
│   └── style.css   # Dark theme styling
├── tests/          # Unit tests
├── index.html      # Main entry point
└── package.json
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage report
npm run test:coverage
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm test` | Run all tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run serve` | Start local development server |

## Task Tracking

This project uses [Beads](https://github.com/steveyegge/beads) for task tracking. See `CLAUDE.md` and `AGENTS.md` for details.

```bash
# View available tasks
bd ready

# View all tasks
bd list
```

## License

MIT
