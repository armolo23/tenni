# Claude Code Automation System

## Overview

This directory contains **Claude Code automation artifacts** that enhance the development workflow for the Tenni Tennis Portal project.

## Components

### 1. Slash Commands (Manual Triggers)

**Location**: `.claude/commands/`

Slash commands are **user-triggered workflows** defined as markdown files. They support:
- Argument passing (`$ARGUMENTS`, `$1`, `$2`)
- File inlining (`@file` syntax)
- Pre-execution scripts (`allowed-tools: Bash(...)`)
- XML-tagged prompts for structured outputs

**Available Commands:**

- `/schema-migrate` - Create and apply Directus schema snapshots
- `/api-test` - Test Directus API endpoints with sample requests
- `/deploy-staging` - Deploy to staging environment
- `/deploy-production` - Deploy to production (with safety checks)
- `/flow-export` - Export Directus Flow configurations
- `/db-backup` - Create PostgreSQL backup
- `/seed-data` - Populate database with sample data

### 2. Hooks (Automatic Triggers)

**Location**: `.claude/settings.json`

Hooks are **event-driven handlers** that execute automatically on lifecycle events:
- `UserPromptSubmit` - After user sends a message
- `PostToolUse` - After any tool execution
- `SessionStart` - When session begins

**Configured Hooks:**

- **Auto-Lint**: Runs ESLint on JavaScript/React files after edits
- **Auto-Type-Check**: Runs TypeScript compiler after frontend changes
- **Pre-Commit Validation**: Ensures tests pass before git commits
- **Session Start**: Displays project status and recent changes

### 3. Subagents (Specialized AI Agents)

**Location**: `.claude/subagents/`

Subagents are **specialized AI personalities** with isolated context windows for:
- Preventing context pollution
- Parallel execution of specialized tasks
- Domain expertise (security, testing, schema design)

**Available Subagents:**

- `schema-designer` - PostgreSQL/Directus schema design expert
- `security-reviewer` - Security vulnerability analysis
- `api-integrator` - Cal.com/Directus integration specialist
- `flow-builder` - Directus Flow configuration expert

## Directory Structure

```
.claude/
├── commands/                 # Slash commands (manual)
│   ├── schema-migrate.md
│   ├── api-test.md
│   ├── deploy-staging.md
│   ├── deploy-production.md
│   ├── flow-export.md
│   ├── db-backup.md
│   └── seed-data.md
├── subagents/               # Specialized AI agents
│   ├── schema-designer.md
│   ├── security-reviewer.md
│   ├── api-integrator.md
│   └── flow-builder.md
├── settings.json            # Hooks configuration
└── CLAUDE.md               # This file
```

## Slash Commands Reference

### /schema-migrate

**Purpose**: Create and apply Directus schema snapshots for version control

**Usage**:
```
/schema-migrate create
/schema-migrate apply <snapshot-file>
```

**Example**:
```
/schema-migrate create
# Creates backend/migrations/schema-snapshot-YYYY-MM-DD.yaml
```

### /api-test

**Purpose**: Test Directus API endpoints with authenticated requests

**Usage**:
```
/api-test <collection> <method> [data]
```

**Example**:
```
/api-test bookings GET
/api-test bookings POST '{"user_id": "uuid", "start_time": "2023-10-27T10:00:00Z"}'
```

### /deploy-staging

**Purpose**: Deploy application to staging environment

**Usage**:
```
/deploy-staging
```

**Actions**:
- Builds frontend (Vite)
- Applies database migrations
- Restarts Directus container
- Runs smoke tests

### /deploy-production

**Purpose**: Deploy to production with safety checks

**Usage**:
```
/deploy-production
```

**Safety Checks**:
- Confirms tests are passing
- Requires explicit user confirmation
- Creates automatic backup
- Validates environment variables

### /flow-export

**Purpose**: Export Directus Flow configurations as JSON

**Usage**:
```
/flow-export [flow-name]
```

**Example**:
```
/flow-export sync-booking
# Exports to backend/flows/sync-booking.json
```

### /db-backup

**Purpose**: Create PostgreSQL database backup

**Usage**:
```
/db-backup
```

**Output**: `backend/backups/tenni-YYYY-MM-DD-HHMMSS.sql`

### /seed-data

**Purpose**: Populate database with sample/test data

**Usage**:
```
/seed-data <dataset>
```

**Options**:
- `minimal` - Core data only (courts, tags)
- `demo` - Full demo dataset (users, bookings, media)
- `test` - Test fixtures for automated testing

## Hooks Configuration

