# Contributing to claude-cook

## Local Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/claude-cook.git
   cd claude-cook
   ```

2. Install to your local Claude Code config for testing:
   ```bash
   cp -r .claude/commands ~/.claude/
   cp -r .claude/skills ~/.claude/
   cp -r .claude/templates ~/.claude/
   cp -r .claude/agents ~/.claude/
   ```

3. Test the command:
   ```
   /cook Test feature --well-done
   ```

## Adding a New Agent Template

1. Create a new file in `.claude/agents/`:
   ```
   .claude/agents/your_chef.md
   ```

2. Follow the structure:
   ```markdown
   # Role
   <what this chef does>

   # Questions to Ask
   - <question 1>
   - <question 2>

   # Blockers
   <what causes this chef to block progress>

   # Output
   <what this chef contributes to the artifact>
   ```

3. Update `.claude/agents/README.md` to document the new chef.

4. Submit a PR with:
   - The new agent file
   - Updated README
   - Example showing the chef in action (optional)

## Proposing Rule Changes

Rules live in two places:

- **Microwave blockers**: `.claude/skills/feature-development/SKILL.md` (section: Microwave Blockers)
- **Phase definitions**: `.claude/skills/feature-development/SKILL.md` (section: Cooking Steps)
- **Output formats**: `.claude/skills/feature-development/SKILL.md` (section: Output Format)

To propose changes:

1. Open an issue describing:
   - Current behavior
   - Proposed change
   - Rationale

2. If approved, submit a PR with:
   - Updated SKILL.md
   - Updated documentation if needed
   - Example artifact showing the change

## Pull Request Guidelines

- Keep PRs focused on a single change
- Update documentation for user-facing changes
- Test with both `--well-done` and `--microwave` modes
- Include example output when adding features

## Code of Conduct

Be respectful. Focus on the work, not the person. Assume good intent.
