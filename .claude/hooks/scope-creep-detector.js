#!/usr/bin/env node

/**
 * Scope Creep Detector Hook
 *
 * Detects file edits outside the active cook's Patch Plan scope.
 * Warns user and offers options for handling out-of-scope changes.
 *
 * Event: PreToolUse (Edit tool)
 *
 * Exit codes:
 *   0 - Allow (with optional warning)
 *   2 - Block (require user action)
 */

const fs = require('fs');
const path = require('path');

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

    // Only check Edit tool
    if (toolName !== 'Edit') {
      console.log(JSON.stringify({ continue: true }));
      process.exit(0);
    }

    const targetFile = toolInput.file_path || toolInput.path || '';

    if (!targetFile) {
      console.log(JSON.stringify({ continue: true }));
      process.exit(0);
    }

    // Load state to find active cook
    const statePath = path.resolve('.claude/cook-state.json');
    if (!fs.existsSync(statePath)) {
      // No state file, no active cook - allow edit
      console.log(JSON.stringify({ continue: true }));
      process.exit(0);
    }

    const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));

    if (!state.active || !state.cooks[state.active]) {
      // No active cook - allow edit
      console.log(JSON.stringify({ continue: true }));
      process.exit(0);
    }

    const activeCook = state.cooks[state.active];

    // Only check if status is 'implementing'
    if (activeCook.status !== 'implementing') {
      console.log(JSON.stringify({ continue: true }));
      process.exit(0);
    }

    // Load artifact to get Patch Plan
    const artifactPath = path.resolve(activeCook.artifact);
    if (!fs.existsSync(artifactPath)) {
      console.log(JSON.stringify({ continue: true }));
      process.exit(0);
    }

    const artifactContent = fs.readFileSync(artifactPath, 'utf-8');
    const plannedFiles = extractPatchPlanFiles(artifactContent);

    if (plannedFiles.length === 0) {
      // No patch plan found - allow edit
      console.log(JSON.stringify({ continue: true }));
      process.exit(0);
    }

    // Normalize paths for comparison
    const normalizedTarget = normalizePath(targetFile);
    const normalizedPlanned = plannedFiles.map(normalizePath);

    // Check if target is in Patch Plan
    const isPlanned = normalizedPlanned.some(p =>
      normalizedTarget.endsWith(p) || p.endsWith(normalizedTarget) || normalizedTarget === p
    );

    if (isPlanned) {
      // File is in scope - allow
      console.log(JSON.stringify({ continue: true }));
      process.exit(0);
    }

    // File is OUT OF SCOPE - warn user
    const response = {
      continue: true,  // Don't block, but warn
      systemMessage: `SCOPE CREEP DETECTED

You are editing: ${targetFile}
Active cook: ${state.active}

This file is NOT in the Patch Plan.

Planned files:
${plannedFiles.map(f => `  - ${f}`).join('\n')}

Options:
1. Re-cook: Update the cook scope to include this file
2. New cook: Create a separate cook for this change
3. Continue anyway (changes will be marked as untracked)

To force untracked change, include "--force-untracked" in your next message.`
    };

    console.log(JSON.stringify(response));
    process.exit(0);

  } catch (error) {
    // On error, allow edit
    console.log(JSON.stringify({ continue: true }));
    process.exit(0);
  }
});

/**
 * Extract file paths from Patch Plan section
 */
function extractPatchPlanFiles(content) {
  const files = [];

  // Find Implementation Plan or Patch Plan section
  const sectionMatch = content.match(/^## (?:Implementation Plan|Patch Plan|Fix Plan)\s*\n([\s\S]*?)(?=\n## |$)/m);

  if (!sectionMatch) {
    return files;
  }

  const sectionContent = sectionMatch[1];
  const lines = sectionContent.split('\n');

  for (const line of lines) {
    // Pattern 1: `path/to/file.ts`
    const backtickMatch = line.match(/`([^`]+\.\w+)`/);
    if (backtickMatch) {
      files.push(backtickMatch[1]);
      continue;
    }

    // Pattern 2: - path/to/file.ts
    const bulletMatch = line.match(/[-*]\s+(\S+\.\w{1,5})/);
    if (bulletMatch) {
      files.push(bulletMatch[1]);
      continue;
    }

    // Pattern 3: | path/to/file.ts | ...
    const tableMatch = line.match(/\|\s*(\S+\.\w+)\s*\|/);
    if (tableMatch) {
      files.push(tableMatch[1]);
    }
  }

  return files;
}

/**
 * Normalize file path
 */
function normalizePath(filePath) {
  return path.normalize(filePath)
    .replace(/^\.\//, '')
    .replace(/\\/g, '/');
}
