# Cook Architecture Overview

This document provides a holistic view of how the cook system works - from context loading through chef orchestration to final artifact generation.

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           /juni:cook "Feature X"                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        LAYER 1: NARRATIVE CONTEXT                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                         │
│  │  CLAUDE.md  │  │  AGENTS.md  │  │  README.md  │   "What we build, why"  │
│  │  (priority) │  │             │  │  (lowest)   │                         │
│  └─────────────┘  └─────────────┘  └─────────────┘                         │
│         │                │                │                                 │
│         └────────────────┼────────────────┘                                 │
│                          ▼                                                  │
│              Merged Project Context                                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      LAYER 2: ROUTER / POLICY                               │
│                       (ROUTER_POLICY.md)                                    │
│                                                                             │
│   phase_routing:         escalation_priority:      conflict_resolution:    │
│   ├─ scope → product     1. security_chef          block > request-changes │
│   ├─ ux → ux             2. product_chef           request-changes > approve│
│   ├─ plan → architect    3. architect_chef         tie → escalation_priority│
│   │         → engineer   4. engineer_chef                                   │
│   ├─ test → qa                                                              │
│   ├─ security → security                                                    │
│   └─ docs → docs                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LAYER 3: OPERATIONAL CONTRACTS                           │
│                      (.claude/agents/*_chef.md)                             │
│                                                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │ product_chef │ │architect_chef│ │engineer_chef │ │   qa_chef    │       │
│  ├──────────────┤ ├──────────────┤ ├──────────────┤ ├──────────────┤       │
│  │input_contract│ │input_contract│ │input_contract│ │input_contract│       │
│  │output_contract││output_contract││output_contract││output_contract│       │
│  │escalates_to  │ │escalates_to  │ │escalates_to  │ │escalates_to  │       │
│  │fallback      │ │fallback      │ │fallback      │ │fallback      │       │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘       │
│                                                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │security_chef │ │   ux_chef    │ │  docs_chef   │ │ release_chef │       │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘       │
│                                                                             │
│  ┌──────────────┐ ┌──────────────┐                                         │
│  │  sous_chef   │ │sanitation_   │  (monitoring & inspection)              │
│  │              │ │inspector_chef│                                         │
│  └──────────────┘ └──────────────┘                                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   LAYER 4: CHEF-TO-CHEF CONTRACTS                           │
│                       (CHEF_CONTRACTS.md)                                   │
│                                                                             │
│   product ──────────────────────────────────────────────────► architect    │
│            approved_scope, non_goals, success_metrics, priority            │
│                                                                             │
│   architect ────────────────────────────────────────────────► engineer     │
│              chosen_alternative, trade_offs, affected_modules              │
│                                                                             │
│   engineer ─────────────────────────────────────────────────► qa           │
│             implementation_plan, files_to_modify, edge_cases               │
│                                                                             │
│   qa ───────────────────────────────────────────────────────► security     │
│       test_cases, coverage_areas, uncovered_risks                          │
│                                                                             │
│   security ─────────────────────────────────────────────────► docs         │
│             security_status, security_notes                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      LAYER 5: FALLBACK POLICY                               │
│                       (FALLBACK_POLICY.md)                                  │
│                                                                             │
│   chef_loading:          verdict_fallback:        escalation_fallback:     │
│   1. .claude/agents/     needs-clarification:     target unavailable:      │
│   2. ~/.claude/agents/     max 2 attempts           → escalate to human    │
│   3. *<role>*.md           → escalate to human                             │
│   4. default_contract                                                      │
│                          no_clear_verdict:        human_unavailable:       │
│                            → human tiebreaker       24h timeout            │
│                                                     → keep blocked         │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      LAYER 6: AUDIT / MEMORY                                │
│                  (.claude/data/cook-audit.jsonl)                            │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │ {"event_type":"phase_complete","chef_id":"product_chef",...}        │  │
│   │ {"event_type":"handoff","from":"product_chef","to":"architect",...} │  │
│   │ {"event_type":"escalation","from":"engineer","to":"architect",...}  │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│                          ┌───────────────────┐                             │
│                          │   patternMiner    │                             │
│                          ├───────────────────┤                             │
│                          │ recurringBlockers │                             │
│                          │ escalationPatterns│                             │
│                          │ phaseStatistics   │                             │
│                          │ suggestions       │                             │
│                          └───────────────────┘                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          OUTPUT: COOK ARTIFACT                              │
│                    (cook/<feature>.<date>.cook.md)                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Context Loading Flow

```
                    ┌──────────────────────────────────────┐
                    │         /juni:cook invoked           │
                    └──────────────────────────────────────┘
                                       │
                                       ▼
              ┌────────────────────────────────────────────────┐
              │            PHASE 0: Load Context               │
              └────────────────────────────────────────────────┘
                                       │
          ┌────────────────────────────┼────────────────────────────┐
          ▼                            ▼                            ▼
   ┌─────────────┐              ┌─────────────┐              ┌─────────────┐
   │  CLAUDE.md  │              │  AGENTS.md  │              │  README.md  │
   │  Priority 1 │              │  Priority 2 │              │  Priority 3 │
   └─────────────┘              └─────────────┘              └─────────────┘
          │                            │                            │
          │   ┌────────────────────────┘                            │
          │   │   ┌─────────────────────────────────────────────────┘
          ▼   ▼   ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │                    MERGED PROJECT CONTEXT                       │
   │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
   │  │   Hard Rules    │  │Preferred Patterns│  │   Non-Goals    │ │
   │  │ (MUST/MUST NOT) │  │  (conventions)   │  │  (forbidden)   │ │
   │  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
   │                                                                 │
   │  On conflict: CLAUDE.md > AGENTS.md > README.md                │
   └─────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │   Write to artifact: Phase 0 section │
                    └──────────────────────────────────────┘
```

---

## 3. Router & Phase Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ROUTER_POLICY.md                                   │
│                                                                             │
│  Determines: WHO reviews WHAT and WHEN                                      │
└─────────────────────────────────────────────────────────────────────────────┘

                           COOKING FLOW
                               │
     ┌─────────────────────────┼─────────────────────────┐
     │                         │                         │
     ▼                         ▼                         ▼
┌─────────┐              ┌───────────┐            ┌───────────┐
│ Step 1  │              │  Step 2   │            │  Step 3   │
│  Read   │──────────────│   Scope   │────────────│    UX     │
│  Order  │              │ (product) │            │   (ux)    │
└─────────┘              └───────────┘            └───────────┘
                               │                       │
                               │              ┌────────┘
                               │              │ skip if no_ui_changes
                               ▼              ▼
                         ┌───────────────────────┐
                         │       Step 4          │
                         │    Plan (sequential)  │
                         │  ┌─────────────────┐  │
                         │  │  architect_chef │  │
                         │  └────────┬────────┘  │
                         │           │           │
                         │           ▼           │
                         │  ┌─────────────────┐  │
                         │  │  engineer_chef  │  │
                         │  └─────────────────┘  │
                         └───────────────────────┘
                                    │
                                    ▼
                         ┌───────────────────────┐
                         │       Step 5          │
                         │    Test (qa_chef)     │
                         └───────────────────────┘
                                    │
                                    ▼
                         ┌───────────────────────┐
                         │       Step 6          │
                         │ Security (mandatory)  │
                         │   NEVER SKIPPED       │
                         └───────────────────────┘
                                    │
                                    ▼
                         ┌───────────────────────┐
                         │       Step 7          │
                         │   Docs (docs_chef)    │
                         └───────────────────────┘
                                    │
                                    ▼
                         ┌───────────────────────┐
                         │   COOKING COMPLETE    │
                         └───────────────────────┘


                      PHASE SKIP RULES
    ┌─────────────────────────────────────────────────┐
    │  Condition          │  Skip Phase   │ Reason   │
    ├─────────────────────┼───────────────┼──────────┤
    │  no_ui_changes      │  ux           │ CLI only │
    │  docs_only          │  security,test│ Low risk │
    │  microwave_mode     │  scope, ux    │ Speed    │
    └─────────────────────────────────────────────────┘
```

---

## 4. Chef Contract Structure

Each chef has a standardized contract structure:

```yaml
# .claude/agents/<role>_chef.md

┌─────────────────────────────────────────────────────────────────────────────┐
│                           CHEF CONTRACT                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      INPUT CONTRACT                                  │   │
│  │  requires_from: <previous_chef>                                      │   │
│  │  required_fields:                                                    │   │
│  │    - field_1                                                         │   │
│  │    - field_2                                                         │   │
│  │  optional_fields:                                                    │   │
│  │    - optional_1                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      CHEF PROCESSING                                 │   │
│  │                                                                      │   │
│  │  traits:                    non_negotiables:                         │   │
│  │    risk_posture: balanced     - rule_1                               │   │
│  │    quality_bar: standard      - rule_2                               │   │
│  │    verbosity: minimal                                                │   │
│  │                                                                      │   │
│  │  allowed_scope:             rubric:                                  │   │
│  │    can: [...]                 ready_for_merge:                       │   │
│  │    cannot_without_human:        - criterion_1                        │   │
│  │      [...]                      - criterion_2                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      OUTPUT CONTRACT                                 │   │
│  │  format: review_v1                                                   │   │
│  │  required_sections:                                                  │   │
│  │    - verdict        # approve | block | request-changes              │   │
│  │    - must_fix       # blocking issues                                │   │
│  │    - should_fix     # non-blocking suggestions                       │   │
│  │    - questions      # clarification needed                           │   │
│  │    - risks          # identified risks                               │   │
│  │    - next_step      # what happens next                              │   │
│  │                                                                      │   │
│  │  handoff_to: <next_chef>                                             │   │
│  │  handoff_fields:                                                     │   │
│  │    - output_1                                                        │   │
│  │    - output_2                                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      ESCALATION                                      │   │
│  │  escalates_to:                                                       │   │
│  │    - condition: <trigger>                                            │   │
│  │      target: <other_chef>                                            │   │
│  │      reason: "why escalate"                                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      FALLBACK BEHAVIOR                               │   │
│  │  on_insufficient_context: needs-clarification                        │   │
│  │  on_conflicting_requirements: escalate_to_human                      │   │
│  │  on_timeout: proceed_with_warning                                    │   │
│  │  max_clarification_rounds: 2                                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Handoff Validation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         HANDOFF VALIDATION                                  │
│                        (Before each phase)                                  │
└─────────────────────────────────────────────────────────────────────────────┘

   ┌──────────────────┐                           ┌──────────────────┐
   │   product_chef   │                           │  architect_chef  │
   │                  │                           │                  │
   │  output_contract │                           │  input_contract  │
   │  ────────────────│                           │  ────────────────│
   │  handoff_to:     │                           │  requires_from:  │
   │    architect     │────────────────────────── │    product       │
   │                  │                           │                  │
   │  handoff_fields: │         MUST MATCH        │  required_fields:│
   │  - approved_scope│─────────────────────────► │  - approved_scope│
   │  - non_goals     │─────────────────────────► │  - non_goals     │
   │  - success_metric│─────────────────────────► │  - success_metric│
   │  - priority      │─────────────────────────► │  - priority      │
   └──────────────────┘                           └──────────────────┘
           │                                               │
           │                                               │
           ▼                                               ▼
   ┌──────────────────────────────────────────────────────────────────┐
   │                    VALIDATION CHECK                              │
   │                                                                  │
   │  for each field in next_chef.input_contract.required_fields:    │
   │    if field NOT in previous_chef_output:                        │
   │      if blocking_if_missing:                                     │
   │        → BLOCK with "missing handoff field"                      │
   │      else:                                                       │
   │        → WARN and proceed                                        │
   │                                                                  │
   │  RESULT: PASSED | FAILED (with missing fields)                  │
   └──────────────────────────────────────────────────────────────────┘
```

---

## 6. Escalation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ESCALATION FLOW                                    │
└─────────────────────────────────────────────────────────────────────────────┘

                    Normal Flow
                        │
                        ▼
            ┌───────────────────────┐
            │    engineer_chef      │
            │    processing...      │
            └───────────────────────┘
                        │
                        │ Detects: affects_5_plus_modules
                        ▼
            ┌───────────────────────┐
            │   ESCALATION TRIGGER  │
            │                       │
            │  condition matched:   │
            │  affects_5_plus_modules│
            └───────────────────────┘
                        │
                        │ Look up in ROUTER_POLICY.md
                        ▼
            ┌───────────────────────┐
            │  escalation_routes:   │
            │  engineer_chef:       │
            │    on: affects_5_plus │
            │    escalate_to:       │
            │      architect_chef   │
            └───────────────────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │   architect_chef      │
            │   (escalation target) │
            └───────────────────────┘
                        │
                        │ Resolves concern OR
                        │ escalates further
                        ▼
            ┌───────────────────────┐
            │  ESCALATION PRIORITY  │
            │  (conflict resolver)  │
            │                       │
            │  1. security_chef     │◄── Security always wins
            │  2. product_chef      │
            │  3. architect_chef    │
            │  4. engineer_chef     │
            └───────────────────────┘


                 SPECIAL CASE: Security Escalation

            ┌───────────────────────┐
            │     ANY chef          │
            │     processing...     │
            └───────────────────────┘
                        │
                        │ Detects: security_vulnerability
                        ▼
            ┌───────────────────────┐
            │   IMMEDIATE ESCALATE  │
            │   to security_chef    │
            │   (overrides all)     │
            └───────────────────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │   security_chef       │
            │   verdict: block      │──────► COOKING STOPS
            │   (if high risk)      │
            └───────────────────────┘
```

---

## 7. Fallback Chain

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FALLBACK CHAINS                                    │
└─────────────────────────────────────────────────────────────────────────────┘


    CHEF LOADING FALLBACK
    ──────────────────────

    Need: product_chef
           │
           ▼
    ┌─────────────────────────────┐
    │ 1. .claude/agents/          │
    │    product_chef.md          │───── Found? ──► USE IT
    └─────────────────────────────┘
           │ Not found
           ▼
    ┌─────────────────────────────┐
    │ 2. ~/.claude/agents/        │
    │    product_chef.md          │───── Found? ──► USE IT
    └─────────────────────────────┘
           │ Not found
           ▼
    ┌─────────────────────────────┐
    │ 3. .claude/agents/          │
    │    *product*.md (glob)      │───── Found? ──► USE IT
    └─────────────────────────────┘
           │ Not found
           ▼
    ┌─────────────────────────────┐
    │ 4. DEFAULT CONTRACT         │
    │    - verdict: [approve,     │
    │      needs-clarification]   │
    │    - escalation: to human   │
    │    - strict_mode: true      │
    └─────────────────────────────┘



    VERDICT FALLBACK
    ─────────────────

    Chef returns: needs-clarification
           │
           ▼
    ┌─────────────────────────────┐
    │  Clarification Round 1      │
    │  Ask for more context       │
    └─────────────────────────────┘
           │
           │ Still unclear?
           ▼
    ┌─────────────────────────────┐
    │  Clarification Round 2      │
    │  (max_clarification_rounds) │
    └─────────────────────────────┘
           │
           │ Still unclear?
           ▼
    ┌─────────────────────────────┐
    │  ESCALATE TO HUMAN          │
    │  Provide:                   │
    │  - all chef outputs         │
    │  - identified risks         │
    │  - what's unclear           │
    └─────────────────────────────┘



    HUMAN FALLBACK
    ───────────────

    Escalated to human
           │
           ▼
    ┌─────────────────────────────┐
    │  Wait for human response    │
    │  timeout: 24 hours          │
    └─────────────────────────────┘
           │
           │ Timeout reached?
           ▼
    ┌────────────────┬────────────────┐
    │  IF BLOCKING   │ IF NON-BLOCKING│
    │                │                │
    │  Keep blocked  │ Proceed with   │
    │  Log: true     │ warning        │
    │                │ Log: true      │
    └────────────────┴────────────────┘
```

---

## 8. Audit & Pattern Mining

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AUDIT SYSTEM                                       │
└─────────────────────────────────────────────────────────────────────────────┘

    During Cooking:
    ───────────────

    ┌────────────────────┐     ┌────────────────────┐
    │   Phase Start      │     │   Phase Complete   │
    │   logPhaseStart()  │     │ logPhaseCompletion│
    └────────────────────┘     └────────────────────┘
              │                          │
              │                          │
              ▼                          ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │                  .claude/data/cook-audit.jsonl                      │
    │                                                                     │
    │  {"event_type":"phase_start","order_id":"feat-123",...}            │
    │  {"event_type":"phase_complete","verdict":"approve",...}           │
    │  {"event_type":"escalation","from":"engineer","to":"architect",...}│
    │  {"event_type":"handoff","validation":"passed",...}                │
    │  {"event_type":"blocker","blocker_type":"security",...}            │
    └─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ After multiple orders
                                    ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │                      PATTERN MINING                                 │
    │                    (patternMiner.js)                                │
    │                                                                     │
    │  ┌─────────────────────────────────────────────────────────────┐   │
    │  │  findRecurringBlockers()                                    │   │
    │  │  → "security_chef blocks 40% of orders"                     │   │
    │  │  → "input_validation is top blocker (5 occurrences)"        │   │
    │  └─────────────────────────────────────────────────────────────┘   │
    │                                                                     │
    │  ┌─────────────────────────────────────────────────────────────┐   │
    │  │  findEscalationPatterns()                                   │   │
    │  │  → "engineer_chef escalates to architect 30% of time"       │   │
    │  │  → "Most escalations happen in plan phase"                  │   │
    │  └─────────────────────────────────────────────────────────────┘   │
    │                                                                     │
    │  ┌─────────────────────────────────────────────────────────────┐   │
    │  │  findPhaseStatistics()                                      │   │
    │  │  → "security phase has 15% block rate"                      │   │
    │  │  → "Average phases per order: 7.2"                          │   │
    │  └─────────────────────────────────────────────────────────────┘   │
    │                                                                     │
    │  ┌─────────────────────────────────────────────────────────────┐   │
    │  │  suggestImprovements()                                      │   │
    │  │  → "Add security checklist earlier in process"              │   │
    │  │  → "Consider pre-review for high-escalation areas"          │   │
    │  └─────────────────────────────────────────────────────────────┘   │
    └─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   cook-stats patterns         │
                    │   (CLI dashboard)             │
                    └───────────────────────────────┘
```

---

## 9. Complete Cooking Flow Example

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              /juni:cook "Add user authentication" --well-done               │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─ Step 0.0 ──────────────────────────────────────────────────────────────────┐
│  CREATE ARTIFACT                                                            │
│  → cook/add-user-authentication.2026-02-01.cook.md                         │
│  → Status: raw                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─ Phase 0 ───────────────────────────────────────────────────────────────────┐
│  LOAD CONTEXT                                                               │
│  → Read CLAUDE.md, AGENTS.md, README.md                                    │
│  → Extract hard rules, patterns, non-goals                                 │
│  → Audit: logPhaseStart("phase_0")                                         │
│  → Status: cooking                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─ Step 0.5 ──────────────────────────────────────────────────────────────────┐
│  KITCHEN RECON (well-done only)                                            │
│  → Launch Explore agents in parallel                                        │
│  → Find similar implementations                                             │
│  → Map integration points                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─ Step 1 ────────────────────────────────────────────────────────────────────┐
│  READ THE ORDER                                                             │
│  → Parse feature description                                                │
│  → Identify affected modules                                                │
│  → Check microwave blockers (auth = BLOCKED → stay well-done)              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─ Step 2 ────────────────────────────────────────────────────────────────────┐
│  INGREDIENT APPROVAL                                                        │
│  → Router: phase=scope → product_chef                                      │
│  → Load: .claude/agents/product_chef.md                                    │
│  → Input validation: (none required, first chef)                           │
│  → Review: verdict=approve                                                  │
│  → Handoff validation: approved_scope, non_goals, metrics ✓                │
│  → Audit: logPhaseCompletion("scope", "product_chef", "approve")           │
│  → Audit: logHandoff("product_chef", "architect_chef", "passed")           │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─ Step 3 ────────────────────────────────────────────────────────────────────┐
│  PRESENTATION PLANNING                                                      │
│  → Router: phase=ux → ux_chef                                              │
│  → Check skip rule: has UI changes? YES → continue                         │
│  → Load: .claude/agents/ux_chef.md                                         │
│  → Review: verdict=approve                                                  │
│  → Audit: logPhaseCompletion("ux", "ux_chef", "approve")                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─ Step 4 ────────────────────────────────────────────────────────────────────┐
│  IMPLEMENTATION PLAN (sequential)                                           │
│                                                                             │
│  4a. ARCHITECT                                                              │
│  → Router: phase=plan → [architect_chef, engineer_chef]                    │
│  → Load: .claude/agents/architect_chef.md                                  │
│  → Input validation: approved_scope ✓, non_goals ✓                         │
│  → Review: verdict=approve                                                  │
│  → Detects: affects 6 modules → NO escalation (within threshold)           │
│  → Handoff: chosen_alternative, trade_offs, affected_modules               │
│                                                                             │
│  4b. ENGINEER                                                               │
│  → Load: .claude/agents/engineer_chef.md                                   │
│  → Input validation: chosen_alternative ✓, trade_offs ✓                    │
│  → Review: verdict=approve                                                  │
│  → Handoff: implementation_plan, files_to_modify, edge_cases               │
│  → Audit: logPhaseCompletion("plan", "engineer_chef", "approve")           │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─ Step 5 ────────────────────────────────────────────────────────────────────┐
│  TASTE TESTING                                                              │
│  → Router: phase=test → qa_chef                                            │
│  → Load: .claude/agents/qa_chef.md                                         │
│  → Input validation: implementation_plan ✓, files_to_modify ✓              │
│  → Review: verdict=approve                                                  │
│  → Handoff: test_cases, coverage_areas, uncovered_risks                    │
│  → Audit: logPhaseCompletion("test", "qa_chef", "approve")                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─ Step 6 ────────────────────────────────────────────────────────────────────┐
│  SECURITY REVIEW (NEVER SKIPPED)                                           │
│  → Router: phase=security → security_chef                                  │
│  → Load: .claude/agents/security_chef.md                                   │
│  → Input validation: test_cases ✓                                          │
│  → Review: verdict=approve (auth implementation secure)                    │
│  → Handoff: security_status, security_notes                                │
│  → Audit: logPhaseCompletion("security", "security_chef", "approve")       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─ Step 7 ────────────────────────────────────────────────────────────────────┐
│  RECIPE NOTES                                                               │
│  → Router: phase=docs → docs_chef                                          │
│  → Load: .claude/agents/docs_chef.md                                       │
│  → Review: verdict=approve                                                  │
│  → Audit: logPhaseCompletion("docs", "docs_chef", "approve")               │
│  → Audit: logCookComplete("add-user-auth", "well-done")                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  COOKING COMPLETE                                                           │
│  → Status: well-done ✅                                                     │
│  → Artifact: cook/add-user-authentication.2026-02-01.cook.md               │
│  → All handoffs validated                                                   │
│  → No escalations triggered                                                 │
│  → Audit log updated                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 10. File Reference

| File | Purpose |
|------|---------|
| `CLAUDE.md` / `AGENTS.md` | Narrative context (project goals, conventions) |
| `ROUTER_POLICY.md` | Phase→chef routing, escalation rules |
| `CHEF_CONTRACTS.md` | Handoff requirements between chefs |
| `FALLBACK_POLICY.md` | Recovery paths for failures |
| `REVIEW_CONTRACT.md` | Output format (review_v1) |
| `.claude/agents/*_chef.md` | Individual chef contracts |
| `.claude/data/cook-audit.jsonl` | Audit log (JSON Lines) |
| `scripts/lib/auditLogger.js` | Audit logging functions |
| `scripts/lib/patternMiner.js` | Pattern analysis functions |
| `cook/*.cook.md` | Generated artifacts |

---

## 11. Key Principles

1. **Narrative + Operational**: Global context (CLAUDE.md) + per-phase contracts (chefs)
2. **Explicit Routing**: ROUTER_POLICY determines who reviews what
3. **Validated Handoffs**: Each chef validates inputs before processing
4. **Escalation Priority**: Security > Product > Architect > Engineer
5. **Fallback Chains**: Every failure mode has a recovery path
6. **Audit Everything**: Learn from patterns across orders
7. **Security Never Skipped**: Always mandatory review
