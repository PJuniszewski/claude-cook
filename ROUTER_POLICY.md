# Router Policy v1.1

Machine-parseable routing and escalation rules for chef orchestration.

**Purpose:** Define "who decides when" - explicit logic for phase routing, escalation paths, conflict resolution, and **lane-based chef activation**.

---

## Risk Tier → Lane Routing

Before phase routing, determine the lane based on risk tier (see [RISK_TIERS.md](RISK_TIERS.md)):

```yaml
lane_routing:
  green:
    tiers: [0, 1]
    philosophy: "Fast path for low-risk changes"
    phases: [plan, test]
    chefs: [engineer_chef, qa_chef]
    optional_chefs: [security_chef]  # checklist only
    skip_phases: [scope, ux, docs]
    contract_variant: light_v1

  amber:
    tiers: [2]
    philosophy: "Focused review for medium-risk changes"
    phases: [plan, test, security]
    chefs: [engineer_chef, qa_chef, security_chef]
    optional_chefs: [architect_chef]  # if cross-module
    skip_phases: [scope, ux, docs]  # unless triggered
    contract_variant: mini_v1

  red:
    tiers: [3, 4]
    philosophy: "Full governance for high-risk changes"
    phases: [scope, ux, plan, test, security, docs]
    chefs: [product_chef, ux_chef, architect_chef, engineer_chef, qa_chef, security_chef, docs_chef]
    optional_chefs: []  # all required
    skip_phases: []  # none skippable
    contract_variant: full_v1
    tier_4_additions:
      - human_approval_checkpoint: true
      - extended_security_review: true
      - audit_logging_enhanced: true
```

---

## Chef Activation Matrix

Which chefs are active based on lane:

```yaml
chef_activation:
  product_chef:
    green: {active: false}
    amber: {active: false}
    red: {active: true, depth: full}

  ux_chef:
    green: {active: false}
    amber: {active: false}
    red: {active: conditional, trigger: ui_changes_detected}

  architect_chef:
    green: {active: false}
    amber: {active: conditional, trigger: cross_module_change}
    red: {active: true, depth: full}

  engineer_chef:
    green: {active: true, depth: shallow}
    amber: {active: true, depth: standard}
    red: {active: true, depth: full}

  qa_chef:
    green: {active: true, depth: shallow, min_tests: 1}
    amber: {active: true, depth: standard, min_tests: 3}
    red: {active: true, depth: full, min_tests: 5}

  security_chef:
    green: {active: conditional, depth: checklist_only, trigger: tier_1}
    amber: {active: true, depth: standard}
    red: {active: true, depth: full}

  docs_chef:
    green: {active: false}
    amber: {active: false}
    red: {active: true, depth: standard}

  release_chef:
    green: {active: false}
    amber: {active: false}
    red: {active: on_release, depth: standard}
```

### Depth Definitions

```yaml
depth_levels:
  shallow:
    description: "Quick sanity check"
    time_budget: "~2 minutes"
    requirements: minimal
    alternatives_required: 0
    test_cases_required: 1

  standard:
    description: "Normal review depth"
    time_budget: "~5 minutes"
    requirements: normal
    alternatives_required: 1
    test_cases_required: 3

  full:
    description: "Comprehensive review"
    time_budget: "~10 minutes"
    requirements: complete
    alternatives_required: 2
    test_cases_required: 5

  checklist_only:
    description: "Run checklist, no deep analysis"
    time_budget: "~1 minute"
    requirements: checklist
    alternatives_required: 0
    test_cases_required: 0
```

---

## Lane Selection Algorithm

```yaml
lane_selection:
  step_1_classify:
    action: "Run risk classification algorithm"
    reference: "RISK_TIERS.md#classification-algorithm"
    output: risk_tier (0-4)

  step_2_check_overrides:
    conditions:
      - if: "--tier=N flag provided"
        then: "Use specified tier (with validation)"
      - if: "--force-green flag provided"
        then: "Attempt green lane (may auto-upgrade)"
      - if: "--sensitive flag provided"
        then: "Bump to minimum tier 3"

  step_3_assign_lane:
    mapping:
      tier_0_1: green
      tier_2: amber
      tier_3_4: red

  step_4_validate:
    checks:
      - "Green lane blocked for tier_3_4"
      - "Microwave auto-upgrades if sensitive signals detected"
      - "Log lane assignment to audit trail"
```

---

## Tier-Aware Escalation

Escalation priority adjusts based on tier:

