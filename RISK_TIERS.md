# Risk Tiers v1.0

Formal risk tier definitions with automatic classification algorithm and lane routing.

**Purpose:** Define risk-based routing to balance ceremony vs. speed - 80% of changes should be Green lane (minimal overhead), while high-risk changes get full review.

---

## Risk Tier Definitions

```yaml
risk_tiers:
  0:
    name: trivial
    description: "Zero-risk changes with no behavioral impact"
    examples:
      - Documentation updates (README, comments, CHANGELOG)
      - Code formatting (whitespace, line breaks)
      - Typo fixes in strings or docs
      - Adding/updating .gitignore
    lane: green

  1:
    name: low
    description: "Internal changes with minimal blast radius"
    examples:
      - Internal refactoring (no API change)
      - Adding or updating tests
      - Local bug fixes (single file, clear scope)
      - Renaming internal variables/functions
      - Adding logging or metrics
    lane: green

  2:
    name: medium
    description: "Visible changes requiring validation"
    examples:
      - Backward-compatible API additions
      - Business logic modifications
      - New integrations (external services)
      - Configuration changes
      - UI component changes
      - Database query optimizations
    lane: amber

  3:
    name: high
    description: "Security-sensitive or breaking changes"
    examples:
      - Authentication/authorization changes
      - PII handling modifications
      - Database schema changes
      - Payment processing logic
      - Infrastructure changes
      - Breaking API changes
      - Cryptography implementation
    lane: red

  4:
    name: critical
    description: "System-wide impact requiring human oversight"
    examples:
      - Identity system changes (SSO, OAuth providers)
      - Compliance-related changes (GDPR, SOC2, HIPAA)
      - Mass data operations (migrations, bulk updates)
      - Master encryption key changes
      - Core security infrastructure
      - Multi-tenant isolation changes
    lane: red
    human_required: true
```

---

## Lane Definitions

```yaml
lanes:
  green:
    tiers: [0, 1]
    philosophy: "Move fast, trust the developer"
    ceremony: minimal
    typical_percentage: 80%

  amber:
    tiers: [2]
    philosophy: "Validate with focused review"
    ceremony: moderate
    typical_percentage: 15%

  red:
    tiers: [3, 4]
    philosophy: "Full governance, safety first"
    ceremony: full
    typical_percentage: 5%
```

---

## Classification Algorithm

### Signal Analysis

The classification algorithm analyzes multiple signals and computes a composite tier:

```yaml
classification_signals:

  # Signal 1: Path Analysis
  path_patterns:
    tier_3_patterns:
      - "auth/"
      - "authentication/"
      - "authorization/"
      - "permissions/"
      - "payment/"
      - "billing/"
      - "crypto/"
      - "encryption/"
      - "schema/"
      - "migrations/"
      - "infra/"
      - "infrastructure/"
      - "security/"
      - "secrets/"
      - "pii/"
      - "compliance/"
    tier_2_patterns:
      - "api/"
      - "handlers/"
      - "controllers/"
      - "services/"
      - "integrations/"
      - "config/"
      - "ui/"
      - "components/"
    tier_1_patterns:
      - "tests/"
      - "test/"
      - "__tests__/"
      - "spec/"
      - "internal/"
      - "utils/"
      - "helpers/"
    tier_0_patterns:
      - "docs/"
      - "*.md"
      - ".gitignore"
      - "*.txt"
      - "CHANGELOG*"
      - "README*"

  # Signal 2: Keyword Analysis (in file content or commit message)
  keyword_patterns:
    tier_3_keywords:
      - password
      - token
      - secret
      - credential
      - encrypt
      - decrypt
      - migration
      - schema
      - authorization
      - authentication
      - payment
      - billing
      - pii
      - sensitive
    tier_2_keywords:
      - api
      - endpoint
      - integration
      - external
      - config
      - permission
      - role

  # Signal 3: Dependency Analysis
  dependency_signals:
    tier_bump_plus_1:
      - new_network_egress: true
      - new_permissions_required: true
      - new_external_service: true
      - new_database_table: true
    tier_bump_plus_2:
      - new_authentication_flow: true
      - new_payment_provider: true

  # Signal 4: Size Analysis
  size_thresholds:
    tier_bump_when:
      lines_changed: 300  # >300 LOC → bump tier +1
      files_changed: 10   # >10 files → bump tier +1
      new_files_in_sensitive_dirs: 1  # any new file in tier_3 path → bump tier +1
```

