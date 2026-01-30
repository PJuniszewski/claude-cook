# Agents (Chefs)

Agents are specialized reviewers that evaluate different aspects of a feature during the `/cook` workflow. Each agent (or "chef") has a specific role and provides structured output to the cooking artifact.

## How Agents Work

During cooking, Claude Code consults different agents based on the current phase:

| Phase | Agent | Purpose |
|-------|-------|---------|
| Scope Approval | product_chef | Validates feature scope and value |
| UX Planning | ux_chef | Reviews user experience impact |
| QA Review | qa_chef | Defines test strategy |
| Security Review | security_chef | Audits security implications |

## Agent Resolution Order

1. **Project-specific agents** in `<project>/.claude/chefs/`
2. **System-wide agents** in `~/.claude/chefs/`

Project agents override system defaults, allowing you to customize reviews for your specific codebase.

## Creating Custom Agents

Create a new `.md` file in `.claude/chefs/` with this structure:

```markdown
# Role
<What this agent does and when it's consulted>

# Questions to Ask
- <Question 1>
- <Question 2>
- <Question 3>

# Blockers
<What conditions cause this agent to block progress>

# Output
<What this agent contributes to the cooking artifact>
```

## Included Agents

- `product_chef.md` - Scope and value validation
- `ux_chef.md` - User experience review
- `qa_chef.md` - Quality assurance planning
- `security_chef.md` - Security audit

## Naming Convention

For project-specific agents, use the pattern:
```
<project>-<role>.md
```

Example: `myapp-security_chef.md`

This helps distinguish project agents from system-wide defaults.

## Agent Output

Each agent contributes to specific sections of the cooking artifact:

| Agent | Artifact Sections |
|-------|------------------|
| product_chef | Product Decision, Scope |
| ux_chef | UX Notes |
| qa_chef | QA Plan, Test Cases |
| security_chef | Security Review, Risk Level |
