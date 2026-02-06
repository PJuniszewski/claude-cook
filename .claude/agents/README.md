# Agents (Chefs)

Agents are specialized reviewers that evaluate different aspects of a feature during the `/juni:cook` workflow. Each agent (or "chef") has a specific role and provides structured output using the `review_v1` format.

## How Agents Work

During cooking, Claude Code consults different agents based on their `phase_affinity`:

| Phase | Agent | Purpose |
|-------|-------|---------|
| scope | product_chef | Validates feature scope and value |
| ux | ux_chef | Reviews user experience impact |
| plan | architect_chef | Evaluates alternatives and trade-offs |
| plan | engineer_chef | Creates implementation plan |
| test | qa_chef | Defines test strategy |
| security | security_chef | Audits security implications |
| docs | docs_chef | Identifies documentation updates |
| release | release_chef | Manages versioning and changelog |
| inspect | sanitation_inspector_chef | Post-implementation review |
| refine | restaurateur_chef | Code refinement, optimization, naming, dead code, complexity |
| monitor | sous_chef | Background monitoring |

## Output Contract

All agents output reviews in `review_v1` format (see [REVIEW_CONTRACT.md](../../REVIEW_CONTRACT.md)):

```yaml
output_contract:
  format: review_v1
  required_sections:
    - verdict
    - must_fix
    - should_fix
    - questions
    - risks
    - next_step
```

## Agent Resolution Order

1. **Project-specific agents** in `<project>/.claude/agents/`
2. **System-wide agents** in `~/.claude/agents/`

Project agents override system defaults, allowing you to customize reviews for your specific codebase.

## Creating Custom Agents

Create a new `.md` file in `.claude/agents/` with YAML frontmatter:

```yaml
---
chef_id: my_chef
version: 1.0.0

phase_affinity:
  - <phase>

output_contract:
  format: review_v1
  required_sections:
    - verdict
    - must_fix
    - should_fix
    - questions
    - risks
    - next_step

traits:
  risk_posture: balanced | conservative
  quality_bar: standard | high
  speed_vs_correctness: balanced | correctness-first
  verbosity: minimal | concise | explicit

non_negotiables:
  - <rule 1>
  - <rule 2>

# ... other fields
---

# Chef: My Chef

<Description and when it's consulted>

## Output Format

Uses `review_v1` format (see REVIEW_CONTRACT.md).

## Heuristics

1. <guideline 1>
2. <guideline 2>
```

## Included Agents

| Agent | Phase | File |
|-------|-------|------|
| product_chef | scope | `product_chef.md` |
| ux_chef | ux | `ux_chef.md` |
| architect_chef | plan | `architect_chef.md` |
| engineer_chef | plan | `engineer_chef.md` |
| qa_chef | test | `qa_chef.md` |
| security_chef | security | `security_chef.md` |
| docs_chef | docs | `docs_chef.md` |
| release_chef | release | `release_chef.md` |
| sanitation_inspector_chef | inspect | `sanitation_inspector_chef.md` |
| restaurateur_chef | refine | `restaurateur_chef.md` |
| sous_chef | monitor | `sous_chef.md` |
