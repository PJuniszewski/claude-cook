# claude-cook Project Rules

## Purpose

This repo contains `/cook` - a Claude Code custom command that enforces structured, multi-phase development workflows. Clone it, copy files, start cooking.

## Quick Start

```bash
# Copy to Claude Code config
cp -r .claude/commands ~/.claude/
cp -r .claude/skills ~/.claude/
cp -r .claude/templates ~/.claude/
cp -r .claude/agents ~/.claude/

# Run your first cook
/cook Add user authentication --well-done
```

## Project Conventions

### Folder Structure
```
.claude/
  commands/     # Command definitions (/cook, /dogfood)
  skills/       # Workflow implementations
  templates/    # Checklists, artifact templates
  agents/       # Chef definitions (reviewers)
examples/       # Sample cook runs
docs/           # Additional documentation
```

### Naming
- Chefs: `<role>_chef.md` (e.g., `engineer_chef.md`)
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
- /cook is NOT for "generate entire app"
- /cook does NOT replace human review
- If /cook slows you down, use `--microwave`

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "No CLAUDE.md found" | Create one or ignore (uses defaults) |
| Output too verbose | Use `--microwave` for quick fixes |
| Chef not activating | Check `.claude/agents/` has the file |
| Stuck in Phase 0 | Provide more project context |
| Artifact not created | Check `cook/` directory exists |