```yaml
tier_aware_escalation:
  green_lane:
    escalation_threshold: high  # only escalate for significant issues
    auto_escalate_to_amber:
      - security_concern_raised
      - cross_module_impact_detected
      - scope_unclear

  amber_lane:
    escalation_threshold: medium
    auto_escalate_to_red:
      - auth_topic_detected
      - payment_topic_detected
      - pii_topic_detected
      - security_blocker_raised
      - breaking_change_detected

  red_lane:
    escalation_threshold: low  # be sensitive to any concern
    auto_require_human:
      - tier_4_classification
      - security_chef_blocks
      - no_viable_mitigation
      - conflicting_chef_verdicts
```

---

## Phase → Chef Mapping

```yaml
phase_routing:
  scope: [product_chef]
  ux: [ux_chef]
  plan: [architect_chef, engineer_chef]  # sequential
  test: [qa_chef]
  security: [security_chef]
  docs: [docs_chef]
  release: [release_chef]
  inspect: [sanitation_inspector_chef]
  monitor: [sous_chef]
```

### Mapping Rules

| Cook Step | Phase | Primary Chef(s) | Execution |
|-----------|-------|-----------------|-----------|
| Step 2 | scope | product_chef | Single |
| Step 3 | ux | ux_chef | Single (if UI changes) |
| Step 4 | plan | architect_chef → engineer_chef | Sequential |
| Step 5 | test | qa_chef | Single |
| Step 6 | security | security_chef | Single |
| Step 7 | docs | docs_chef | Single |
| Post-cook | release | release_chef | Single (on release) |
| Post-cook | inspect | sanitation_inspector_chef | On-demand |
| Background | monitor | sous_chef | Continuous |

---

## Escalation Priority

When multiple chefs have opinions, priority determines which chef's verdict takes precedence.

```yaml
escalation_priority:
  1: security_chef    # Security always wins
  2: product_chef     # Scope/value decisions
  3: architect_chef   # Technical direction
  4: qa_chef          # Quality gates
  5: engineer_chef    # Implementation details
  6: ux_chef          # User experience
  7: docs_chef        # Documentation
  8: release_chef     # Release decisions
```

### Priority Rules

1. **Security overrides all** - A security blocker cannot be overridden by any other chef
2. **Product defines scope** - Only product_chef can expand/reduce scope
3. **Architect guides structure** - Technical patterns defer to architect_chef
4. **Lower priority = advisory** - Can be overridden by higher-priority chef with justification

---

## Conflict Resolution

When verdicts conflict between chefs:

```yaml
when_verdicts_conflict:
  block_wins_over: [request-changes, approve, needs-clarification]
  request-changes_wins_over: [approve, needs-clarification]
  needs-clarification_wins_over: [approve]

  tie_breaker: escalation_priority

  resolution_actions:
    both_block:
      action: combine_must_fix_lists
      notify: all_blocking_chefs

    block_vs_approve:
      action: block_wins
      document: blocking_reason

    multiple_request_changes:
      action: merge_change_lists
      deduplicate: true
```

### Resolution Algorithm

```
1. Collect all chef verdicts for current phase
2. If any verdict is "block" → overall verdict is "block"
3. If any verdict is "request-changes" → overall verdict is "request-changes"
4. If any verdict is "needs-clarification" → overall verdict is "needs-clarification"
5. If all verdicts are "approve" → overall verdict is "approve"
6. On tie → use escalation_priority to determine primary voice
```

---

## Escalation Routes

Explicit escalation paths when a chef encounters situations beyond their scope.

```yaml
escalation_routes:
  engineer_chef:
    escalates_to:
      - condition: affects_5_plus_modules
        target: architect_chef
        reason: "Cross-cutting change requires architectural review"
      - condition: new_architectural_pattern
        target: architect_chef
        reason: "New pattern needs architectural approval"
      - condition: security_concern
        target: security_chef
        reason: "Potential security implications"

  architect_chef:
    escalates_to:
      - condition: trade_offs_affect_ux
        target: ux_chef
        reason: "Technical decisions impact user experience"
      - condition: scope_change_needed
        target: product_chef
        reason: "Technical constraints require scope adjustment"
      - condition: security_implications
        target: security_chef
        reason: "Architectural decision has security impact"

  qa_chef:
    escalates_to:
      - condition: regression_detected
        target: product_chef
        reason: "Existing functionality affected - scope decision needed"
      - condition: acceptance_criteria_unverifiable
        target: product_chef
        reason: "Cannot verify success criteria"
      - condition: security_test_gap
        target: security_chef
        reason: "Security testing coverage concern"

  ux_chef:
    escalates_to:
      - condition: breaking_pattern_change
        target: product_chef
        reason: "UX pattern break needs product approval"
      - condition: accessibility_regression
        target: product_chef
        reason: "Accessibility impact requires stakeholder decision"

  docs_chef:
    escalates_to:
      - condition: breaking_change_undocumented
        target: product_chef
        reason: "Breaking change requires migration strategy"

  release_chef:
    escalates_to:
      - condition: version_conflict
        target: product_chef
        reason: "Release versioning conflict needs resolution"
      - condition: breaking_change_not_approved
        target: product_chef
        reason: "Breaking change needs explicit approval"

  any_chef:
    escalates_to:
      - condition: security_vulnerability
        target: security_chef
        reason: "Security issue detected"
      - condition: high_risk_no_mitigation
        target: security_chef
        reason: "HIGH risk without viable mitigation"
      - condition: cannot_decide
        target: human
        reason: "Insufficient context for autonomous decision"
```

