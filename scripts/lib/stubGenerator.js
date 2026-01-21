/**
 * Stub Generator for Implementation Bridge
 *
 * Creates file stubs and test skeletons from cook artifact plans.
 */

const fs = require('fs');
const path = require('path');
const { parseArtifact } = require('./artifactParser');

/**
 * Extract files to create from artifact
 *
 * @param {string} artifactPath - Path to artifact
 * @returns {Object} Parsed artifact with files
 */
function loadArtifactFiles(artifactPath) {
  const artifact = parseArtifact(artifactPath);
  const files = extractFilesFromArtifact(artifact.raw);

  return {
    artifact,
    files
  };
}

/**
 * Extract file paths from artifact content
 *
 * @param {string} content - Artifact content
 * @returns {Object[]} Array of file info
 */
function extractFilesFromArtifact(content) {
  const files = [];

  // Pattern 1: Table rows with file paths
  // | `file/path.js` | purpose |
  const tablePattern = /\|\s*`([^`]+\.[a-z]+)`\s*\|\s*([^|]+)\|/gi;
  let match;

  while ((match = tablePattern.exec(content)) !== null) {
    const filePath = match[1].trim();
    const purpose = match[2].trim();

    // Skip if it looks like a header or example
    if (filePath.includes('file/path') || filePath.includes('example')) continue;

    files.push({
      path: filePath,
      purpose,
      isTest: isTestFile(filePath)
    });
  }

  // Pattern 2: Numbered list with paths
  // 1. `file/path.js` - purpose
  const listPattern = /^\d+\.\s*`([^`]+\.[a-z]+)`\s*[-–]\s*(.+)$/gim;

  while ((match = listPattern.exec(content)) !== null) {
    const filePath = match[1].trim();
    const purpose = match[2].trim();

    if (!files.some(f => f.path === filePath)) {
      files.push({
        path: filePath,
        purpose,
        isTest: isTestFile(filePath)
      });
    }
  }

  return files;
}

/**
 * Check if file is a test file
 *
 * @param {string} filePath - File path
 * @returns {boolean}
 */
function isTestFile(filePath) {
  const lower = filePath.toLowerCase();
  return lower.includes('.test.') ||
         lower.includes('.spec.') ||
         lower.includes('test/') ||
         lower.includes('tests/') ||
         lower.includes('__tests__/');
}

/**
 * Generate stub content for a file
 *
 * @param {Object} fileInfo - File info object
 * @param {Object} artifact - Parsed artifact
 * @returns {string} Stub content
 */
function generateStubContent(fileInfo, artifact) {
  const ext = path.extname(fileInfo.path).toLowerCase();
  const basename = path.basename(fileInfo.path, ext);
  const title = artifact.header ? artifact.header.title : 'Feature';

  if (fileInfo.isTest) {
    return generateTestStub(basename, fileInfo.purpose, ext);
  }

  switch (ext) {
    case '.js':
      return generateJsStub(basename, fileInfo.purpose);
    case '.ts':
      return generateTsStub(basename, fileInfo.purpose);
    case '.md':
      return generateMdStub(basename, fileInfo.purpose, title);
    default:
      return generateDefaultStub(fileInfo.purpose);
  }
}

/**
 * Generate JavaScript stub
 */
function generateJsStub(name, purpose) {
  return `/**
 * ${name}
 *
 * ${purpose}
 *
 * TODO: Implement this module
 */

// Exports will go here
module.exports = {
  // TODO: Add exports
};
`;
}

/**
 * Generate TypeScript stub
 */
function generateTsStub(name, purpose) {
  return `/**
 * ${name}
 *
 * ${purpose}
 *
 * TODO: Implement this module
 */

// Types
export interface ${toPascalCase(name)}Options {
  // TODO: Define options
}

// Exports
export function ${toCamelCase(name)}(options: ${toPascalCase(name)}Options): void {
  // TODO: Implement
  throw new Error('Not implemented');
}
`;
}

/**
 * Generate Markdown stub
 */
function generateMdStub(name, purpose, title) {
  return `# ${toPascalCase(name)}

${purpose}

## Overview

TODO: Add overview

## Usage

TODO: Add usage examples

## API

TODO: Document API

---

Generated from: ${title}
`;
}

/**
 * Generate test stub
 */
function generateTestStub(name, purpose, ext) {
  const isTs = ext === '.ts';

  return `/**
 * Tests for ${name}
 *
 * ${purpose}
 */

${isTs ? "import { describe, it, expect } from 'vitest';" : "const { describe, it } = require('node:test');"}
${isTs ? '' : "const assert = require('node:assert');"}

describe('${name}', () => {
  describe('basic functionality', () => {
    it('should work correctly', ${isTs ? '' : 'async '}() => {
      // TODO: Implement test
      ${isTs ? 'expect(true).toBe(true);' : 'assert.ok(true);'}
    });

    it('should handle edge cases', ${isTs ? '' : 'async '}() => {
      // TODO: Implement test
      ${isTs ? 'expect(true).toBe(true);' : 'assert.ok(true);'}
    });
  });

  describe('error handling', () => {
    it('should throw on invalid input', ${isTs ? '' : 'async '}() => {
      // TODO: Implement test
      ${isTs ? 'expect(true).toBe(true);' : 'assert.ok(true);'}
    });
  });
});
`;
}

/**
 * Generate default stub
 */
function generateDefaultStub(purpose) {
  return `# Stub File

Purpose: ${purpose}

TODO: Implement this file
`;
}

/**
 * Create file stubs from artifact
 *
 * @param {string} artifactPath - Path to artifact
 * @param {Object} options - Options
 * @returns {Object} Result with created/skipped files
 */
function createFileStubs(artifactPath, options = {}) {
  const { dryRun = false, force = false } = options;
  const { artifact, files } = loadArtifactFiles(artifactPath);

  const result = {
    created: [],
    skipped: [],
    errors: []
  };

  for (const fileInfo of files) {
    const filePath = fileInfo.path;

    // Check if file exists
    if (fs.existsSync(filePath) && !force) {
      result.skipped.push({ path: filePath, reason: 'Already exists' });
      continue;
    }

    // Generate stub content
    const content = generateStubContent(fileInfo, artifact);

    if (dryRun) {
      result.created.push({ path: filePath, dryRun: true });
      continue;
    }

    try {
      // Create directory if needed
      const dir = path.dirname(filePath);
      if (dir && !fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write file
      fs.writeFileSync(filePath, content, 'utf8');
      result.created.push({ path: filePath });
    } catch (err) {
      result.errors.push({ path: filePath, error: err.message });
    }
  }

  return result;
}

/**
 * Format prep report for console
 *
 * @param {Object} result - Result from createFileStubs
 * @returns {string} Formatted report
 */
function formatPrepReport(result) {
  const lines = [];

  lines.push('');
  lines.push('======================================');
  lines.push('  COOK-PREP - Stub Generation Report');
  lines.push('======================================');
  lines.push('');

  if (result.created.length > 0) {
    lines.push(`Created: ${result.created.length} file(s)`);
    for (const f of result.created) {
      const suffix = f.dryRun ? ' (dry-run)' : '';
      lines.push(`  + ${f.path}${suffix}`);
    }
    lines.push('');
  }

  if (result.skipped.length > 0) {
    lines.push(`Skipped: ${result.skipped.length} file(s)`);
    for (const f of result.skipped) {
      lines.push(`  - ${f.path} (${f.reason})`);
    }
    lines.push('');
  }

  if (result.errors.length > 0) {
    lines.push(`Errors: ${result.errors.length}`);
    for (const f of result.errors) {
      lines.push(`  ! ${f.path}: ${f.error}`);
    }
    lines.push('');
  }

  if (result.created.length === 0 && result.skipped.length === 0) {
    lines.push('No files to create from artifact.');
    lines.push('');
  }

  return lines.join('\n');
}

// Utility functions
function toCamelCase(str) {
  return str.replace(/[-_](.)/g, (_, c) => c.toUpperCase());
}

function toPascalCase(str) {
  const camel = toCamelCase(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

module.exports = {
  loadArtifactFiles,
  extractFilesFromArtifact,
  generateStubContent,
  createFileStubs,
  formatPrepReport,
  isTestFile
};
