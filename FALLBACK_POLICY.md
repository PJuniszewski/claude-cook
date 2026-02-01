# Fallback Policy v1.1

Explicit fallback chains for when things go wrong. No more "proceed with warning" ambiguity.

**Purpose:** Define "what happens when we can't decide" - clear recovery paths for all failure modes, including **lane classification and transition fallbacks**.

---

## Lane Classification Fallback

When automatic risk classification is uncertain:

```yaml
lane_classification_fallback:
  when_uncertain:
    threshold: confidence < 70%
    default_action: upgrade_to_amber
    reason: "When in doubt, add review"

  conflicting_signals:
    # Path says Tier 1, keywords say Tier 3
    action: use_higher_tier
    reason: "Safety-first approach"

  missing_context:
    # Cannot analyze diff (e.g., new file, binary)
    action: infer_from_path
    fallback: amber
    reason: "Path patterns provide baseline classification"

  classification_error:
    action: escalate_to_human
    message: "Could not classify risk tier"
    provide_context:
      - attempted_signals
      - partial_results
      - error_details
```

### Classification Decision Tree

```
1. Attempt full classification (path + keywords + dependencies + size)
2. If confidence >= 70% → use classified tier
3. If confidence < 70%:
   a. If any tier_3_4 signals present → Red lane
   b. If any tier_2 signals present → Amber lane
   c. Otherwise → Amber lane (default)
4. If classification fails completely → escalate to human
```

---

## Lane Transition Fallback

Rules for upgrading or downgrading lanes mid-cook:

```yaml
lane_transition:
  upgrade_rules:
    # Green → Amber
    green_to_amber:
      triggers:
        - security_concern_raised
        - cross_module_impact_discovered
        - scope_expansion_detected
        - architect_chef_requested
      action: upgrade_immediately
      notify: user
      preserve_work: true  # Keep existing artifact content

    # Amber → Red
    amber_to_red:
      triggers:
        - auth_pattern_detected_mid_review
        - payment_pattern_detected
        - pii_detected
        - security_chef_blocks
        - breaking_change_confirmed
      action: upgrade_immediately
      notify: user
      add_chefs: [product_chef, ux_chef, docs_chef]

    # Any → Red (Tier 4)
    to_tier_4:
      triggers:
        - compliance_impact_detected
        - identity_system_touched
        - encryption_key_involved
      action: upgrade_with_human_checkpoint
      block_until: human_acknowledges

  downgrade_rules:
    # Red → Amber (rare)
    red_to_amber:
      allowed: false_positive_confirmed
      requires: human_approval
      audit: true
      message: "Lane downgrade requires explicit approval"

    # Amber → Green (rare)
    amber_to_green:
      allowed: scope_significantly_reduced
      requires: justification_documented
      audit: true

    # Green stays green
    green_downgrade:
      allowed: false  # Can't go below green
```

### Transition Notification Format

```yaml
lane_transition_notification:
  format: |
    ⚠️ LANE UPGRADE: {old_lane} → {new_lane}
    Reason: {trigger_reason}
    New chefs activated: {added_chefs}
    Action required: {required_action}
```

---

## Tier 4 Specific Fallbacks

Critical tier (Tier 4) has special handling when human approval is unavailable:

```yaml
tier_4_fallbacks:
  human_unavailable:
    timeout_seconds: 86400  # 24 hours (same as standard)

    on_timeout:
      action: block_indefinitely
      reason: "Tier 4 changes require human approval - cannot auto-proceed"
      escalate_to: project_owner
      notification:
        - email_if_configured
        - slack_if_configured
        - audit_log_entry

    reminder_intervals: [3600, 14400, 43200, 72000]  # 1h, 4h, 12h, 20h

  emergency_bypass:
    # Only in documented emergency scenarios
    allowed_when:
      - incident_response_mode: true
      - documented_emergency: true
    requires:
      - two_person_rule: true  # Two humans must approve
      - incident_ticket: required
      - post_incident_review: scheduled
    audit:
      - full_transcript_logged
      - bypass_reason_documented
      - reviewers_identified

  partial_approval:
    # If some human approvers available but not all
    threshold: majority
    action: proceed_with_warning
    requirements:
      - at_least_one_security_approver
      - documented_in_artifact
      - follow_up_required

  compliance_blocker:
    # When compliance-related and human unavailable
    action: hard_block
    message: "Compliance-related changes cannot proceed without human approval"
    override: none  # No emergency bypass for compliance
```

### Tier 4 Human Approval Workflow

```
1. Tier 4 classification confirmed
2. Cook proceeds through all phases
3. Before implementation:
   a. Present full artifact to human
   b. Request explicit approval
   c. Log approval (who, when, what)
4. If timeout:
   a. Block indefinitely
   b. Notify project owner
   c. Log blocking event
5. After approval:
   a. Proceed with implementation
   b. Post-implementation review mandatory
   c. Sanitation inspection required
```

---

## Chef Loading Fallback

When attempting to load a chef definition:

```yaml
chef_resolution:
  order:
    1: .claude/agents/<role>_chef.md
    2: ~/.claude/agents/<role>_chef.md
    3: .claude/agents/*<role>*.md  # fuzzy match

  on_not_found:
    action: use_default_contract
    default_contract:
      verdict_options: [approve, needs-clarification]  # no block without chef
      escalation: always_to_human
      strict_mode: true
      warning: "Chef not found - using default contract"

  on_parse_error:
    action: escalate_to_human
    message: "Chef definition has syntax errors"
    provide_context: [file_path, error_message]
```

### Resolution Algorithm

