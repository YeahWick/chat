# OpenRouter Chat Client - Development Plan

This document outlines planned features and improvements for the OpenRouter Chat Client.

## Completed Tasks

- [x] **chat-1ad**: Add unit tests for model selector component (35 tests added)
- [x] **chat-w11**: Update README with setup instructions

## Planned Features (Priority Order)

### P1 - High Priority

#### 1. System Message Support
Add ability to set custom system prompts for conversations.
- Add system message input field in settings
- Store system message in localStorage
- Include system message in API requests
- Allow per-conversation system messages

#### 2. Conversation Management
Enable saving and loading multiple conversations.
- Add conversation list sidebar
- Create/rename/delete conversations
- Auto-save conversations with timestamps
- Switch between conversations
- Search conversation history

#### 3. Error Handling Improvements
Better error recovery and user feedback.
- Implement retry logic with exponential backoff
- Show user-friendly error messages (not raw API errors)
- Add network connectivity indicator
- Handle rate limiting gracefully
- Clear error recovery paths

### P2 - Medium Priority

#### 4. Message Features
Improve message display and interaction.
- Copy message to clipboard button
- Markdown rendering in messages
- Code syntax highlighting (using highlight.js or Prism)
- Message timestamps
- Edit/delete messages

#### 5. Settings UI Enhancements
More control over model parameters.
- Temperature slider (0-2)
- Max tokens setting
- Top-p/nucleus sampling
- Frequency/presence penalty
- Model-specific presets

#### 6. Accessibility Improvements
WCAG compliance and keyboard navigation.
- Add ARIA labels to all interactive elements
- Implement full keyboard navigation for model selector
- Focus management and tab order
- Screen reader testing
- High contrast mode

#### 7. Performance Optimizations
Improve responsiveness for large model lists and conversations.
- Debounce search filter (300ms delay)
- Paginate model list (show 50 at a time)
- Virtual scrolling for long conversations
- Lazy-load model metadata
- Request deduplication

### P3 - Nice to Have

#### 8. Conversation Export
Export conversations in various formats.
- Export as JSON (full data)
- Export as Markdown (formatted)
- Export as plain text
- Import conversations

#### 9. Theme Customization
User interface personalization.
- Light/dark theme toggle
- Custom accent colors
- Font size controls
- Compact/comfortable message density

#### 10. Advanced Model Features
Enhanced model selection experience.
- Model comparison view (side-by-side)
- Favorite models list
- Recently used models
- Model performance metrics (latency, quality)
- Model capability tags (vision, function calling, etc.)

## Architecture Notes

### Current Strengths to Maintain
- Modular design with clear separation of concerns
- Comprehensive unit test coverage
- localStorage-based persistence (no backend required)
- Streaming architecture for real-time responses

### Technical Debt to Address
- Global state in app.js (consider state management pattern)
- Magic numbers (extract to constants)
- Mixed concerns in app.js (consider splitting UI/logic)

## Implementation Order

Recommended sequence based on dependencies and impact:

1. **System Message Support** - Quick win, high value
2. **Error Handling** - Improves reliability before adding features
3. **Message Features** (copy/markdown) - High visibility UX improvements
4. **Settings UI** - Unlocks power user workflows
5. **Conversation Management** - Major feature, requires careful design
6. **Accessibility** - Important for broader adoption
7. **Performance** - Optimize based on actual usage patterns
8. **Export/Theme** - Polish features

## Notes

This plan is maintained alongside the Beads task tracking system. Individual tasks will be created in `.beads/issues.jsonl` as work begins on each feature.
