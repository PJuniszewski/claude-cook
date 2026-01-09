# Sample Todo App - Project Rules

## Overview
A minimal todo list application for testing `/cook` workflows.

## Tech Stack
- HTML5
- Vanilla JavaScript (ES6+)
- CSS3

## Conventions

### Code Style
- Use `const` and `let`, never `var`
- Use arrow functions for callbacks
- Use template literals for HTML generation
- No inline styles - all styling in style.css

### File Structure
```
index.html    # Main HTML structure
app.js        # All application logic
style.css     # All styling
```

### Naming
- Functions: camelCase (`addTask`, `deleteTask`)
- CSS classes: kebab-case (`task-item`, `btn-primary`)
- IDs: kebab-case (`task-input`, `task-list`)

## Hard Rules
- No external dependencies (no npm, no CDN)
- Must work by opening index.html directly
- No localStorage (yet - this is a feature hole)
- All user input must be sanitized before rendering

## Testing
- Manual testing only (open in browser)
- Test in Chrome and Firefox minimum

## Known Feature Holes

These are intentional gaps for practicing `/cook`:

### Well-done candidates
- Task persistence (localStorage)
- Due dates
- Categories/tags
- Task editing

### Microwave candidates
- Input doesn't clear after adding task
- Empty tasks can be added (no validation)
- No confirmation before delete
