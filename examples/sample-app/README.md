# Sample Todo App

A minimal todo application for testing `/cook` workflows.

## Quick Start

```bash
# Just open in browser
open index.html
# or
xdg-open index.html  # Linux
```

No build step. No dependencies. No server.

## Try These /cook Commands

### Well-done mode (new features)

```bash
# Add persistence
/cook Add localStorage persistence so tasks survive page refresh

# Add due dates
/cook Add due date field to tasks with overdue highlighting

# Add categories
/cook Add category tags to tasks with filter functionality
```

### Microwave mode (quick fixes)

```bash
# Fix: input doesn't clear
/cook Fix input field not clearing after adding a task --microwave

# Fix: empty tasks
/cook Add validation to prevent empty tasks from being added --microwave

# Fix: accidental deletes
/cook Add confirmation dialog before deleting a task --microwave
```

### Intentional bugs to fix

The app has some intentional issues for practice:

1. **Input doesn't clear** - After adding a task, the input field keeps the text
2. **Empty tasks allowed** - You can add tasks with no text
3. **No delete confirmation** - Tasks delete immediately without asking

## What to Observe

When you run `/cook` on this app:

1. **Phase 0** will find and parse `CLAUDE.md`
2. **Rules extracted** will include "no external dependencies", "sanitize input"
3. **Microwave blockers** - adding localStorage would trigger escalation (storage topic)
4. **Risk assessment** will be LOW for most changes

## Project Structure

```
sample-app/
├── CLAUDE.md      # Project rules (read by /cook)
├── README.md      # This file
├── index.html     # Main structure
├── app.js         # Application logic
└── style.css      # Styling
```
