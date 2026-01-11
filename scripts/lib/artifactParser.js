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

module.exports = {
  parseHeader,
  parseSections,
  parseChangelog,
  extractDateFromFilename,
  diffSections,
  generateModificationSummary,
  filterChangelogByDate,
  parseArtifact
};