```
1. Try: Glob(".claude/agents/<role>_chef.md")
2. If found → parse and validate
3. If not found:
   a. Try: Glob("~/.claude/agents/<role>_chef.md")
   b. If not found: Try fuzzy Glob(".claude/agents/*<role>*.md")
4. If still not found → apply default_contract
5. If parse error → escalate_to_human
6. Log resolution result to audit trail
```

---

## Verdict Fallback

When a chef cannot reach a clear verdict:

```yaml
when_chef_cannot_decide:
  needs-clarification:
    max_attempts: 2
    on_max_attempts: escalate_to_human
    timeout_seconds: 300
    between_attempts:
      action: request_additional_context
      prompt: "What additional information would help you reach a verdict?"

  no_clear_verdict:
    action: request_human_tiebreaker
    provide_context:
      - all_chef_outputs
      - identified_risks
      - decision_factors
    timeout_seconds: 86400  # 24 hours

  conflicting_signals:
    action: apply_escalation_priority
    if_still_unclear: escalate_to_human
```

### Clarification Loop

```
attempt = 0
while attempt < max_attempts:
  verdict = chef.review()
  if verdict != needs-clarification:
    return verdict
  attempt += 1
  context = request_additional_context()

if attempt >= max_attempts:
  return escalate_to_human()
```

---

## Escalation Fallback

When the escalation target is unavailable:

```yaml
when_escalation_target_unavailable:
  action: escalate_to_human
  provide_context:
    - original_escalation_reason
    - attempted_target
    - escalation_chain

  alternative_routing:
    security_chef_unavailable: always_to_human  # never skip security
    architect_chef_unavailable: try_engineer_chef
    product_chef_unavailable: always_to_human
    other_chef_unavailable: proceed_with_warning
```

### Escalation Chain

```
1. Try target chef
2. If unavailable:
   a. Check alternative_routing
   b. If alternative exists → try alternative
   c. If no alternative → escalate_to_human
3. Log escalation attempt to audit trail
```

---

## Human Fallback

When human intervention is requested:

```yaml
when_human_unavailable:
  timeout_seconds: 86400  # 24 hours

  on_timeout:
    if_blocking: keep_blocked
    if_non_blocking: proceed_with_warning
    log: true
    notify: true

  notification:
    message: "Cook workflow waiting for human input"
    include: [order_id, phase, question, timeout_remaining]

  reminder_intervals: [3600, 14400, 43200]  # 1h, 4h, 12h
```

### Human Request Format

```yaml
human_request:
  order_id: <order_id>
  phase: <phase>
  chef_id: <chef_id>
  question: <specific question>
  context:
    - <relevant background>
  options:
    - <option A with pros/cons>
    - <option B with pros/cons>
  recommendation: <chef's recommendation if any>
  blocking: true|false
  timeout: <timestamp>
```

---

## Contract Validation Fallback

When handoff contract validation fails:

```yaml
when_contract_fails:
  missing_required_field:
    blocking: true
    action: return_to_previous_chef
    message: "Missing required field: {field_name}"
    max_retries: 2

  invalid_format:
    blocking: true
    action: request_correction
    message: "Invalid format for {field_name}: expected {expected}, got {actual}"
    max_retries: 1

  optional_field_missing:
    blocking: false
    action: proceed_with_warning
    warning: "Optional field missing: {field_name}"
    log: true

  validation_timeout:
    action: escalate_to_human
    message: "Contract validation timed out"
```

---

## Recovery Actions

Automated recovery for repeated failures:

```yaml
on_repeated_failures:
  same_phase_blocked_3x:
    action: suggest_scope_reduction
    notify: product_chef
    message: "Phase {phase} has blocked 3 times. Consider reducing scope."
    log_pattern: true

  same_chef_escalates_3x:
    action: review_chef_thresholds
    notify: product_chef
    message: "Chef {chef_id} has escalated 3 times. Consider threshold adjustment."
    log_pattern: true

  contract_fails_repeatedly:
    action: audit_contract_definition
    message: "Contract between {from_chef} and {to_chef} failing repeatedly."
    suggest: "Review CHEF_CONTRACTS.md for this transition"

  human_timeout_repeated:
    action: escalate_to_project_owner
    message: "Multiple human timeouts. Process may need restructuring."
```

---

## Timeout Configuration

Default timeouts for various operations:

```yaml
timeouts:
  chef_review: 300         # 5 minutes
  clarification_round: 120 # 2 minutes
  human_response: 86400    # 24 hours
  contract_validation: 30  # 30 seconds
  pattern_analysis: 60     # 1 minute

  grace_period: 60         # 1 minute buffer before timeout
```

---

## Graceful Degradation

When systems are partially available:

```yaml
degradation_modes:
  audit_unavailable:
    action: continue_without_audit
    warning: "Audit logging unavailable - proceeding without logging"
    retry_interval: 300

  pattern_analysis_unavailable:
    action: skip_analysis
    warning: "Pattern analysis unavailable - suggestions disabled"

  tasks_api_unavailable:
    action: use_artifact_only
    warning: "Tasks API unavailable - using artifact for tracking"
```

---

## See Also

- [RISK_TIERS.md](RISK_TIERS.md) - Risk tier definitions and lane mapping
- [ROUTER_POLICY.md](ROUTER_POLICY.md) - Normal routing behavior, lane routing
- [CHEF_CONTRACTS.md](CHEF_CONTRACTS.md) - Contract definitions (light/mini/full variants)
- [REVIEW_CONTRACT.md](REVIEW_CONTRACT.md) - Review format
- `.claude/agents/` - Individual chef fallback_behavior and tier_behavior
