# Router Policy v1.0

Machine-parseable routing and escalation rules for chef orchestration.

**Purpose:** Define "who decides when" - explicit logic for phase routing, escalation paths, and conflict resolution.

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

## Microwave Mode Routing

Simplified routing for `--microwave` mode:

```yaml
microwave_routing:
  phases: [scope, plan, test]
  chefs: [product_chef, engineer_chef, qa_chef]

  auto_escalate_to_wellDone:
    - auth_topic
    - payment_topic
    - pii_topic
    - schema_change
    - public_api_change

  reduced_requirements:
    product_chef:
      skip: [user_value_statement, non_goals]
    engineer_chef:
      skip: [alternatives_analysis]
    qa_chef:
      min_test_cases: 1
```

---

## Strict Mode Triggers

Global triggers that activate strict mode across all chefs:

```yaml
strict_mode_triggers:
  global:
    - authentication_change
    - authorization_change
    - payment_processing
    - pii_handling
    - cryptography
    - public_api_change
    - data_schema_change

  effect:
    - All phases mandatory (no skips)
    - Full review depth required
    - Human approval checkpoint added
    - Audit logging enhanced
```

---

## See Also

- [CHEF_CONTRACTS.md](CHEF_CONTRACTS.md) - Handoff contracts between chefs
- [FALLBACK_POLICY.md](FALLBACK_POLICY.md) - What happens when routing fails
- [REVIEW_CONTRACT.md](REVIEW_CONTRACT.md) - Standard review format
- `.claude/agents/` - Individual chef definitions
