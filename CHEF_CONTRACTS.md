# Chef-to-Chef Contracts v1.0

Explicit handoff contracts defining what each chef must deliver to the next chef in the workflow.

**Purpose:** Define "what is passed to whom" - structured outputs that enable downstream chefs to function correctly.

---

## Contract Philosophy

Each chef operates within a bounded context. For the overall workflow to succeed:

1. **Upstream chef** must provide specific outputs (output_contract)
2. **Downstream chef** must receive specific inputs (input_contract)
3. **Handoff validation** ensures nothing is lost between phases

Without explicit contracts:
- Chefs make assumptions about available context
- Critical information is lost between phases
- Failures occur late instead of early

---

## Contract: product_chef → architect_chef

```yaml
handoff_product_to_architect:
  required_outputs:
    - approved_scope:
        description: "List of in-scope items"
        format: "bullet list"
        validation: "must not contain TBD"
    - non_goals:
        description: "Explicit list of what NOT to build"
        format: "bullet list"
        validation: "at least 1 item"
    - success_metrics:
        description: "How we measure success"
        format: "bullet list with measurable criteria"
        validation: "at least 1 metric defined"
    - priority:
        description: "Feature priority level"
        format: "P0 | P1 | P2"
        validation: "must be one of allowed values"

  optional_outputs:
    - user_value_statement:
        description: "Who/Problem/Solution/Metric"
    - dependencies:
        description: "Prerequisites or related features"

  blocking_if_missing: true
  fallback_action: needs-clarification
```

---

## Contract: architect_chef → engineer_chef

```yaml
handoff_architect_to_engineer:
  required_outputs:
    - chosen_alternative:
        description: "Selected approach with rationale"
        format: "approach name + why selected"
        validation: "not empty"
    - trade_offs:
        description: "Documented trade-offs"
        format: "sacrificing/gaining/acceptable-because"
        validation: "trade_offs documented for chosen approach"
    - affected_modules:
        description: "List of modules to modify"
        format: "bullet list of module/component names"
        validation: "at least 1 module identified"
    - risk_assessment:
        description: "Overall risk level with mitigations"
        format: "HIGH | MEDIUM | LOW + mitigations"
        validation: "must include mitigation if HIGH"

  optional_outputs:
    - alternatives_considered:
        description: "Other approaches evaluated"
        validation: "at least 2 alternatives if non-trivial change"
    - integration_points:
        description: "Where new code integrates with existing"
    - performance_model:
        description: "Expected performance characteristics"

  blocking_if_missing: true
  fallback_action: escalate_to_architect
```

---

## Contract: engineer_chef → qa_chef

```yaml
handoff_engineer_to_qa:
  required_outputs:
    - implementation_plan:
        description: "Step-by-step implementation plan"
        format: "numbered list of steps"
        validation: "implementation_plan not empty"
    - files_to_modify:
        description: "Explicit file list with change descriptions"
        format: "table: file | change | risk"
        validation: "at least 1 file identified"
    - edge_cases_identified:
        description: "Known edge cases from implementation planning"
        format: "bullet list"
        validation: "at least 1 edge case if non-trivial"

  optional_outputs:
    - commit_sequence:
        description: "Planned commit order"
    - high_risk_areas:
        description: "Areas needing extra attention"
    - technical_decisions:
        description: "Implementation-level choices made"

  blocking_if_missing: true
  fallback_action: request-changes
```

---

## Contract: qa_chef → security_chef

```yaml
handoff_qa_to_security:
  required_outputs:
    - test_cases:
        description: "List of test cases defined"
        format: "table: scenario | given | when | then"
        validation: "at least 1 test case defined"
    - coverage_areas:
        description: "What's covered by tests"
        format: "bullet list"
        validation: "not empty"
    - uncovered_risks:
        description: "Known gaps in test coverage"
        format: "bullet list"
        validation: "explicitly stated even if none"

  optional_outputs:
    - acceptance_criteria:
        description: "Verifiable acceptance criteria"
    - regression_checks:
        description: "Existing features to verify"
    - edge_cases:
        description: "Edge cases to test"

  blocking_if_missing: false  # security can proceed with warning
  fallback_action: proceed_with_warning
  warning_message: "QA handoff incomplete - security review may miss test-related concerns"
```