---

## Phase Skip Rules

When certain phases can be skipped based on context.

```yaml
phase_skip_rules:
  ux:
    skip_when:
      - no_ui_changes
      - backend_only_change
      - api_internal_change
    skip_verdict: "N/A - No UX impact"

  security:
    skip_when: []  # Never skip security
    note: "Security review is mandatory for all changes"

  docs:
    skip_when:
      - internal_refactor_only
      - no_behavior_change
      - no_api_change
    skip_verdict: "N/A - No documentation impact"

  release:
    skip_when:
      - not_releasing
      - draft_only
    skip_verdict: "N/A - Release phase invoked separately"
```

---

## Microwave Mode Routing (Legacy)

**Note:** Microwave mode is now integrated with lane routing. `--microwave` maps to Green lane preference with auto-upgrade capability.

```yaml
microwave_routing:
  # Legacy behavior (for backward compatibility)
  default_lane_preference: green
  phases_if_green: [plan, test]
  chefs_if_green: [engineer_chef, qa_chef]

  # Auto-upgrade triggers (same as RISK_TIERS.md tier_3_patterns)
  auto_escalate_to_amber_or_red:
    - auth_topic
    - payment_topic
    - pii_topic
    - schema_change
    - public_api_change
    - crypto_topic
    - migration_detected

  # When auto-upgraded
  on_auto_upgrade:
    action: warn_user
    message: "Microwave mode auto-upgraded to {lane} lane - {reason} detected"
    proceed: true

  # Reduced requirements when staying in green lane
  green_lane_requirements:
    engineer_chef:
      depth: shallow
      skip: [alternatives_analysis, detailed_trade_offs]
    qa_chef:
      depth: shallow
      min_test_cases: 1
    security_chef:
      active: conditional  # only for tier 1
      depth: checklist_only
```

### Microwave → Lane Mapping

```yaml
microwave_lane_mapping:
  # Auto-classify first
  step_1: classify_risk_tier()

  # Attempt green lane
  step_2:
    if tier <= 1:
      lane: green
      message: "Microwave mode: Green lane approved"
    elif tier == 2:
      lane: amber
      message: "Microwave mode: Auto-upgraded to Amber lane"
    else:
      lane: red
      message: "Microwave mode: Auto-upgraded to Red lane (sensitive change)"
```

---

## Strict Mode Triggers

Global triggers that activate strict mode (Red lane) across all chefs:

```yaml
strict_mode_triggers:
  # These patterns automatically trigger Tier 3+ → Red lane
  global:
    - authentication_change
    - authorization_change
    - payment_processing
    - pii_handling
    - cryptography
    - public_api_change
    - data_schema_change

  # Tier 4 specific triggers (require human approval)
  tier_4_triggers:
    - identity_system_change
    - compliance_related_change
    - mass_data_operation
    - encryption_key_change
    - multi_tenant_isolation

  effect:
    # Standard Red lane effects
    red_lane:
      - All phases mandatory (no skips)
      - Full review depth required
      - All chefs activated
      - Audit logging enhanced

    # Additional Tier 4 effects
    tier_4:
      - Human approval checkpoint required
      - Extended security review
      - Compliance documentation required
      - Rollback plan mandatory
```

### Tier → Strict Mode Mapping

```yaml
tier_strict_mode:
  tier_0: false
  tier_1: false
  tier_2: false  # Not strict, but Amber lane
  tier_3: true   # Red lane = strict mode
  tier_4: true   # Red lane + human approval
```

---

## See Also

- [RISK_TIERS.md](RISK_TIERS.md) - Risk tier definitions and classification
- [CHEF_CONTRACTS.md](CHEF_CONTRACTS.md) - Handoff contracts between chefs (light/mini/full variants)
- [FALLBACK_POLICY.md](FALLBACK_POLICY.md) - What happens when routing fails, lane fallbacks
- [REVIEW_CONTRACT.md](REVIEW_CONTRACT.md) - Standard review format
- `.claude/agents/` - Individual chef definitions with `tier_behavior` and `lane_participation`
