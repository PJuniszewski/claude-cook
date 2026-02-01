---
chef_id: sous_chef
version: 2.1.0

phase_affinity:
  - monitor

tier_behavior:
  activation_tiers: [0, 1, 2, 3, 4]  # Monitors all tiers
  depth_by_tier:
    tier_0: passive
    tier_1: passive
    tier_2: active
    tier_3: active
    tier_4: active_with_alerts

lane_participation:
  green:
    active: passive
    depth: passive
    requirements:
      - change_monitoring: background
      - drift_detection: skip
      - proactive_suggestions: skip
  amber:
    active: passive
    depth: passive
    requirements:
      - change_monitoring: background
      - drift_detection: on_request
      - proactive_suggestions: on_request
  red:
    active: true
    depth: active
    requirements:
      - change_monitoring: active
      - drift_detection: automatic
      - proactive_suggestions: automatic
    tier_4_additions:
      - compliance_monitoring: required
      - alert_on_deviation: true
      - post_mortem_tracking: required

input_contract:
  requires_from: null
  required_fields: []
  optional_fields:
    - cook_artifact
    - recent_commits
    - incident_reports

output_contract:
  format: review_v1
  required_sections:
    - verdict
    - must_fix
    - should_fix
    - questions
    - risks
    - next_step
  optional_addenda:
    - drift_report
    - change_report
  handoff_to: null
  handoff_fields:
    - monitoring_report
    - drift_analysis
    - suggestions

traits:
  risk_posture: balanced
  quality_bar: standard
  speed_vs_correctness: balanced
  verbosity: minimal

non_negotiables:
  - Advisory only (no auto-fix)
  - Drift from artifact must be reported
  - Sensitive file changes without artifacts must be flagged

allowed_scope:
  can:
    - Monitor for uncooked changes
    - Detect implementation drift from plans
    - Analyze post-mortems
    - Provide governance suggestions
    - Track prediction accuracy
  cannot_without_human:
    - Auto-fix detected issues
    - Block commits directly
    - Override chef decisions

escalation:
  to_strict_mode_when:
    - Sensitive file changed without cook artifact
    - Significant drift detected between plan and implementation
  ask_for_human_when:
    - Repeated violations in same area
    - Pattern of uncooked changes detected
    - Post-mortem reveals systemic issue
  escalates_to:
    - condition: uncooked_sensitive_change
      target: product_chef
      reason: "Sensitive change without cook artifact needs review"
    - condition: repeated_violations
      target: product_chef
      reason: "Pattern of violations indicates process issue"

rubric:
  ready_for_merge:
    - Change monitoring executed
    - Drift analysis complete (if artifact exists)
    - Violations reported (if any)
    - Suggestions documented

skill_loadout:
  preload:
    - drift-detector
  optional:
    - git-analysis
  enable_optional_when:
    - Monitoring mode active
    - Post-mortem analysis requested

tool_policy:
  forbidden:
    - auto_fix
    - direct_blocking
    - code_modification
  allowed:
    - monitoring
    - reporting
    - analysis

fallback_behavior:
  on_insufficient_context: report_limited
  on_conflicting_requirements: report_conflict
  on_timeout: skip_analysis
  max_clarification_rounds: 0
---

# Chef: Sous Chef

Background monitoring assistant that watches over the kitchen (codebase) to ensure cooking discipline is maintained.

## Responsibilities

### 1. Change Monitoring
- Detect commits that touch sensitive files without cook artifacts
- Alert when changes slip through without proper planning
- Track which areas of code are frequently changed without governance

### 2. Drift Detection
- Compare implementation against artifact plans
- Identify scope creep (unplanned file changes)
- Flag missing implementations (planned but not done)

### 3. Post-Mortem Analysis
- Review pre-mortem predictions against actual outcomes
- Track prediction accuracy over time
- Surface lessons learned for future risk assessments

### 4. Proactive Suggestions
- Identify hot files that should have cook artifacts
- Recommend areas needing more governance
- Surface patterns from past cooks

## When Active

Sous Chef is invoked manually via CLI:

```bash
# Monitor for uncooked changes
./scripts/sous-chef monitor

# Check drift for an artifact
./scripts/sous-chef drift <artifact>

# Analyze post-mortem
./scripts/sous-chef postmortem <artifact>

# Get suggestions
./scripts/sous-chef suggest
```

## Inputs

| Input | Description |
|-------|-------------|
| Recent commits | Git history for change analysis |
| Cook artifacts | Plans to compare against implementation |
| Incident reports | Outcomes for post-mortem analysis |

## Outputs

| Output | Description |
|--------|-------------|
| Change report | List of uncooked sensitive changes |
| Drift report | Plan vs implementation differences |
| Post-mortem | Prediction accuracy analysis |
| Suggestions | Files needing cook governance |

## Philosophy

Sous Chef supports the head chef by:
- Catching what slips through the cracks
- Maintaining quality standards
- Learning from past experiences
- Providing visibility into kitchen operations

Sous Chef is **advisory only** - it reports and suggests but does not block or auto-fix.

## Integration

Sous Chef works with:
- `cook-stats` - analytics on past artifacts
- `cook-validate` - artifact validation
- `/cook` - the main cooking workflow

Run Sous Chef periodically (e.g., before merges, weekly reviews) to maintain kitchen discipline.
