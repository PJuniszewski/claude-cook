# juni Plugin Project Rules

## Purpose

This repo contains the **juni** plugin - a Claude Code plugin suite combining:
- `/juni:cook` - Structured feature development workflows
- `/juni:guard` - Epistemic safety for JSON data

## Quick Start

```bash
# Install from marketplace
claude /plugin install juni-skills:juni
claude /plugin enable juni

# Run commands
/juni:cook Add user authentication --well-done
/juni:guard data.json
```

## Project Conventions

### Folder Structure
```
.claude/
  commands/     # Command definitions (/juni:cook, /juni:guard, etc.)
  skills/       # Workflow implementations
  templates/    # Checklists, artifact templates
  agents/       # Chef definitions (reviewers)
  hooks/        # Event hooks
scripts/        # Python/bash scripts
examples/       # Sample cook runs
docs/           # Additional documentation
```

### Naming
- Chefs: `<role>_chef.md` (e.g., `engineer_chef.md`)
- Agents use `juni:` prefix (e.g., `juni:engineer_chef`)
- Artifacts: `<slug>.<date>.cook.md`
- Templates: lowercase with hyphens

## Definition of Done (well-done)

A feature is "well-done" when:
1. Problem statement + scope defined
2. Assumptions + non-goals listed
3. Options evaluated, decision made
4. Implementation plan exists
5. Test plan exists
6. Docs updates identified
7. Risks listed with mitigations

See [COOK_CONTRACT.md](COOK_CONTRACT.md) for full contract.

## Chefs (Roles)

| Chef | Responsibility | When Active |
|------|----------------|-------------|
| product_chef | Scope, value, priorities | Phase 2 (Scope) |
| ux_chef | User flows, UI impact | Phase 3 (UX) |
| engineer_chef | Implementation plan | Phase 4 (Cooking) |
| architect_chef | System impact, alternatives | Phase 4 (Cooking) |
| qa_chef | Test plan, edge cases | Phase 5 (QA) |
| security_chef | Threat assessment | Phase 6 (Security) |
| docs_chef | Documentation updates | Phase 7 (Docs) |
| release_chef | Versioning, changelog | Post-cooking |

See [CHEF_MATRIX.md](CHEF_MATRIX.md) for inputs/outputs.

## Anti-patterns

See [ANTI_PATTERNS.md](ANTI_PATTERNS.md). Key points:
- /juni:cook is NOT for "generate entire app"
- /juni:cook does NOT replace human review
- If /juni:cook slows you down, use `--microwave`

## Tasks API Integration

Since Claude Code v2.1.16, `/juni:cook` uses the Tasks API for progress tracking:

- Each cook phase creates a Task visible in `/tasks`
- Phases are linked via `blockedBy` to enforce sequence
- Progress persists across sessions
- Use `[cook]` prefix to identify cook-related tasks

**Note:** Tasks complement artifacts - artifact is the source of truth for decisions, Tasks provide visibility.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "No CLAUDE.md found" | Create one or ignore (uses defaults) |
| Output too verbose | Use `--microwave` for quick fixes |
| Chef not activating | Check `.claude/agents/` has the file |
| Stuck in Phase 0 | Provide more project context |
| Artifact not created | Check `cook/` directory exists |
