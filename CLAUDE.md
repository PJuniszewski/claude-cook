# juni Plugin Project Rules

## Purpose

This repo contains the **juni** plugin - a Claude Code plugin suite combining:
- `/juni:cook` - Structured feature development workflows
- `/juni:guard` - Epistemic safety for JSON data

## Architecture: Two-Layer Context System

Cook uses a **hybrid approach** combining narrative context with operational contracts:

```
┌─────────────────────────────────────────────────────────┐
│ CLAUDE.md or AGENTS.md (Narrative Layer)                │
│ "What we build, why, how we work"                       │
│ → Global project context, loaded in Phase 0             │
└─────────────────────────────────────────────────────────┘
                         ↓
              Phase 0: Load project context
                         ↓
┌─────────────────────────────────────────────────────────┐
│ .claude/agents/*_chef.md (Operational Layer)            │
│ non_negotiables, escalation, rubric, output_contract    │
│ → Per-phase contracts, loaded before each step          │
└─────────────────────────────────────────────────────────┘
```

**Narrative file resolution:**
1. `CLAUDE.md` - Claude Code native format (preferred)
2. `AGENTS.md` - Vercel/industry convention (supported)
3. `README.md` - fallback if neither exists

**Why two layers?**

| Layer | Purpose | When Loaded |
|-------|---------|-------------|
| CLAUDE.md / AGENTS.md | Narrative context - goals, architecture, conventions | Once at start (Phase 0) |
| Chefs | Operational contracts - rules, escalations, outputs | Per-phase as needed |

This combines the cognitive benefits of global context (like AGENTS.md) with the operational rigor of contractual skills.

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
- Chefs: `<role>_chef.md` in `.claude/agents/` (e.g., `engineer_chef.md`)
- Orders: `<order_id>.order.md` in `orders/` (no dates in filename)
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

| Chef | Responsibility | phase_affinity |
|------|----------------|----------------|
| product_chef | Scope, value, priorities | scope |
| ux_chef | User flows, UI impact | ux |
| architect_chef | System impact, alternatives | plan |
| engineer_chef | Implementation plan | plan |
| qa_chef | Test plan, edge cases | test |
| security_chef | Threat assessment | security |
| docs_chef | Documentation updates | docs |
| release_chef | Versioning, changelog | release |
| sanitation_inspector_chef | Post-implementation review | inspect |
| sous_chef | Background monitoring | monitor |

All chefs output reviews using `review_v1` format. See [REVIEW_CONTRACT.md](REVIEW_CONTRACT.md).
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
| Order not created | Check `orders/` directory exists |
