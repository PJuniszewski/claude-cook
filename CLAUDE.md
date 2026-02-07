# juni Plugin Project Rules

## Purpose

This repo contains the **juni** plugin - a Claude Code plugin suite combining:
- `/juni:cook` - Structured feature development workflows
- `/juni:guard` - Epistemic safety for JSON data

## Architecture: Multi-Layer Context System

Cook uses a **layered approach** combining narrative context with operational contracts and explicit policies:

```
┌─────────────────────────────────────────────────────────┐
│ CLAUDE.md / AGENTS.md (Narrative Layer)                 │
│ "What we build, why, how we work"                       │
│ → Global project context, loaded in Phase 0             │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ ROUTER_POLICY.md (Router/Policy Layer)                  │
│ "Who decides when"                                      │
│ → Phase routing, escalation paths, conflict resolution  │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ .claude/agents/*_chef.md (Operational Layer)            │
│ non_negotiables, escalation, rubric, output_contract    │
│ → Per-phase contracts, loaded before each step          │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ CHEF_CONTRACTS.md (Handoff Layer)                       │
│ "What is passed to whom"                                │
│ → Input/output contracts, handoff validation            │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ FALLBACK_POLICY.md (Fallback Layer)                     │
│ "What when we can't decide"                             │
│ → Recovery paths, timeouts, degradation modes           │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ .claude/data/cook-audit.jsonl (Audit/Memory Layer)      │
│ "What did we learn"                                     │
│ → Event logging, pattern analysis, improvements         │
└─────────────────────────────────────────────────────────┘
```

**Narrative files (all loaded, priority on conflict):**
1. `CLAUDE.md` - Claude Code native format (highest priority)
2. `AGENTS.md` - Vercel/industry convention
3. `README.md` - general project documentation (lowest priority)

**Architecture layers:**

| Layer | File | Purpose |
|-------|------|---------|
| Narrative | CLAUDE.md | Goals, conventions, context |
| Router | ROUTER_POLICY.md | Phase→chef mapping, escalation |
| Operational | .claude/agents/*.md | Per-chef rules and contracts |
| Handoff | CHEF_CONTRACTS.md | What data passes between chefs |
| Fallback | FALLBACK_POLICY.md | Recovery when things go wrong |
| Audit | .claude/data/*.jsonl | Learning from past cooks |

This combines global context with operational rigor and explicit failure handling.

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
| restaurateur_chef | Code refinement, optimization, naming | refine |
| sous_chef | Background monitoring | monitor |

All chefs output reviews using `review_v1` format. See [REVIEW_CONTRACT.md](REVIEW_CONTRACT.md).
See [CHEF_MATRIX.md](CHEF_MATRIX.md) for inputs/outputs.
See [CHEF_CONTRACTS.md](CHEF_CONTRACTS.md) for handoff contracts between chefs.

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
| Chef can't decide | Check `FALLBACK_POLICY.md` for recovery |
| Handoff validation fails | Check `CHEF_CONTRACTS.md` for requirements |
| Escalation unclear | Check `ROUTER_POLICY.md` for routing |

## Key Contract Files

| File | Purpose |
|------|---------|
| [ROUTER_POLICY.md](ROUTER_POLICY.md) | Phase→chef routing, escalation priority |
| [CHEF_CONTRACTS.md](CHEF_CONTRACTS.md) | Chef-to-chef handoff contracts |
| [FALLBACK_POLICY.md](FALLBACK_POLICY.md) | Recovery paths for failures |
| [REVIEW_CONTRACT.md](REVIEW_CONTRACT.md) | Standard review output format |
| [COOK_CONTRACT.md](COOK_CONTRACT.md) | Artifact structure |
| [CHEF_MATRIX.md](CHEF_MATRIX.md) | Chef responsibilities matrix |
