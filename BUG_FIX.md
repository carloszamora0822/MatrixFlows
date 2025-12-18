# MatrixFlow Multi-Board Workflow Synchronization - Critical Bug Analysis & Fixes

## Executive Summary

The MatrixFlow system has **critical synchronization bugs** when multiple boards share the same workflow. The root cause is **incomplete state initialization** and **race conditions** during board assignment changes.

---

## System Architecture Overview

### Data Model
```
Vestaboard (Board): boardId, defaultWorkflowId → Workflow
Workflow: workflowId (no board refs)
BoardState: boardId (1:1), nextScheduledTrigger, workflowRunning
```

### Execution Flow
```
Cron (60s) → processAllBoards() → Group by workflowId
→ checkAndRunWorkflowForBoards(boards[])
→ Use PRIMARY BOARD state for timing
→ Post to ALL boards simultaneously
→ Update ALL states with SAME nextScheduledTrigger
```

---

## 🔴 CRITICAL BUG #1: Incomplete State Sync on Board Assignment

**Location:** `backend/api/boards/index.js:116-139`

**Problem:** When assigning a board to a workflow with existing boards, only the new board gets a state. Other boards aren't synchronized.

**Fix:**
```javascript
// backend/api/boards/index.js:116-139
if (oldBoard && oldBoard.defaultWorkflowId !== updated.defaultWorkflowId) {
  const BoardState = require('../../models/BoardState');
  const Vestaboard = require('../../models/Vestaboard');
  const moment = require('moment-timezone');
  
  await BoardState.findOneAndDelete({
    boardId: id,
    orgId: ORG_CONFIG.ID
  });
  
  if (updated.defaultWorkflowId) {
    // ✅ Find ALL boards sharing this workflow
    const allBoardsWithWorkflow = await Vestaboard.find({
      orgId: ORG_CONFIG.ID,
      defaultWorkflowId: updated.defaultWorkflowId,
      isActive: true
    });
    
    const immediateNextTrigger = moment().tz('America/Chicago').toDate();
    
    // ✅ Update ALL boards to have SAME nextScheduledTrigger
    for (const board of allBoardsWithWorkflow) {
      await BoardState.findOneAndUpdate(
        { orgId: ORG_CONFIG.ID, boardId: board.boardId },
        {
          nextScheduledTrigger: immediateNextTrigger,
          currentStepIndex: 0,
          workflowRunning: false
        },
        { upsert: true }
      );
    }
    
    console.log(`🔄 Synchronized ${allBoardsWithWorkflow.length} boards`);
  }
}
```

---

## 🔴 CRITICAL BUG #2: Conditional State Init in Scheduler

**Location:** `backend/lib/schedulerService.js:187-251`

**Problem:** State initialization for non-primary boards ONLY happens if primary board has no state.

**Fix:** Move state checking OUTSIDE the `if (!primaryBoardState)` block:

```javascript
// schedulerService.js:187-251
let primaryBoardState = await BoardState.findOne({
  orgId: ORG_CONFIG.ID,
  boardId: primaryBoard.boardId
});

// Calculate initial trigger
const nowCentral = moment().tz(TIMEZONE);
// ... timing logic ...

// Create primary if missing
if (!primaryBoardState) {
  primaryBoardState = new BoardState({
    orgId: ORG_CONFIG.ID,
    boardId: primaryBoard.boardId,
    currentStepIndex: 0,
    nextScheduledTrigger: initialNextTrigger
  });
  await primaryBoardState.save();
}

// ✅ ALWAYS check ALL other boards (moved outside if block)
const otherBoards = boards.filter(b => b.boardId !== primaryBoard.boardId);
const syncedNextTrigger = primaryBoardState.nextScheduledTrigger || initialNextTrigger;

await Promise.all(otherBoards.map(async (board) => {
  let boardState = await BoardState.findOne({
    orgId: ORG_CONFIG.ID,
    boardId: board.boardId
  });
  
  if (!boardState) {
    boardState = new BoardState({
      orgId: ORG_CONFIG.ID,
      boardId: board.boardId,
      currentStepIndex: 0,
      nextScheduledTrigger: syncedNextTrigger
    });
    await boardState.save();
  } else if (boardState.nextScheduledTrigger?.getTime() !== syncedNextTrigger.getTime()) {
    // ✅ Sync desynchronized states
    boardState.nextScheduledTrigger = syncedNextTrigger;
    await boardState.save();
  }
}));
```

---

## 🔴 CRITICAL BUG #3: Frontend Sequential Triggers

**Location:** `frontend/src/pages/Workflows.js:208-231`

**Problem:** Frontend loops through boards sequentially, causing different execution times and desync.

**Solution:** Create new multi-board trigger endpoint.

