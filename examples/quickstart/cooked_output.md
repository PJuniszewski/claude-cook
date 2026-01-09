# Cook Artifact: task-due-dates

## Metadata
- **Feature**: Add due date field to tasks with reminder notifications
- **Mode**: well-done
- **Status**: well-done
- **Date**: 2024-01-15

---

## Phase 0: Policy Check

### Sources Scanned
- `CLAUDE.md` - found
- `README.md` - found

### Rules Extracted
| Rule | Source | Type |
|------|--------|------|
| Use TypeScript strict mode | CLAUDE.md | MUST |
| All API endpoints require authentication | CLAUDE.md | MUST |
| Use migrations for schema changes | CLAUDE.md | MUST |
| No raw SQL queries | CLAUDE.md | MUST |
| Min 80% test coverage | CLAUDE.md | SHOULD |

### Risk Level
**MEDIUM** - Database schema change required

---

## Product Decision

**Approved**

### User Value
- **Who**: Task users
- **Problem**: No visibility into deadlines, tasks get forgotten
- **Solution**: Due dates with proactive reminders
- **Success metric**: Reduction in overdue tasks (measurable via completion rate)

### Scope

**In Scope:**
- Due date field on tasks (optional)
- 24-hour reminder notification
- Visual indicator for overdue tasks
- Sort/filter by due date

**Out of Scope:**
- Recurring due dates
- Multiple reminder intervals
- Calendar integration
- Timezone handling (use server timezone)

**Non-goals:**
- Full calendar/scheduling system
- Task dependencies

---

## UX Review

### User Flow
1. User creates/edits task
2. User optionally sets due date via date picker
3. System sends reminder 24h before
4. Overdue tasks show red indicator
5. User can filter task list by due date

### Accessibility
- Date picker must be keyboard navigable
- Color indicator needs text alternative
- Reminder respects notification preferences

### UX Status
- Reviewed: yes
- Issues: none
- Recommendation: proceed

---

## Architecture Decision

### Approach
Add `due_date` column to tasks table, background job for reminders.

### Alternatives Considered

1. **Store due date in task metadata JSON**
   - Pros: No migration needed
   - Cons: Can't index for queries, harder to validate
   - Decision: Rejected

2. **Dedicated column with migration** (selected)
   - Pros: Proper indexing, type safety, queryable
   - Cons: Requires migration
   - Decision: Accepted

### System Impact
- Database: New column + index
- API: Updated task endpoints
- Background jobs: New reminder job
- Frontend: Date picker component

---

## Implementation Plan

### Files to Modify

1. **server/models/task.ts**
   - Add `dueDate?: Date` field
   - Add validation for future dates

2. **server/routes/tasks.ts**
   - Accept `due_date` in create/update
   - Add filter query param

3. **server/jobs/reminders.ts** (new)
   - Cron job runs hourly
   - Query tasks due in 24h
   - Send notifications

4. **src/components/TaskForm.tsx**
   - Add date picker input
   - Validation for due date

5. **src/components/TaskList.tsx**
   - Add overdue indicator
   - Add sort/filter controls

### Migration
```sql
ALTER TABLE tasks ADD COLUMN due_date TIMESTAMP NULL;
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;
```

---

## QA Plan

### Test Cases
1. Create task with due date - date persists correctly
2. Create task without due date - works as before
3. Update task due date - change reflected
4. Filter tasks by due date - correct results
5. Overdue task shows indicator - visual check

### Edge Cases
- Due date in the past (allow or reject?)
- Due date exactly 24h away
- Task completed before reminder sent
- Timezone edge cases (midnight)

### Acceptance Criteria
- [ ] Given a task form, when I select a due date, then it saves to the database
- [ ] Given a task due in 24h, when the job runs, then I receive a notification
- [ ] Given an overdue task, when I view the list, then it shows a red indicator
- [ ] Given multiple tasks, when I sort by due date, then they order correctly

---

## Security Review

### Checklist
- [x] Input validation - due date validated as ISO date
- [x] Auth/authz - existing task ownership enforced
- [x] No data exposure - due dates only visible to task owner
- [x] No injection vectors - parameterized queries via ORM
- [x] Rate limiting - existing API limits apply

### Risk Level
**Low** - No sensitive data, existing auth model

---

## Documentation Updates

### Files to Update
- `README.md` - Add due dates feature description
- `docs/api.md` - Document due_date parameter

### Usage Example
```typescript
// Create task with due date
const task = await api.createTask({
  title: "Submit report",
  dueDate: "2024-01-20T17:00:00Z"
});
```

---

## Final Checklist

- [x] Product scope approved
- [x] UX flow defined
- [x] Architecture decided
- [x] Implementation planned
- [x] Tests defined
- [x] Security reviewed
- [x] Docs identified

**Status: well-done - Ready for implementation**