---

## Contract: security_chef → docs_chef

```yaml
handoff_security_to_docs:
  required_outputs:
    - security_status:
        description: "Overall security review status"
        format: "reviewed: yes/no, risk_level: low/medium/high"
        validation: "must be reviewed"
    - security_notes:
        description: "Security considerations for documentation"
        format: "bullet list"
        validation: "explicitly stated even if none"

  optional_outputs:
    - threat_assessment:
        description: "Detailed threat analysis"
    - owasp_checklist:
        description: "OWASP top 10 review results"
    - security_requirements:
        description: "Security requirements that affect user behavior"

  blocking_if_missing: false
  fallback_action: proceed_with_warning
  warning_message: "Security handoff incomplete - docs may miss security-related guidance"
```

---

## Contract: docs_chef → release_chef

```yaml
handoff_docs_to_release:
  required_outputs:
    - documentation_status:
        description: "What documentation was updated"
        format: "bullet list of files/sections"
        validation: "explicitly stated even if no changes needed"
    - breaking_changes_documented:
        description: "Whether breaking changes have migration guides"
        format: "yes/no/N/A"
        validation: "if breaking change, must be yes"

  optional_outputs:
    - files_to_update:
        description: "Documentation files that need updates"
    - migration_guide:
        description: "User migration instructions"
    - usage_examples:
        description: "Code examples for new features"

  blocking_if_missing: false
  fallback_action: proceed_with_warning
  warning_message: "Docs handoff incomplete - release notes may miss documentation status"
```

---

## Contract: any_chef → sanitation_inspector_chef

```yaml
handoff_to_inspector:
  required_outputs:
    - implementation_artifact:
        description: "Path to cook artifact"
        format: "file path"
        validation: "file must exist"
    - implementation_commits:
        description: "Commits implementing the feature"
        format: "list of commit SHAs"
        validation: "at least 1 commit"

  optional_outputs:
    - high_risk_files:
        description: "Files flagged as high-risk"
    - known_shortcuts:
        description: "Intentional deviations from plan"

  blocking_if_missing: false
  fallback_action: inspect_without_context
```

---

## Validation Rules

### Pre-Phase Validation

Before each phase begins, validate input contract:

```
1. Load input_contract for current chef
2. Check required_fields from previous chef output
3. If missing required field:
   a. If blocking_if_missing: true → block with needs-clarification
   b. If blocking_if_missing: false → warn and proceed
4. Log validation result to audit trail
```

### Post-Phase Validation

After each phase completes, validate output contract:

```
1. Load output_contract for current chef
2. Check all required_outputs are present
3. Apply format validation rules
4. If validation fails:
   a. Return request-changes to current chef
   b. Log validation failure
5. If validation passes:
   a. Package handoff data for next chef
   b. Log successful handoff
```

---

## Handoff Data Structure

Standard structure for passing data between chefs:

```yaml
handoff:
  from_chef: <chef_id>
  to_chef: <chef_id>
  timestamp: <ISO-8601>
  order_id: <order_id>
  phase: <phase_name>

  required_data:
    - field: <field_name>
      value: <value>
      validated: true|false

  optional_data:
    - field: <field_name>
      value: <value>
      present: true|false

  validation_result:
    status: passed|failed|warning
    missing_fields: [...]
    invalid_fields: [...]
    warnings: [...]
```

---

## Contract Versioning

Contracts are versioned. When updating:

1. Increment version in contract header
2. Document breaking changes
3. Maintain backward compatibility for 1 minor version
4. Update all affected chefs simultaneously

```yaml
contract_version: 1.0.0
compatible_with:
  - 1.0.x
  - 0.9.x  # deprecated, remove in 2.0
```

---

## See Also

- [ROUTER_POLICY.md](ROUTER_POLICY.md) - Chef routing and escalation
- [REVIEW_CONTRACT.md](REVIEW_CONTRACT.md) - Review output format
- [FALLBACK_POLICY.md](FALLBACK_POLICY.md) - What happens when contracts fail
- `.claude/agents/` - Individual chef definitions with contracts
