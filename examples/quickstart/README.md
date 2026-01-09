# Quickstart Example

This example demonstrates a complete `/cook` workflow from feature request to cooked output.

## Scenario

You have a todo app and want to add a "due date" feature to tasks.

## Files in this example

1. **CLAUDE.md** - Project context file (required for best results)
2. **feature_request.md** - The feature we want to cook
3. **cooked_output.md** - What `/cook` produces

## How to run

```bash
# 1. In your project, ensure you have CLAUDE.md
cat CLAUDE.md

# 2. Invoke /cook with your feature
/cook Add due date field to tasks with reminder notifications

# 3. Review the cooked artifact
# Claude will produce output similar to cooked_output.md
```

## What happens

1. **Phase 0**: Claude reads your CLAUDE.md and extracts project rules
2. **Phase 1**: Product Chef evaluates scope and value
3. **Phase 2**: UX Chef reviews user experience
4. **Phase 3**: Architect Chef designs technical approach
5. **Phase 4**: Engineer Chef creates implementation plan
6. **Phase 5**: QA Chef defines test strategy
7. **Phase 6**: Security Chef audits for vulnerabilities
8. **Phase 7**: Final artifact is produced

## Key takeaways

- Good CLAUDE.md = better results
- Specific requests = specific output
- `/cook` stops you from coding too early
- The artifact is your implementation guide
