/**
 * Artifact Parser for cook artifacts
 *
 * Design Decision: Option A - Changelog inside artifact file
 * Rationale: Single file management, no orphaned metadata, visible in artifact
 *
 * Diff Granularity: Section-level (## headings)
 * Rationale: Aligns with artifact template structure, more readable than paragraph/raw
 */

const fs = require('fs');
const path = require('path');

/**
 * Parse artifact header metadata
 * Extracts: title (dish), status, cooking mode, decision owner
 *
 * @param {string} content - Raw markdown content
 * @returns {Object} Parsed header metadata
 */
function parseHeader(content) {
  const header = {
    title: null,
    status: null,
    mode: null,
    owner: null,
    date: null
  };

  // Extract title from ## Dish section
  const dishMatch = content.match(/^## Dish\s*\n+(.+?)(?=\n\n|\n##|$)/m);
  if (dishMatch) {
    header.title = dishMatch[1].trim();
  }

  // Extract status
  const statusMatch = content.match(/^## Status\s*\n+(\w[\w-]*)/m);
  if (statusMatch) {
    header.status = statusMatch[1].trim();
  }

  // Extract cooking mode
  const modeMatch = content.match(/^## Cooking Mode\s*\n+(\w[\w-]*)/m);
  if (modeMatch) {
    header.mode = modeMatch[1].trim();
  }

  // Extract decision owner
  const ownerMatch = content.match(/Decision Owner:\s*(.+)/);
  if (ownerMatch) {
    header.owner = ownerMatch[1].trim();
  }

  return header;
}

/**
 * Parse artifact into sections by ## headings
 *
 * @param {string} content - Raw markdown content
 * @returns {Map<string, string>} Map of section name -> section content
 */
function parseSections(content) {
  const sections = new Map();

  // Split by ## headings (level 2) using line-by-line parsing
  // This avoids regex issues with multiline matching
  const lines = content.split('\n');
  let currentSection = null;
  let currentContent = [];

  for (const line of lines) {
    if (line.startsWith('## ')) {
      // Save previous section
      if (currentSection) {
        sections.set(currentSection, currentContent.join('\n').trim());
      }
      // Start new section
      currentSection = line.substring(3).trim();
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(line);
    }
  }
  // Save last section
  if (currentSection) {
    sections.set(currentSection, currentContent.join('\n').trim());
  }

  return sections;
}

/**
 * Parse changelog entries from artifact
 *
 * @param {string} content - Raw markdown content
 * @returns {Array<{date: string, summary: string}>} Changelog entries
 */
function parseChangelog(content) {
  const entries = [];

  // Find the Changelog section by splitting on ## headings
  const lines = content.split('\n');
  let inChangelog = false;
  let changelogLines = [];

  for (const line of lines) {
    if (line.match(/^## Changelog/)) {
      inChangelog = true;
      continue;
    }
    if (inChangelog && line.match(/^## /)) {
      // Hit next section, stop
      break;
    }
    if (inChangelog) {
      changelogLines.push(line);
    }
  }

  // Parse entries in format: YYYY-MM-DD: <summary>
  for (const line of changelogLines) {
    const match = line.match(/^(\d{4}-\d{2}-\d{2}):\s*(.+)$/);
    if (match) {
      entries.push({
        date: match[1],
        summary: match[2].trim()
      });
    }
  }

  return entries;
}

/**
 * Extract date from artifact filename
 * Expected format: <slug>.<YYYY-MM-DD>.cook.md
 *
 * @param {string} filename - Artifact filename
 * @returns {string|null} Date string or null if not parseable
 */
function extractDateFromFilename(filename) {
  const basename = path.basename(filename);
  const dateMatch = basename.match(/\.(\d{4}-\d{2}-\d{2})\.cook\.md$/);
  return dateMatch ? dateMatch[1] : null;
}

/**
 * Compare two section maps and return differences
 *
 * @param {Map<string, string>} sectionsA - Sections from artifact A
 * @param {Map<string, string>} sectionsB - Sections from artifact B
 * @returns {Object} Diff result with added, removed, modified sections
 */
function diffSections(sectionsA, sectionsB) {
  const added = [];
  const removed = [];
  const modified = [];
  const unchanged = [];

  // Find removed and modified sections
  for (const [name, contentA] of sectionsA) {
    if (!sectionsB.has(name)) {
      removed.push({ name, content: contentA });
    } else {
      const contentB = sectionsB.get(name);
      if (contentA !== contentB) {
        modified.push({
          name,
          contentA,
          contentB,
          summary: generateModificationSummary(contentA, contentB)
        });
      } else {
        unchanged.push({ name });
      }
    }
  }

  // Find added sections
  for (const [name, contentB] of sectionsB) {
    if (!sectionsA.has(name)) {
      added.push({ name, content: contentB });
    }
  }

  return { added, removed, modified, unchanged };
}

/**
 * Generate a brief summary of modifications between two section contents
 *
 * @param {string} contentA - Original content
 * @param {string} contentB - New content
 * @returns {Array<string>} Summary bullets (1-3 items)
 */
function generateModificationSummary(contentA, contentB) {
  const summary = [];

  const linesA = contentA.split('\n').filter(l => l.trim());
  const linesB = contentB.split('\n').filter(l => l.trim());

  // Find added lines (in B but not in A)
  const addedLines = linesB.filter(l => !linesA.includes(l));
  if (addedLines.length > 0) {
    const sample = addedLines[0].substring(0, 50);
    summary.push(`Added: "${sample}${addedLines[0].length > 50 ? '...' : ''}"`);
  }

  // Find removed lines (in A but not in B)
  const removedLines = linesA.filter(l => !linesB.includes(l));
  if (removedLines.length > 0) {
    const sample = removedLines[0].substring(0, 50);
    summary.push(`Removed: "${sample}${removedLines[0].length > 50 ? '...' : ''}"`);
  }

  // Line count change
  const lineDiff = linesB.length - linesA.length;
  if (lineDiff !== 0 && summary.length < 3) {
    summary.push(`${lineDiff > 0 ? '+' : ''}${lineDiff} lines`);
  }

  return summary.slice(0, 3);
}

/**
 * Filter changelog entries by date
 *
 * @param {Array} entries - Changelog entries
 * @param {string} sinceDate - ISO date string (YYYY-MM-DD)
 * @returns {Array} Filtered entries
 */
function filterChangelogByDate(entries, sinceDate) {
  const since = new Date(sinceDate);
  return entries.filter(entry => new Date(entry.date) >= since);
}

/**
 * Read and parse an artifact file
 *
 * @param {string} filePath - Path to artifact file
 * @returns {Object} Parsed artifact with header, sections, changelog
 */
function parseArtifact(filePath) {
  const resolvedPath = path.resolve(filePath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const content = fs.readFileSync(resolvedPath, 'utf-8');

  return {
    path: resolvedPath,
    filename: path.basename(resolvedPath),
    date: extractDateFromFilename(resolvedPath),
    header: parseHeader(content),
    sections: parseSections(content),
    changelog: parseChangelog(content),
    raw: content
  };
}

/**
 * Parse Implementation Status section from artifact
 *
 * @param {string} content - Raw markdown content
 * @returns {Object|null} Parsed implementation status or null if not present
 */
function parseImplementationStatus(content) {
  const sections = parseSections(content);
  const implSection = sections.get('Implementation Status');

  if (!implSection) {
    return null;
  }

  const status = {
    execution: null,
    branch: null,
    pr: null,
    prUrl: null,
    commits: 0,
    cookTag: null,
    coverage: null,
    unplannedChanges: null,
    foreignCommits: [],
    untrackedChanges: [],
    lastActivity: null
  };

  // Parse each line
  const lines = implSection.split('\n');

  for (const line of lines) {
    // Status/Execution
    const execMatch = line.match(/(?:Status|Execution):\s*(\S+)/i);
    if (execMatch) {
      status.execution = execMatch[1].toLowerCase();
    }

    // Branch
    const branchMatch = line.match(/Branch:\s*(\S+)/i);
    if (branchMatch) {
      status.branch = branchMatch[1].replace(/[()]/g, '');
    }

    // PR number and URL
    const prMatch = line.match(/PR:\s*#?(\d+)/i);
    if (prMatch) {
      status.pr = parseInt(prMatch[1], 10);
    }
    const prUrlMatch = line.match(/PR:.*?(https:\/\/github\.com\/[^\s)]+)/i);
    if (prUrlMatch) {
      status.prUrl = prUrlMatch[1];
    }

    // Commits count and tag
    const commitsMatch = line.match(/Commits:\s*(\d+)/i);
    if (commitsMatch) {
      status.commits = parseInt(commitsMatch[1], 10);
    }
    const tagMatch = line.match(/\[cook:([^\]]+)\]/);
    if (tagMatch) {
      status.cookTag = tagMatch[1];
    }

    // Coverage
    const coverageMatch = line.match(/Coverage:\s*(\d+\/\d+)/i);
    if (coverageMatch) {
      status.coverage = coverageMatch[1];
    }

    // Unplanned changes
    const unplannedMatch = line.match(/Unplanned changes:\s*(.+)/i);
    if (unplannedMatch) {
      status.unplannedChanges = unplannedMatch[1].trim();
    }

    // Last activity
    const activityMatch = line.match(/Last activity:\s*(.+)/i);
    if (activityMatch) {
      status.lastActivity = activityMatch[1].trim();
    }

    // Foreign commits (multi-line, starts with warning emoji)
    if (line.includes('Foreign commits:')) {
      const countMatch = line.match(/Foreign commits:\s*(\d+)/i);
      if (countMatch && parseInt(countMatch[1], 10) > 0) {
        // Parse following indented lines as foreign commits
        const idx = lines.indexOf(line);
        for (let i = idx + 1; i < lines.length; i++) {
          const fcLine = lines[i];
          if (fcLine.startsWith('  - ') || fcLine.startsWith('    - ')) {
            status.foreignCommits.push(fcLine.trim().replace(/^- /, ''));
          } else if (!fcLine.startsWith('  ')) {
            break;
          }
        }
      }
    }

    // Untracked changes warning
    if (line.includes('UNTRACKED CHANGES DETECTED')) {
      const idx = lines.indexOf(line);
      for (let i = idx + 1; i < lines.length; i++) {
        const ucLine = lines[i];
        if (ucLine.startsWith('  - ') || ucLine.startsWith('    - ')) {
          status.untrackedChanges.push(ucLine.trim().replace(/^- /, ''));
        } else if (!ucLine.startsWith('  ')) {
          break;
        }
      }
    }
  }

  return status;
}

/**
 * Update or create Implementation Status section in artifact content
 *
 * @param {string} content - Raw markdown content
 * @param {Object} updates - Fields to update
 * @returns {string} Updated content
 */
function updateImplementationStatus(content, updates) {
  const now = new Date().toISOString().split('T')[0] + ' ' +
              new Date().toISOString().split('T')[1].substring(0, 5);

  // Build new Implementation Status section
  let newSection = '## Implementation Status\n';
  newSection += `- Status: ${updates.execution || 'planned'}\n`;

  if (updates.branch) {
    newSection += `- Branch: ${updates.branch}`;
    if (updates.branchCreated) {
      newSection += ' (auto-created)';
    }
    newSection += '\n';
  }

  if (updates.pr) {
    newSection += `- PR: #${updates.pr}`;
    if (updates.prUrl) {
      newSection += ` (${updates.prUrl})`;
    }
    newSection += '\n';
  }

  if (updates.commits !== undefined) {
    newSection += `- Commits: ${updates.commits}`;
    if (updates.cookTag) {
      newSection += ` [cook:${updates.cookTag}]`;
    }
    newSection += '\n';
  }

  if (updates.coverage) {
    newSection += `- Coverage: ${updates.coverage}\n`;
  }

  if (updates.unplannedChanges !== undefined) {
    newSection += `- Unplanned changes: ${updates.unplannedChanges || 'none'}\n`;
  }

  if (updates.foreignCommits && updates.foreignCommits.length > 0) {
    newSection += `- Foreign commits: ${updates.foreignCommits.length}\n`;
    for (const fc of updates.foreignCommits) {
      newSection += `  - ${fc}\n`;
    }
  }

  if (updates.untrackedChanges && updates.untrackedChanges.length > 0) {
    newSection += `- UNTRACKED CHANGES DETECTED:\n`;
    for (const uc of updates.untrackedChanges) {
      newSection += `  - ${uc}\n`;
    }
  }

  newSection += `- Last activity: ${now}\n`;

  // Check if Implementation Status section exists
  const sections = parseSections(content);

  if (sections.has('Implementation Status')) {
    // Replace existing section - find start and end precisely
    const lines = content.split('\n');
    let startLine = -1;
    let endLine = lines.length;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('## Implementation Status')) {
        startLine = i;
      } else if (startLine !== -1 && lines[i].startsWith('## ')) {
        // Found next section
        endLine = i;
        break;
      }
    }

    if (startLine !== -1) {
      const before = lines.slice(0, startLine).join('\n');
      const after = lines.slice(endLine).join('\n');
      return before + (before.endsWith('\n') ? '' : '\n') + newSection.trim() + '\n\n' + after;
    }
  }

  // Insert after Cooking Mode section (or after Status if no Cooking Mode)
  const insertAfter = sections.has('Cooking Mode') ? 'Cooking Mode' : 'Status';
  const lines = content.split('\n');
  let insertIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith(`## ${insertAfter}`)) {
      // Find end of this section
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].startsWith('## ')) {
          insertIndex = j;
          break;
        }
      }
      if (insertIndex === -1) {
        insertIndex = lines.length;
      }
      break;
    }
  }

  if (insertIndex !== -1) {
    const before = lines.slice(0, insertIndex).join('\n');
    const after = lines.slice(insertIndex).join('\n');
    return before + '\n\n' + newSection + after;
  }

  // Fallback: append at end
  return content + '\n\n' + newSection;
}

