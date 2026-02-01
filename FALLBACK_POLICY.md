# Fallback Policy v1.0

Explicit fallback chains for when things go wrong. No more "proceed with warning" ambiguity.

**Purpose:** Define "what happens when we can't decide" - clear recovery paths for all failure modes.

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

- [ROUTER_POLICY.md](ROUTER_POLICY.md) - Normal routing behavior
- [CHEF_CONTRACTS.md](CHEF_CONTRACTS.md) - Contract definitions
- [REVIEW_CONTRACT.md](REVIEW_CONTRACT.md) - Review format
- `.claude/agents/` - Individual chef fallback_behavior
