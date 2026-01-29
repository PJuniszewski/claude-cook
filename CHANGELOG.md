# Changelog

All notable changes to claude-cook will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [2.2.0] - 2026-01-29

### Added
- **Sanitation Inspector** (`/juni:inspect`): Post-implementation code review
  - On-demand inspection via `/juni:inspect [artifact]`
  - Surprise inspections on PR/MR merge for high-risk changes
  - Parallel inspection agents: Hygiene, Recipe Compliance, Safety
  - Kitchen-themed humor (sanepid metaphor)
  - Inspection report appended to cook artifact
- **GitLab support**: Surprise inspections trigger on `glab mr merge`
- **Unit tests** for inspect command/agent (`test/inspect.test.js`)

### Changed
- Updated CHEF_MATRIX.md with sanitation_inspector_chef role
- Updated README.md with `/juni:inspect` documentation

## [2.1.0] - 2026-01-29

### Added
- **Step 0.5 Kitchen Recon** (well-done mode): Parallel codebase exploration
  - Launches 2-3 Explore agents before planning
  - Analyzes similar implementations, integration points, risk areas
- **Architecture diagrams**: ASCII box-drawing in engineer_chef output
  - Shows NEW vs EXISTING components
  - Template with proper box-drawing characters

## [2.0.0] - 2026-01-27

### Changed
- **Renamed plugin**: `cook` → `juni`
- **Merged context-guard**: Now part of juni suite
- All commands now use `juni:` prefix (`/juni:cook`, `/juni:guard`, etc.)

### Added
- Tasks API integration for progress tracking
- `[cook]` prefix for cook-related tasks

## [1.5.3] - 2026-01-21

### Fixed
- **Plugin structure**: Moved `commands/`, `skills/`, `agents/` to root level (was `.claude/*`)
  - All commands now properly exposed: `/cook:cook`, `/cook:cook-menu`, `/cook:cook-stats`, `/cook:sous-chef`
  - Previously only `/cook:cook` was visible from plugin

## [1.5.2] - 2026-01-21

### Fixed
- Added required `name` field frontmatter to all chef agent files
- Added required `description` field frontmatter to all chef agent files
- Renamed `README.md` to `README.txt` in agents folder to prevent parsing errors
- Fixed `.mcp.json` format (removed `mcpServers` wrapper to match plugin spec)

## [1.5.0] - 2026-01-21

### Added
- **Analytics** (`/cook-stats`): Track cooking metrics, search artifacts, view timeline
  - Artifact indexer with automatic refresh
  - Status breakdown, completion rates, hot files
  - `search`, `similar`, `timeline` subcommands
- **Recipe Library**: Similar dish detection during `/cook`
  - Jaccard similarity on files (50%), title (30%), keywords (20%)
  - Surfaces past decisions and pre-mortem risks for reuse
  - Integrated into Step 1.5 of cooking flow
- **Sous Chef** (`/sous-chef`): Background monitoring agent
  - `monitor`: Detect commits with uncooked sensitive changes
  - `drift`: Compare artifact plan vs actual implementation
  - `postmortem`: Analyze pre-mortem prediction accuracy
  - `suggest`: Identify files needing more governance
- **Implementation Bridge**: Connect planning to execution
  - `cook-prep`: Generate file stubs from artifact plan
  - `cook-pr`: Generate PR description from artifact
  - `cook-link`: Link artifact to merged PR
- **MCP Dashboard**: Model Context Protocol server
  - `cook_list`, `cook_status`, `cook_blockers`, `cook_search` tools
  - Real-time artifact visibility for Claude integration

### Changed
- All commands now have YAML frontmatter with descriptions
- README updated with comprehensive documentation for new features

## [1.4.0] - 2026-01-15

### Added
- Phase 0 (Project Policy & Context) section in artifact template
- Steps 1-7 with detailed subsections
- Current Phase tracking field
- Risk Management section with pre-mortem table
- Phase column in Decision Log

### Changed
- Updated artifact template with step-by-step format

## [1.3.0] - 2026-01-14

### Fixed
- hooks.json format to match Claude Code schema (object with event keys)

### Added
- Explicit "Correct todo list" in skills showing exactly which steps should be in todo
- "WRONG" list with Implementation, Write code, etc.
- "NO Implementation step in todo list" to blocklist
- More tools to hook matcher

## [1.2.0] - 2026-01-13

### Added
- PreToolUse hook that blocks Read/Task/Grep/Glob until artifact exists
- "IMMEDIATE FIRST ACTION" section at top of command and skills
- Explicit "BLOCKED ACTIONS" list
- allowed-tools to command frontmatter
- Hook enforcement warning

### Changed
- Stronger language in prompts: "Execute NOW", "BLOCKED"

## [1.1.0] - 2026-01-10

### Added
- `scripts/cook-diff` CLI for comparing cook artifacts
- Section-level diff output with change summaries
- `--since <date>` filter for changelog entries
- `## Changelog` section in artifact template for version history
- Test suite for artifact parsing and diffing

### Changed
- Updated artifact template to include Changelog section

## [1.0.0] - 2026-01-07

Initial release.