/**
 * Extract Patch Plan files from artifact
 * Looks for file paths in Implementation Plan or Patch Plan section
 *
 * @param {string} content - Raw markdown content
 * @returns {Array<{file: string, action: string, description: string}>} Patch plan items
 */
function extractPatchPlan(content) {
  const sections = parseSections(content);

  // Try different section names
  const patchContent = sections.get('Implementation Plan') ||
                       sections.get('Patch Plan') ||
                       sections.get('Fix Plan');

  if (!patchContent) {
    return [];
  }

  const patchItems = [];
  const lines = patchContent.split('\n');

  // Pattern 1: "- `path/to/file.ts` - description"
  // Pattern 2: "- path/to/file.ts: description"
  // Pattern 3: "| path/to/file.ts | action | description |" (table)
  // Pattern 4: File paths with action keywords (new, modify, delete)

  for (const line of lines) {
    // Skip empty lines and headers
    if (!line.trim() || line.startsWith('#')) continue;

    // Pattern 1: Backtick wrapped paths
    const backtickMatch = line.match(/`([^`]+\.\w+)`\s*[-:]?\s*(.*)/);
    if (backtickMatch) {
      const filePath = backtickMatch[1];
      const description = backtickMatch[2] || '';
      const action = detectAction(line, description);
      patchItems.push({ file: filePath, action, description: description.trim() });
      continue;
    }

    // Pattern 2: File path with extension
    const fileMatch = line.match(/[-*]\s*(\S+\.\w{1,5})\s*[-:]?\s*(.*)/);
    if (fileMatch) {
      const filePath = fileMatch[1];
      const description = fileMatch[2] || '';
      const action = detectAction(line, description);
      patchItems.push({ file: filePath, action, description: description.trim() });
      continue;
    }

    // Pattern 3: Table row
    const tableMatch = line.match(/\|\s*(\S+\.\w+)\s*\|\s*(\w+)\s*\|\s*(.*?)\s*\|/);
    if (tableMatch) {
      patchItems.push({
        file: tableMatch[1],
        action: tableMatch[2].toLowerCase(),
        description: tableMatch[3].trim()
      });
      continue;
    }
  }

  return patchItems;
}

/**
 * Helper: Detect action type from line content
 */
function detectAction(line, description) {
  const text = (line + ' ' + description).toLowerCase();

  if (text.includes('new file') || text.includes('create') || text.includes('add new')) {
    return 'create';
  }
  if (text.includes('delete') || text.includes('remove')) {
    return 'delete';
  }
  if (text.includes('rename') || text.includes('move')) {
    return 'rename';
  }
  return 'modify';
}

/**
 * Extract cook ID from artifact content or filename
 *
 * @param {string} filenameOrContent - Filename or content
 * @returns {string|null} Cook ID
 */
function extractCookId(filenameOrContent) {
  // Try filename pattern first: slug.YYYY-MM-DD.cook.md
  const filenameMatch = filenameOrContent.match(/([^/]+)\.(\d{4}-\d{2}-\d{2})\.cook\.md/);
  if (filenameMatch) {
    return `${filenameMatch[1]}.${filenameMatch[2]}`;
  }

  // Try to find cook tag in content
  const tagMatch = filenameOrContent.match(/\[cook:([^\]]+)\]/);
  if (tagMatch) {
    return tagMatch[1];
  }

  return null;
}

/**
 * Update artifact status field
 *
 * @param {string} content - Raw markdown content
 * @param {string} newStatus - New status value
 * @returns {string} Updated content
 */
function updateArtifactStatus(content, newStatus) {
  // Replace status in ## Status section
  const statusRegex = /^(## Status\s*\n+)(\w[\w-]*)/m;
  const match = content.match(statusRegex);

  if (match) {
    return content.replace(statusRegex, `$1${newStatus}`);
  }

  return content;
}

/**
 * Add changelog entry to artifact
 *
 * @param {string} content - Raw markdown content
 * @param {string} entry - Changelog entry text
 * @returns {string} Updated content
 */
function addChangelogEntry(content, entry) {
  const date = new Date().toISOString().split('T')[0];
  const newEntry = `${date}: ${entry}`;

  // Find Changelog section
  const changelogRegex = /^(## Changelog\s*\n)/m;
  const match = content.match(changelogRegex);

  if (match) {
    // Insert after heading
    const insertPos = match.index + match[0].length;
    return content.slice(0, insertPos) + newEntry + '\n' + content.slice(insertPos);
  } else {
    // Create Changelog section at end
    return content + '\n\n## Changelog\n' + newEntry + '\n';
  }
}

module.exports = {
  parseHeader,
  parseSections,
  parseChangelog,
  extractDateFromFilename,
  diffSections,
  generateModificationSummary,
  filterChangelogByDate,
  parseArtifact,

  // New execution mode functions
  parseImplementationStatus,
  updateImplementationStatus,
  extractPatchPlan,
  extractCookId,
  updateArtifactStatus,
  addChangelogEntry
};
