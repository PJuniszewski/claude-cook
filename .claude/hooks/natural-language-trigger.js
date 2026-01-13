#!/usr/bin/env node

/**
 * Natural Language Trigger Hook
 *
 * Detects execution triggers like "implement it", "ship it"
 * and outputs checkpoint information for confirmation.
 *
 * Event: UserPromptSubmit
 *
 * Exit codes:
 *   0 - Success (continue with optional system message)
 *   2 - Block (stop processing)
 */

const fs = require('fs');
const path = require('path');

// Trigger patterns
const IMPLEMENT_TRIGGERS = [
  /\bimplement\s+it\b/i,
  /\bstart\s+coding\b/i,
  /\bcode\s+it\b/i,
  /\bbuild\s+it\b/i,
  /\bbegin\s+implementation\b/i
];

const PR_TRIGGERS = [
  /\bship\s+it\b/i,
  /\bcreate\s+pr\b/i,
  /\bopen\s+pr\b/i,
  /\bpush\s+it\b/i,
  /\bmake\s+pr\b/i,
  /\bcreate\s+pull\s+request\b/i
];

const AMBIGUOUS_TRIGGERS = [
  /^do\s+it$/i,
  /^go\s+ahead$/i,
  /^proceed$/i,
  /^yes$/i,
  /^ok$/i
];

// Read input from stdin
let input = '';

process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  input += chunk;
});

process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const userPrompt = data.prompt || data.user_prompt || '';

    // Check for ambiguous triggers first
    for (const pattern of AMBIGUOUS_TRIGGERS) {
      if (pattern.test(userPrompt.trim())) {
        // Output system message for ambiguous trigger
        const response = {
          continue: true,
          systemMessage: `The phrase "${userPrompt.trim()}" is ambiguous for cook execution. Please be specific:
- "implement it" - create branch and write code (--implement)
- "ship it" - implement + create PR (--create-pr)
- "review it" - verify the implementation

What would you like to do?`
        };
        console.log(JSON.stringify(response));
        process.exit(0);
      }
    }

    // Check for implement triggers
    for (const pattern of IMPLEMENT_TRIGGERS) {
      if (pattern.test(userPrompt)) {
        outputCheckpoint('implement', userPrompt);
        process.exit(0);
      }
    }

    // Check for PR triggers
    for (const pattern of PR_TRIGGERS) {
      if (pattern.test(userPrompt)) {
        outputCheckpoint('create-pr', userPrompt);
        process.exit(0);
      }
    }

    // No trigger detected, continue normally
    console.log(JSON.stringify({ continue: true }));
    process.exit(0);

  } catch (error) {
    // On parse error, continue normally
    console.log(JSON.stringify({ continue: true }));
    process.exit(0);
  }
});

function outputCheckpoint(action, trigger) {
  // Try to load active cook info
  let activeCookInfo = '';
  try {
    const statePath = path.resolve('.claude/cook-state.json');
    if (fs.existsSync(statePath)) {
      const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      if (state.active && state.cooks[state.active]) {
        const cook = state.cooks[state.active];
        activeCookInfo = `
Active Cook: ${state.active}
Artifact: ${cook.artifact}
Current Status: ${cook.status}
Branch: ${cook.branch || 'not created yet'}`;
      }
    }
  } catch {
    // Ignore state read errors
  }

  const actionDesc = action === 'implement'
    ? 'start implementation (create branch, write code)'
    : 'implement and create PR';

  const response = {
    continue: true,
    systemMessage: `EXECUTION CHECKPOINT

Detected trigger: "${trigger}"
Action: ${actionDesc}
${activeCookInfo}

Before proceeding, ensure:
1. The cook artifact is ready and validated
2. You have reviewed the Patch Plan
3. You understand the scope of changes

To proceed:
- Run: cook-implement <artifact-path>  (for --implement)
- Run: cook-verify --create-pr <artifact-path>  (for --create-pr)

Or confirm explicitly: "Yes, implement the cook" / "Yes, create the PR"`
  };

  console.log(JSON.stringify(response));
}
