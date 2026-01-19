# Claude Agent Guide

This document provides instructions for AI agents (like Claude) working in this repository.

## Beads Task Tracking System

This repository uses [Beads](https://github.com/steveyegge/beads) for task tracking and memory persistence across coding sessions.

### Installation

Install Beads using one of these methods:

**Via install script (recommended):**
```bash
curl -fsSL https://raw.githubusercontent.com/steveyegge/beads/main/scripts/install.sh | bash
```

**Via npm:**
```bash
npm install -g @beads/bd
```

**Via Homebrew:**
```bash
brew install steveyegge/beads/bd
```

**Via Go:**
```bash
go install github.com/steveyegge/beads/cmd/bd@latest
```

### Basic Usage

**View all tasks:**
```bash
bd list
```

**See ready tasks (no blockers):**
```bash
bd ready
```

**View task details:**
```bash
bd show <task-id>
```

**Create a new task:**
```bash
bd create "Task title" -p 1  # Priority: 0=P0 (highest), 1=P1, 2=P2, etc.
```

**Update task status:**
```bash
bd update <task-id> --status in_progress
bd update <task-id> --status completed
```

**Add dependencies:**
```bash
bd dep add <child-task> <parent-task>  # child blocks on parent
```

**Sync database to JSONL:**
```bash
bd sync --flush-only
```

### Workflow

1. Check available tasks: `bd ready`
2. Pick a task and update status: `bd update <task-id> --status in_progress`
3. Complete the work
4. Mark as done: `bd update <task-id> --status completed`
5. Sync changes: `bd sync --flush-only`
6. Commit with git

### Task IDs

Tasks in this repository use the prefix `chat-` followed by a hash (e.g., `chat-1ad`, `chat-w11`).

### Files

- `.beads/issues.jsonl` - Task data (tracked in git)
- `.beads/beads.db` - Local SQLite cache (not tracked)
- `.beads/config.yaml` - Repository configuration
- `AGENTS.md` - Detailed agent workflow instructions

See `AGENTS.md` for the complete workflow and "landing the plane" instructions.
