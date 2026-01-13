#!/usr/bin/env node

/**
 * Commit Tagger Hook
 *
 * Ensures commits on cook branches include the cook tag.
 * Runs after git commit commands.
 *
 * Event: PostToolUse (Bash tool with git commit)
 *
 * Exit codes:
 *   0 - Success (with optional warning/info)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Read input from stdin
let input = '';

process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  input += chunk;
});

process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const toolInput = data.tool_input || {};
    const toolName = data.tool_name || '';
    const toolOutput = data.tool_output || '';

    // Only check Bash tool with git commit
    if (toolName !== 'Bash') {
      console.log(JSON.stringify({ continue: true }));
      process.exit(0);
    }

    const command = toolInput.command || '';

    if (!command.includes('git commit')) {
      console.log(JSON.stringify({ continue: true }));
      process.exit(0);
    }

    // Check if commit was successful
    if (toolOutput.includes('nothing to commit') ||
        toolOutput.includes('no changes added') ||
        toolOutput.includes('error:') ||
        toolOutput.includes('fatal:')) {
      console.log(JSON.stringify({ continue: true }));
      process.exit(0);
    }

    // Get current branch
    let currentBranch;
    try {
      currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    } catch {
      console.log(JSON.stringify({ continue: true }));
      process.exit(0);
    }

    // Only check cook branches
    if (!currentBranch.startsWith('cook/')) {
      console.log(JSON.stringify({ continue: true }));
      process.exit(0);
    }

    // Load state to find active cook
    const statePath = path.resolve('.claude/cook-state.json');
    if (!fs.existsSync(statePath)) {
      console.log(JSON.stringify({ continue: true }));
      process.exit(0);
    }

    let state;
    try {
      state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    } catch {
      console.log(JSON.stringify({ continue: true }));
      process.exit(0);
    }

    if (!state.active || !state.cooks[state.active]) {
      console.log(JSON.stringify({ continue: true }));
      process.exit(0);
    }

    const cookId = state.active;

    // Get the last commit message
    let lastCommitMsg;
    try {
      lastCommitMsg = execSync('git log -1 --format="%s"', { encoding: 'utf-8' }).trim();
    } catch {
      console.log(JSON.stringify({ continue: true }));
      process.exit(0);
    }

    // Check if commit has cook tag
    const cookTagPattern = new RegExp(`\\[cook:${cookId.replace(/\./g, '\\.')}\\]`);

    if (cookTagPattern.test(lastCommitMsg)) {
      // Tag present - all good
      const response = {
        continue: true,
        systemMessage: `Commit tracked: ${lastCommitMsg.substring(0, 60)}...`
      };
      console.log(JSON.stringify(response));
      process.exit(0);
    }

    // Tag missing - check if it has any cook tag
    if (/\[cook:[^\]]+\]/.test(lastCommitMsg)) {
      // Has a different cook tag - this might be intentional
      console.log(JSON.stringify({ continue: true }));
      process.exit(0);
    }

    // No cook tag - warn user
    const response = {
      continue: true,
      systemMessage: `COMMIT TAG MISSING

Your commit on branch "${currentBranch}" doesn't have the cook tag.

Commit: ${lastCommitMsg}
Active cook: ${cookId}

Expected format:
  <message> [cook:${cookId}]

To fix, you can amend the commit:
  git commit --amend -m "${lastCommitMsg} [cook:${cookId}]"

Or mark this as a foreign commit (it will be tracked separately).`
    };

    console.log(JSON.stringify(response));
    process.exit(0);

  } catch (error) {
    // On error, continue without warning
    console.log(JSON.stringify({ continue: true }));
    process.exit(0);
  }
});
