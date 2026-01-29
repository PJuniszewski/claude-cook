#!/usr/bin/env node

/**
 * Tests for /juni:inspect command and sanitation_inspector_chef agent
 *
 * Run with: node test/inspect.test.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const PLUGIN_ROOT = path.join(__dirname, '..');
const AGENTS_DIR = path.join(PLUGIN_ROOT, '.claude', 'agents');
const COMMANDS_DIR = path.join(PLUGIN_ROOT, '.claude', 'commands');
const HOOKS_FILE = path.join(PLUGIN_ROOT, '.claude', 'hooks', 'hooks.json');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (error) {
    console.log(`  [FAIL] ${name}`);
    console.log(`         ${error.message}`);
    failed++;
  }
}

function suite(name, fn) {
  console.log(`\n${name}`);
  console.log('='.repeat(name.length));
  fn();
}

// Parse YAML frontmatter from markdown file
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const yaml = match[1];
  const result = {};

  for (const line of yaml.split('\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      result[key] = value;
    }
  }

  return result;
}

// Tests

suite('File Structure', () => {
  test('sanitation_inspector_chef.md exists', () => {
    const agentPath = path.join(AGENTS_DIR, 'sanitation_inspector_chef.md');
    assert.ok(fs.existsSync(agentPath), 'Agent file should exist');
  });

  test('inspect.md command exists', () => {
    const commandPath = path.join(COMMANDS_DIR, 'inspect.md');
    assert.ok(fs.existsSync(commandPath), 'Command file should exist');
  });

  test('hooks.json exists and is valid JSON', () => {
    assert.ok(fs.existsSync(HOOKS_FILE), 'Hooks file should exist');
    const content = fs.readFileSync(HOOKS_FILE, 'utf-8');
    assert.doesNotThrow(() => JSON.parse(content), 'Should be valid JSON');
  });
});

suite('Agent: sanitation_inspector_chef.md', () => {
  const agentPath = path.join(AGENTS_DIR, 'sanitation_inspector_chef.md');
  const content = fs.readFileSync(agentPath, 'utf-8');
  const frontmatter = parseFrontmatter(content);

  test('has required frontmatter name', () => {
    assert.ok(frontmatter.name, 'Should have name in frontmatter');
    assert.ok(frontmatter.name.includes('sanitation_inspector'), 'Name should include sanitation_inspector');
  });

  test('has required frontmatter description', () => {
    assert.ok(frontmatter.description, 'Should have description');
    assert.ok(frontmatter.description.length > 10, 'Description should be meaningful');
  });

  test('uses juni: namespace', () => {
    assert.ok(frontmatter.name.startsWith('juni:'), 'Name should use juni: namespace');
  });

  test('has Role section', () => {
    assert.ok(content.includes('## Role'), 'Should have Role section');
  });

  test('documents inspection areas', () => {
    assert.ok(content.includes('Hygiene'), 'Should document hygiene checks');
    assert.ok(content.includes('Recipe Compliance') || content.includes('Compliance'), 'Should document compliance checks');
    assert.ok(content.includes('Safety'), 'Should document safety checks');
  });

  test('has inspection report format', () => {
    assert.ok(content.includes('Inspection Report'), 'Should document report format');
    assert.ok(content.includes('PASSED') || content.includes('VIOLATIONS'), 'Should have pass/fail states');
  });

  test('documents trigger patterns', () => {
    assert.ok(content.includes('auth/') || content.includes('auth'), 'Should document auth triggers');
    assert.ok(content.includes('schema/') || content.includes('migration'), 'Should document schema triggers');
    assert.ok(content.includes('payment') || content.includes('billing'), 'Should document payment triggers');
  });

  test('includes humor elements', () => {
    assert.ok(content.includes('Humor') || content.includes('humor'), 'Should document humor elements');
    assert.ok(content.includes('kitchen') || content.includes('Kitchen'), 'Should use kitchen metaphor');
  });
});

suite('Command: inspect.md', () => {
  const commandPath = path.join(COMMANDS_DIR, 'inspect.md');
  const content = fs.readFileSync(commandPath, 'utf-8');
  const frontmatter = parseFrontmatter(content);

  test('has required frontmatter description', () => {
    assert.ok(frontmatter.description, 'Should have description');
    assert.ok(frontmatter.description.toLowerCase().includes('inspect'), 'Description should mention inspection');
  });

  test('has argument-hint', () => {
    assert.ok(frontmatter['argument-hint'], 'Should have argument-hint');
  });

  test('has allowed-tools', () => {
    assert.ok(frontmatter['allowed-tools'], 'Should have allowed-tools');
    assert.ok(frontmatter['allowed-tools'].includes('Bash'), 'Should allow Bash');
    assert.ok(frontmatter['allowed-tools'].includes('Read'), 'Should allow Read');
  });

  test('documents syntax', () => {
    assert.ok(content.includes('/juni:inspect') || content.includes('/inspect'), 'Should document command syntax');
  });

  test('supports artifact argument', () => {
    assert.ok(content.includes('<artifact>') || content.includes('artifact'), 'Should support artifact argument');
  });

  test('supports --surprise flag', () => {
    assert.ok(content.includes('--surprise'), 'Should support --surprise flag');
  });

  test('documents execution steps', () => {
    assert.ok(content.includes('Step 1') || content.includes('### Step'), 'Should have execution steps');
  });

  test('documents parallel agents', () => {
    assert.ok(content.includes('parallel') || content.includes('Parallel'), 'Should mention parallel inspection');
    assert.ok(content.includes('Hygiene Agent') || content.includes('hygiene'), 'Should document hygiene agent');
    assert.ok(content.includes('Safety Agent') || content.includes('safety'), 'Should document safety agent');
  });

  test('documents report appending', () => {
    assert.ok(content.includes('append') || content.includes('Append'), 'Should mention appending to artifact');
  });
});

suite('Hooks: Surprise Inspection Triggers', () => {
  const content = fs.readFileSync(HOOKS_FILE, 'utf-8');
  const hooks = JSON.parse(content);

  test('has PostToolUse hooks', () => {
    assert.ok(hooks.hooks.PostToolUse, 'Should have PostToolUse hooks');
    assert.ok(Array.isArray(hooks.hooks.PostToolUse), 'PostToolUse should be array');
  });

  test('has GitHub PR merge trigger', () => {
    const githubTrigger = hooks.hooks.PostToolUse.find(h =>
      h.matcher?.toolInput?.command?.contains === 'gh pr merge'
    );
    assert.ok(githubTrigger, 'Should have GitHub PR merge trigger');
  });

  test('has GitLab MR merge trigger', () => {
    const gitlabTrigger = hooks.hooks.PostToolUse.find(h =>
      h.matcher?.toolInput?.command?.contains === 'glab mr merge'
    );
    assert.ok(gitlabTrigger, 'Should have GitLab MR merge trigger');
  });

  test('GitHub trigger has prompt hook', () => {
    const githubTrigger = hooks.hooks.PostToolUse.find(h =>
      h.matcher?.toolInput?.command?.contains === 'gh pr merge'
    );
    assert.ok(githubTrigger.hooks, 'Should have hooks array');
    assert.ok(githubTrigger.hooks[0].type === 'prompt', 'Should be prompt type');
  });

  test('GitLab trigger has prompt hook', () => {
    const gitlabTrigger = hooks.hooks.PostToolUse.find(h =>
      h.matcher?.toolInput?.command?.contains === 'glab mr merge'
    );
    assert.ok(gitlabTrigger.hooks, 'Should have hooks array');
    assert.ok(gitlabTrigger.hooks[0].type === 'prompt', 'Should be prompt type');
  });

  test('trigger prompts mention inspection patterns', () => {
    const githubTrigger = hooks.hooks.PostToolUse.find(h =>
      h.matcher?.toolInput?.command?.contains === 'gh pr merge'
    );
    const prompt = githubTrigger.hooks[0].prompt;

    assert.ok(prompt.includes('auth/'), 'Should check auth patterns');
    assert.ok(prompt.includes('schema/') || prompt.includes('migration'), 'Should check schema patterns');
    assert.ok(prompt.includes('payment') || prompt.includes('billing'), 'Should check payment patterns');
    assert.ok(prompt.includes('300'), 'Should check PR size (300 lines)');
  });

  test('trigger prompts mention surprise announcement', () => {
    const githubTrigger = hooks.hooks.PostToolUse.find(h =>
      h.matcher?.toolInput?.command?.contains === 'gh pr merge'
    );
    const prompt = githubTrigger.hooks[0].prompt;

    assert.ok(prompt.includes('SANITATION INSPECTION'), 'Should have inspection announcement');
    assert.ok(prompt.includes('/juni:inspect') || prompt.includes('inspect'), 'Should reference inspect command');
  });
});

suite('Integration: Documentation Consistency', () => {
  const readmePath = path.join(PLUGIN_ROOT, 'README.md');
  const chefMatrixPath = path.join(PLUGIN_ROOT, 'CHEF_MATRIX.md');

  test('README mentions /juni:inspect', () => {
    const content = fs.readFileSync(readmePath, 'utf-8');
    assert.ok(content.includes('/juni:inspect'), 'README should document /juni:inspect');
  });

  test('README documents surprise inspections', () => {
    const content = fs.readFileSync(readmePath, 'utf-8');
    assert.ok(
      content.includes('surprise') || content.includes('Surprise') || content.includes('automatic'),
      'README should mention surprise/automatic inspections'
    );
  });

  test('CHEF_MATRIX includes sanitation inspector', () => {
    const content = fs.readFileSync(chefMatrixPath, 'utf-8');
    assert.ok(
      content.includes('Sanitation Inspector') || content.includes('sanitation'),
      'CHEF_MATRIX should include sanitation inspector'
    );
  });

  test('CHEF_MATRIX documents post-cook phase', () => {
    const content = fs.readFileSync(chefMatrixPath, 'utf-8');
    assert.ok(content.includes('Post-cook'), 'CHEF_MATRIX should mention post-cook phase');
  });
});

// Summary
console.log('\n' + '='.repeat(40));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(40));

process.exit(failed > 0 ? 1 : 0);