### settings.json Structure

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "name": "session-start-status",
        "trigger": "first_prompt_only",
        "mode": "prompt",
        "prompt": "Display project health: git status, running containers, recent errors"
      }
    ],
    "PostToolUse": [
      {
        "name": "auto-lint-js",
        "trigger": {
          "tool": "Edit",
          "file_pattern": "**/*.{js,jsx}"
        },
        "mode": "command",
        "command": "cd frontend && npm run lint --fix {{file_path}}"
      },
      {
        "name": "auto-type-check",
        "trigger": {
          "tool": "Edit",
          "file_pattern": "frontend/**/*.{ts,tsx}"
        },
        "mode": "command",
        "command": "cd frontend && npm run type-check"
      }
    ]
  }
}
```

### Hook Modes

**Command Mode**: Execute shell command directly
```json
{
  "mode": "command",
  "command": "npm run lint {{file_path}}"
}
```

**Prompt Mode**: Let Claude decide how to handle
```json
{
  "mode": "prompt",
  "prompt": "Check if the edited file follows our coding standards"
}
```

## Subagents Reference

### schema-designer

**Expertise**: PostgreSQL schema design, Directus collection configuration

**Use Cases**:
- Designing new collections
- Optimizing indexes
- Relationship modeling
- Migration planning

**Allowed Tools**: Read, Write, Bash (database commands)

**Example Invocation**:
```
Launch schema-designer subagent to design the user_progress tracking collection
```

### security-reviewer

**Expertise**: Security vulnerability analysis, RBAC validation

**Use Cases**:
- Reviewing Directus permissions
- Analyzing API security
- Validating webhook authentication
- Checking for common vulnerabilities (XSS, SQLi, CSRF)

**Allowed Tools**: Read, Grep, Glob

**Example Invocation**:
```
Launch security-reviewer to audit the booking creation flow
```

### api-integrator

**Expertise**: Cal.com and Directus SDK integration

**Use Cases**:
- Implementing Cal.com embeds
- Configuring webhooks
- SDK authentication patterns
- API error handling

**Allowed Tools**: Read, Write, Edit, WebFetch

**Example Invocation**:
```
Launch api-integrator to implement the booking embed component
```

### flow-builder

**Expertise**: Directus Flow configuration and debugging

**Use Cases**:
- Designing Flow operations
- Webhook payload parsing
- Conditional logic
- Email/notification configuration

**Allowed Tools**: Read, Write, Bash (Directus CLI)

**Example Invocation**:
```
Launch flow-builder to create the booking confirmation email flow
```

## Best Practices

### When to Use Slash Commands

✅ **Use for**:
- Repetitive tasks (migrations, deployments)
- Multi-step workflows with consistent structure
- Tasks requiring specific argument formats
- Operations you want to document as runnable commands

❌ **Don't use for**:
- One-off exploratory tasks
- Tasks requiring human judgment
- Simple single-line commands

### When to Use Hooks

✅ **Use for**:
- Automatic quality checks (linting, type checking)
- Consistent enforcement (code standards)
- Audit trails (logging)
- Session initialization

❌ **Don't use for**:
- Long-running operations (> 10 seconds)
- Tasks requiring user input
- Operations with side effects (git commits, deployments)

### When to Use Subagents

✅ **Use for**:
- Complex, multi-step specialized tasks
- Domain-specific expertise (security, database design)
- Preventing main context pollution
- Parallel execution of independent work

❌ **Don't use for**:
- Simple queries
- Tasks requiring main context awareness
- Quick edits to existing code

## Maintenance

### Adding New Commands

1. Create markdown file in `.claude/commands/`
2. Name: `<command-name>.md`
3. Structure:
   ```markdown
   ---
   description: Brief description for /help menu
   ---

   # Command prompt content
   You can use $ARGUMENTS, $1, $2 for parameters
   You can inline files with @file syntax
   ```

### Adding New Subagents

1. Create markdown file in `.claude/subagents/`
2. Define system prompt and allowed tools
3. Test with `Task` tool invocation

### Updating Hooks

1. Edit `.claude/settings.json`
2. Test trigger conditions
3. Validate command execution or prompt behavior

## Monitoring & Debugging

### Hook Execution Logs

Hooks display feedback messages when triggered:
```
[Hook: auto-lint-js] Running ESLint on frontend/src/components/BookingForm.jsx
[Hook: auto-lint-js] ✓ No issues found
```

### Subagent Output

Subagent results are returned as structured reports. Check for:
- Recommendations
- Issues found
- Code examples
- Next steps

### Command Debugging

If a slash command fails:
1. Check command markdown syntax
2. Validate `allowed-tools` if using pre-execution
3. Test command logic manually
4. Review error messages in Claude response

## Quick Reference

```bash
# List all available commands
/help

# View command details
# (Just read the .md file)

# Invoke subagent via Task tool
# (In conversation with Claude)
"Launch the schema-designer subagent to..."

# Check hook status
# (Observe hook messages after tool use)

# Disable specific hook temporarily
# (Edit settings.json, comment out hook)
```

## Integration with Main Project

These automation tools are **project-specific** and designed for the Tenni Tennis Portal architecture:

- Commands reference `frontend/` and `backend/` directories
- Hooks assume Node.js tooling (npm, ESLint)
- Subagents understand Directus, Cal.com, React patterns
- All paths are relative to project root

## Version Control

**What to commit**:
- ✅ All `.claude/commands/*.md`
- ✅ All `.claude/subagents/*.md`
- ✅ `.claude/settings.json`
- ✅ `.claude/CLAUDE.md`

**What to ignore**:
- ❌ `.claude/cache/` (if exists)
- ❌ Temporary hook logs

---

**Last Updated**: 2025-11-17
**Claude Code Version**: Latest
**Automation Level**: Phase 2 Complete
