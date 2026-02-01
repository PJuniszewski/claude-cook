#!/usr/bin/env node

/**
 * Audit Logger for Cook Workflow
 *
 * Logs all significant events during cook execution to enable
 * cross-order learning and pattern detection.
 *
 * Log file: .claude/data/cook-audit.jsonl
 * Schema: .claude/data/cook-audit.schema.json
 */

const fs = require("fs");
const path = require("path");

const AUDIT_FILE = ".claude/data/cook-audit.jsonl";

/**
 * Get the audit file path relative to project root
 */
function getAuditPath() {
  // Try to find project root by looking for CLAUDE.md or .claude directory
  let dir = process.cwd();
  while (dir !== "/") {
    if (
      fs.existsSync(path.join(dir, "CLAUDE.md")) ||
      fs.existsSync(path.join(dir, ".claude"))
    ) {
      return path.join(dir, AUDIT_FILE);
    }
    dir = path.dirname(dir);
  }
  // Fallback to current directory
  return path.join(process.cwd(), AUDIT_FILE);
}

/**
 * Ensure the audit directory exists
 */
function ensureAuditDir() {
  const auditPath = getAuditPath();
  const dir = path.dirname(auditPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return auditPath;
}

/**
 * Append a log entry to the audit file
 */
function appendLog(entry) {
  const auditPath = ensureAuditDir();
  const line = JSON.stringify(entry) + "\n";
  fs.appendFileSync(auditPath, line, "utf8");
}

/**
 * Create a base log entry with timestamp
 */
function createBaseEntry(orderId, eventType) {
  return {
    timestamp: new Date().toISOString(),
    order_id: orderId,
    event_type: eventType,
  };
}

// ============ Public API ============

/**
 * Log the start of a phase
 */
function logPhaseStart(orderId, phase, chefId) {
  const entry = {
    ...createBaseEntry(orderId, "phase_start"),
    phase,
    chef_id: chefId,
  };
  appendLog(entry);
  return entry;
}

/**
 * Log the completion of a phase
 */
function logPhaseCompletion(orderId, phase, chefId, verdict, metadata = {}) {
  const entry = {
    ...createBaseEntry(orderId, "phase_complete"),
    phase,
    chef_id: chefId,
    verdict,
    ...metadata,
  };
  appendLog(entry);
  return entry;
}

/**
 * Log an escalation between chefs
 */
function logEscalation(orderId, fromChef, toChef, reason, condition = null) {
  const entry = {
    ...createBaseEntry(orderId, "escalation"),
    escalated: true,
    escalation: {
      from_chef: fromChef,
      to_chef: toChef,
      reason,
      condition,
    },
  };
  appendLog(entry);
  return entry;
}

/**
 * Log a blocker identified during review
 */
function logBlocker(orderId, phase, blockerType, description, severity = "MEDIUM") {
  const entry = {
    ...createBaseEntry(orderId, "blocker"),
    phase,
    blockers: [
      {
        type: blockerType,
        description,
        severity,
      },
    ],
  };
  appendLog(entry);
  return entry;
}

/**
 * Log a handoff between chefs
 */
function logHandoff(orderId, fromChef, toChef, validationStatus, missingFields = []) {
  const entry = {
    ...createBaseEntry(orderId, "handoff"),
    handoff: {
      from_chef: fromChef,
      to_chef: toChef,
      validation_status: validationStatus,
      missing_fields: missingFields,
    },
  };
  appendLog(entry);
  return entry;
}

/**
 * Log a validation failure
 */
function logValidationFailure(orderId, phase, chefId, failureDetails) {
  const entry = {
    ...createBaseEntry(orderId, "validation_failure"),
    phase,
    chef_id: chefId,
    metadata: failureDetails,
  };
  appendLog(entry);
  return entry;
}

/**
 * Log human intervention
 */
function logHumanIntervention(orderId, phase, reason, resolution = null) {
  const entry = {
    ...createBaseEntry(orderId, "human_intervention"),
    phase,
    metadata: {
      reason,
      resolution,
    },
  };
  appendLog(entry);
  return entry;
}

/**
 * Log cook completion
 */
function logCookComplete(orderId, finalStatus, durationSeconds, summary = {}) {
  const entry = {
    ...createBaseEntry(orderId, "cook_complete"),
    verdict: finalStatus,
    duration_seconds: durationSeconds,
    metadata: summary,
  };
  appendLog(entry);
  return entry;
}

/**
 * Read all audit entries for a specific order
 */
function getOrderAudit(orderId) {
  const auditPath = getAuditPath();
  if (!fs.existsSync(auditPath)) {
    return [];
  }

  const content = fs.readFileSync(auditPath, "utf8");
  const lines = content.trim().split("\n").filter(Boolean);

  return lines
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter((entry) => entry && entry.order_id === orderId);
}

/**
 * Read all audit entries
 */
function getAllAuditEntries() {
  const auditPath = getAuditPath();
  if (!fs.existsSync(auditPath)) {
    return [];
  }

  const content = fs.readFileSync(auditPath, "utf8");
  const lines = content.trim().split("\n").filter(Boolean);

  return lines
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

/**
 * Get unique order IDs from audit log
 */
function getOrderIds() {
  const entries = getAllAuditEntries();
  return [...new Set(entries.map((e) => e.order_id))];
}

module.exports = {
  logPhaseStart,
  logPhaseCompletion,
  logEscalation,
  logBlocker,
  logHandoff,
  logValidationFailure,
  logHumanIntervention,
  logCookComplete,
  getOrderAudit,
  getAllAuditEntries,
  getOrderIds,
  getAuditPath,
};

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case "path":
      console.log(getAuditPath());
      break;
    case "list":
      console.log(getOrderIds().join("\n"));
      break;
    case "show":
      const orderId = args[1];
      if (!orderId) {
        console.error("Usage: auditLogger.js show <order_id>");
        process.exit(1);
      }
      console.log(JSON.stringify(getOrderAudit(orderId), null, 2));
      break;
    case "all":
      console.log(JSON.stringify(getAllAuditEntries(), null, 2));
      break;
    default:
      console.log("Usage: auditLogger.js [path|list|show <order_id>|all]");
  }
}