### Backend: New Endpoint
```javascript
// backend/api/workflows/trigger-multi.js (NEW FILE)
const { connectDB } = require('../../lib/db');
const { requireAuth, requireEditor } = require('../../lib/auth');
const schedulerService = require('../../lib/schedulerService');
const Vestaboard = require('../../models/Vestaboard');
const { ERROR_CODES, ORG_CONFIG } = require('../../../shared/constants');

module.exports = async (req, res) => {
  try {
    await connectDB();
    await new Promise((resolve, reject) => {
      requireEditor(req, res, (err) => err ? reject(err) : resolve());
    });

    const { workflowId } = req.query;
    if (!workflowId) {
      return res.status(400).json({
        error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'Workflow ID required' }
      });
    }

    const boards = await Vestaboard.find({
      orgId: ORG_CONFIG.ID,
      defaultWorkflowId: workflowId,
      isActive: true
    });

    if (boards.length === 0) {
      return res.status(404).json({
        error: { code: ERROR_CODES.NOT_FOUND, message: 'No active boards' }
      });
    }

    console.log(`🚀 Multi-board trigger: ${boards.length} boards`);
    
    // ✅ Use same method as cron
    const results = await schedulerService.checkAndRunWorkflowForBoards(boards);

    return res.status(200).json({
      success: true,
      message: `Triggered ${boards.length} boards simultaneously`,
      results
    });
  } catch (error) {
    console.error('❌ Multi-board trigger error:', error);
    return res.status(500).json({
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: error.message }
    });
  }
};
```

### Register Route
```javascript
// backend/api/index.js
const triggerMulti = require('./workflows/trigger-multi');

// Add route
if (pathname === '/api/workflows/trigger-multi') {
  return triggerMulti(req, res);
}
```

### Frontend Update
```javascript
// frontend/src/pages/Workflows.js:190-235
if (triggerNow) {
  const boardsUsingWorkflow = latestBoards.filter(b => b.defaultWorkflowId === workflowId);
  
  if (boardsUsingWorkflow.length > 0) {
    // ✅ Use multi-board endpoint
    const triggerRes = await fetch(`/api/workflows/trigger-multi?workflowId=${workflowId}`, {
      method: 'POST',
      credentials: 'include'
    });
    
    if (triggerRes.ok) {
      successMessage += `\n\n🚀 Triggered ${boardsUsingWorkflow.length} boards simultaneously!`;
    }
  }
}
```

---

## 🟡 BUG #4: Workflow Update Sync

**Location:** `backend/api/workflows/index.js:202-217`

**Fix:** Calculate trigger time once and apply to all boards:

```javascript
const immediateNextTrigger = moment().tz('America/Chicago').toDate();

await Promise.all(assignedBoards.map(async (board) => {
  await BoardState.findOneAndUpdate(
    { orgId: ORG_CONFIG.ID, boardId: board.boardId },
    {
      workflowRunning: false,
      nextScheduledTrigger: immediateNextTrigger,
      currentStepIndex: 0
    },
    { upsert: true }
  );
}));
```

---

## 🟡 BUG #5: UI Desync Warning

**Location:** `frontend/src/pages/Workflows.js`

**Add:** Desynchronization detection and warning:

```javascript
// Check sync status
const boardsWithWorkflow = boards.filter(b => 
  b.isActive && b.defaultWorkflowId === workflow.workflowId
);
const triggerTimes = boardsWithWorkflow.map(b => {
  const state = boardStates[b.boardId];
  return state?.nextScheduledTrigger ? new Date(state.nextScheduledTrigger).getTime() : null;
}).filter(t => t !== null);

const isDesynchronized = triggerTimes.length > 1 && 
  !triggerTimes.every(t => t === triggerTimes[0]);

// In JSX
{isDesynchronized && (
  <div className="p-2 bg-red-50 border border-red-300 rounded text-xs">
    ⚠️ Boards out of sync!
    <button onClick={() => handleResyncWorkflow(workflow.workflowId)}>
      Fix Now
    </button>
  </div>
)}
```

---

## 📋 Implementation Checklist

### Phase 1: Critical (DO FIRST)
- [ ] Fix #1: Update `backend/api/boards/index.js`
- [ ] Fix #2: Update `backend/lib/schedulerService.js`
- [ ] Fix #3: Create `backend/api/workflows/trigger-multi.js`
- [ ] Fix #3: Register route in `backend/api/index.js`
- [ ] Fix #3: Update `frontend/src/pages/Workflows.js`

### Phase 2: Medium Priority
- [ ] Fix #4: Update `backend/api/workflows/index.js`
- [ ] Fix #5: Add desync warning to frontend

---

## 🧪 Test Scenarios

**Test 1: New Board Assignment**
- Setup: Board A, B use workflow_123
- Action: Assign Board C to workflow_123
- Expected: All 3 boards have same nextScheduledTrigger

**Test 2: Manual Trigger**
- Setup: Board A, B use workflow_123
- Action: Click "Trigger Now"
- Expected: Both start/finish simultaneously with same nextScheduledTrigger

**Test 3: Workflow Update**
- Setup: Board A, B use workflow_123
- Action: Update workflow settings
- Expected: Both reset to immediate trigger

---

## Root Cause

All bugs stem from **incomplete state synchronization** when board-workflow relationships change. The system treats boards individually instead of as synchronized groups.

**Solution:** Always update ALL boards sharing a workflow atomically.
