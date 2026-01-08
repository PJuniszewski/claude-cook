# Cooking Result

## Dish
Add SSE streaming for real-time updates

## Status
well-done

## Cooking Mode
well-done

---

## Ownership
- Decision Owner: @lead-engineer
- Reviewers: @frontend-team, @backend-team
- Approved by: Product on 2026-01-07

## Product Decision
Approved
- Reason: Aligns with Q1 roadmap for real-time features. User feedback indicates polling-based updates feel sluggish.

## Scope

### In Scope
- SSE client implementation in `src/api/streaming.ts`
- React hook for consuming streams (`useStream`)
- Connection management (reconnect, heartbeat)
- Event parsing and type safety

### Out of Scope
- WebSocket fallback (separate initiative)
- Binary data streaming
- Bi-directional communication

### Non-goals
- Replacing existing REST endpoints
- Real-time collaboration features (future)

## Assumptions
- Server already supports SSE endpoints
- Browser compatibility is not a concern (modern browsers only)

### Validation Plan
- Verify SSE endpoint exists: `GET /api/stream/events`
- Check browser support matrix in analytics

## UX Notes
- Flow: User sees updates appear without page refresh
- Entry points: Dashboard widgets, notification panel
- Considerations:
  - Show connection status indicator
  - Graceful degradation if connection drops
- Error states: Toast notification on connection failure

## Pre-mortem (3 scenarios)
1. Connection drops silently -> mitigation: Heartbeat every 30s, auto-reconnect with exponential backoff
2. Memory leak from unclosed streams -> mitigation: Cleanup on component unmount, connection pooling
3. Server overload from many connections -> mitigation: Connection limit per user, server-side throttling

## Trade-offs
- Sacrificing: Simplicity (adds connection management complexity)
- Reason: Real-time UX is worth the added complexity
- Rejected alternatives:
  - WebSockets - rejected because SSE is simpler for unidirectional data and sufficient for our use case
  - Long polling - rejected because higher latency and server load

## Implementation Plan

### Files to Modify
1. `src/api/streaming.ts` - New SSE client class
2. `src/hooks/useStream.ts` - React hook wrapper
3. `src/components/Dashboard.tsx` - Integrate streaming
4. `src/types/events.ts` - Event type definitions

### Commit Sequence
1. feat(api): add SSE client with reconnection logic
2. feat(hooks): add useStream hook for React components
3. feat(dashboard): integrate real-time updates
4. test(streaming): add unit and integration tests

### High-risk Areas
- Connection state management
- Memory cleanup on unmount

## QA Plan

### Test Cases
1. Happy path: Events received and rendered correctly
2. Reconnection: Client reconnects after connection drop
3. Cleanup: No memory leaks after component unmount
4. Error handling: Connection errors show user feedback

### Edge Cases
- Rapid mount/unmount cycles
- Multiple streams to same endpoint
- Network offline/online transitions

### Regression Checks
- Existing dashboard functionality unchanged
- No impact on initial page load time

## Security Review
- Reviewed: yes
- Issues found: none
- Risk level: low

### Checklist
- [x] Input validation - Events validated against schema
- [x] Auth/authz verified - SSE endpoint requires auth token
- [x] No data exposure - Only user's own data streamed
- [x] No injection vectors - Event data is read-only

## Blast Radius & Rollout
- Affected users/modules: Dashboard users, notification panel
- Feature flag: yes (name: `enable_sse_streaming`)
- Rollout strategy: gradual (10% -> 50% -> 100%)

### Rollback Steps
1. Disable feature flag `enable_sse_streaming`
2. Clear any cached connection state
3. Monitor error rates return to baseline

## Open Questions
- None remaining

## Next Actions
- [ ] Implement SSE client
- [ ] Add useStream hook
- [ ] Integrate with Dashboard
- [ ] Write tests
- [ ] Deploy behind feature flag

## Decision Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-07 | Use SSE over WebSockets | Simpler for unidirectional data |
| 2026-01-07 | Add feature flag | Enable gradual rollout |
| 2026-01-07 | 30s heartbeat interval | Balance between responsiveness and overhead |