### Classification Algorithm (Pseudocode)

```
function classifyRisk(change):
  base_tier = 0

  # Path analysis (highest tier from any file)
  for file in change.files:
    path_tier = matchPathPattern(file.path)
    base_tier = max(base_tier, path_tier)

  # Keyword analysis (scan content and message)
  content_tier = scanKeywords(change.diff, change.message)
  base_tier = max(base_tier, content_tier)

  # Dependency analysis
  if change.adds_network_egress or change.adds_permissions:
    base_tier = min(4, base_tier + 1)
  if change.adds_auth_flow or change.adds_payment:
    base_tier = min(4, base_tier + 2)

  # Size analysis
  if change.lines_changed > 300:
    base_tier = min(4, base_tier + 1)
  if change.files_changed > 10:
    base_tier = min(4, base_tier + 1)
  if change.new_files_in_sensitive_dirs > 0:
    base_tier = min(4, base_tier + 1)

  # Cap at tier 4
  return min(4, base_tier)
```

### Lane Assignment

```
function assignLane(tier):
  if tier <= 1:
    return "green"
  elif tier == 2:
    return "amber"
  else:
    return "red"
```

---

## Override Mechanism

Users can override automatic classification:

```yaml
overrides:
  # Explicit tier override
  flag_tier:
    syntax: "--tier=N"
    behavior: "Force specific tier (0-4)"
    restrictions:
      - cannot_downgrade_from: [3, 4]  # Security tiers cannot be downgraded
      - downgrade_requires: "justification in artifact"

  # Force green lane
  flag_force_green:
    syntax: "--force-green"
    behavior: "Request green lane processing"
    restrictions:
      - blocked_for_tiers: [3, 4]  # High/Critical cannot force green
      - auto_upgrades_when:
          - auth_topic_detected
          - payment_topic_detected
          - pii_topic_detected
          - schema_change_detected
    warning: "Force-green overridden to amber/red for sensitive topic"

  # Manual tier bump
  flag_sensitive:
    syntax: "--sensitive"
    behavior: "Bump tier to minimum 3"
    use_case: "When developer knows change is sensitive but signals missed"
```

### Override Validation

```yaml
override_validation:
  allow_upgrade: always
  allow_downgrade:
    from_tier_0_1: always
    from_tier_2: with_justification
    from_tier_3_4: never_automated  # requires human approval

  audit_overrides: true  # Log all tier overrides to audit trail
```

---

## Backward Compatibility

```yaml
legacy_flag_mapping:
  microwave:
    default_tier: auto-detect
    lane_preference: green
    behavior: |
      1. Auto-classify change
      2. If tier <= 1 → Green lane
      3. If tier >= 2 → Auto-upgrade to Amber/Red with warning
    warning_message: "Microwave mode upgraded to {lane} - sensitive change detected"

  well_done:
    default_tier: auto-detect
    lane_preference: auto
    behavior: |
      1. Auto-classify change
      2. Use appropriate lane for detected tier
      3. Full chef activation for detected lane
```

---

## Quick Reference

| Tier | Name | Lane | Chefs Active | Human Required |
|------|------|------|--------------|----------------|
| 0 | Trivial | Green | engineer, qa (shallow) | No |
| 1 | Low | Green | engineer, qa, security (checklist) | No |
| 2 | Medium | Amber | engineer, qa, security, architect (conditional) | No |
| 3 | High | Red | All chefs | No |
| 4 | Critical | Red | All chefs + extended review | **Yes** |

---

## See Also

- [ROUTER_POLICY.md](ROUTER_POLICY.md) - Lane routing and chef activation
- [CHEF_CONTRACTS.md](CHEF_CONTRACTS.md) - Contract variants by lane
- [FALLBACK_POLICY.md](FALLBACK_POLICY.md) - Lane classification fallbacks
- `.claude/commands/cook.md` - Cook command with tier flags
