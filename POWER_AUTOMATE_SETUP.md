# Power Automate Cron Setup Guide

## Overview
This guide shows you how to set up Power Automate to trigger your Vestaboard updates every minute with precision and reliability.

## Why This Works Perfectly

### ✅ Simple & Reliable
- Power Automate runs every 1 minute (most frequent interval)
- Backend handles ALL timing logic (schedules, intervals, delays)
- No complex Power Automate logic needed

### ✅ Synchronized Boards
- Boards with the same workflow update **simultaneously**
- Workflow runs **once**, posts to **all assigned boards** at the same time
- No delays between boards

### ✅ Precise Timing
- Workflows respect their configured intervals (30min, 60min, etc.)
- Scheduler uses aligned clock times (e.g., 2:00, 2:30, 3:00)
- Boards only update when it's actually time

### ✅ Secure
- Uses secret token authentication
- No user credentials needed
- Simple query parameter or header

---

## Power Automate Setup (5 Minutes)

### Step 1: Create New Flow
1. Go to [Power Automate](https://make.powerautomate.com)
2. Click **"+ Create"** → **"Automated cloud flow"**
3. Name it: **"Vestaboard Scheduler"**
4. Skip trigger selection (we'll add it manually)

### Step 2: Add Recurrence Trigger
1. Click **"+ New step"**
2. Search for **"Recurrence"**
3. Select **"Schedule - Recurrence"**
4. Configure:
   - **Interval**: `1`
   - **Frequency**: `Minute`
5. Click **"Show advanced options"**
6. Set **Time zone** to your local timezone

### Step 3: Add HTTP Action
1. Click **"+ New step"**
2. Search for **"HTTP"**
3. Select **"HTTP - HTTP"**
4. Configure:
   - **Method**: `POST`
   - **URI**: `https://your-domain.com/api/cron/update?secret=YOUR_CRON_SECRET`
   - **Headers**: (leave empty)
   - **Body**: (leave empty)

### Step 4: Save & Test
1. Click **"Save"**
2. Click **"Test"** → **"Manually"** → **"Run flow"**
3. Check the run history - you should see a successful 200 response

---

## Environment Variables

Add this to your `.env` file:

```bash
# Cron Secret for Power Automate
CRON_SECRET=your-super-secret-token-here-change-this
```

**Generate a secure secret:**
```bash
# On Mac/Linux:
openssl rand -hex 32

# Or use any random string generator
```

---

## How It Works

### Every Minute:
```
Power Automate (1:00 PM)
    ↓
POST /api/cron/update?secret=xxx
    ↓
Backend Scheduler:
  1. ✅ Verify secret token
  2. ✅ Clean up expired screens
  3. ✅ Get all ACTIVE boards
  4. ✅ Group boards by workflow
  5. ✅ For each workflow:
     - Check if it's time to run (schedule + interval)
     - If yes:
       * Generate screens ONCE
       * Post to ALL boards SIMULTANEOUSLY
     - If no: skip until next interval
  6. ✅ Return success
```

### Example Timeline:
```
1:00 PM - Cron hits → Workflow checks interval → Not time yet → Skip
1:01 PM - Cron hits → Workflow checks interval → Not time yet → Skip
...
1:30 PM - Cron hits → Workflow checks interval → TIME! → Update all boards
1:31 PM - Cron hits → Workflow checks interval → Not time yet → Skip
...
2:00 PM - Cron hits → Workflow checks interval → TIME! → Update all boards
```

---

## Workflow Scheduling Logic

### Interval-Based (Most Common)
- **60-minute interval**: Updates at 1:00, 2:00, 3:00, etc.
- **30-minute interval**: Updates at 1:00, 1:30, 2:00, 2:30, etc.
- **15-minute interval**: Updates at 1:00, 1:15, 1:30, 1:45, etc.

### Time Window
- **Weekdays 08:00-17:00**: Only runs during business hours
- **24/7**: Always runs (if interval time is reached)
- **Custom days/times**: Respects your schedule

### Board Synchronization
```
Workflow: "OZ1 LOBBY"
Boards: Office Lobby, Brad's Board

When 2:00 PM hits:
  1. Generate screens once
  2. Post to Office Lobby ──┐
  3. Post to Brad's Board   ├─ SIMULTANEOUSLY
  
Both boards show the SAME screen at the SAME time!
```

---

## Testing

### Test the Cron Endpoint Manually:
```bash
# Development (uses default secret)
curl -X POST http://localhost:3001/api/cron/update?secret=dev-secret-change-in-production

# Production (use your CRON_SECRET)
curl -X POST https://your-domain.com/api/cron/update?secret=YOUR_CRON_SECRET
```

### Expected Response:
```json
{
  "success": true,
  "timestamp": "2025-12-03T19:30:00.000Z",
  "duration": "1234ms",
  "boardsProcessed": 2,
  "successCount": 2,
  "expiredScreensDeleted": 0,
  "workflowsUpdated": 0,
  "message": "Processed 2 boards in 1234ms"
}
```

---

## Monitoring

### Check Power Automate Run History:
1. Go to your flow
2. Click **"Run history"**
3. Each run shows:
   - ✅ Success (200 response)
   - ⏱️ Duration
   - 📊 Response data

### Check Backend Logs:
```
🕐 Cron job triggered at 2025-12-03T19:30:00.000Z
📋 Found 2 active board(s) (0 inactive)
🎯 Found 1 unique workflow(s) across 2 board(s)

📺 Processing workflow wf_xxx → 2 board(s)
🎯 Checking workflow for 2 board(s): Office Lobby, Brad's Board
✅ Interval trigger activated - running workflow for ALL 2 board(s)!
🎬 Generating screens for workflow: OZ1 LOBBY
📋 Workflow has 3 enabled step(s)
✅ Generated 3 screen(s) from workflow
📤 Posting to board: Office Lobby
📤 Posting to board: Brad's Board
✅ Cron job completed in 1234ms
```

---

## Troubleshooting

### ❌ "Invalid cron secret"
- Check your `CRON_SECRET` environment variable
- Make sure the secret in Power Automate URL matches

### ❌ "No boards processed"
- Check if boards are set to **Active** in Boards page
- Verify workflows are assigned to boards
- Check workflow schedules (might not be time to run yet)

### ❌ Boards not updating
- Check if current time is within workflow schedule
- Verify interval hasn't been reached yet
- Look at backend logs for details

### ❌ Boards out of sync
- This shouldn't happen! Boards with same workflow update together
- If it does, check backend logs for errors
- Restart the backend server

---

## Best Practices

### ✅ DO:
- Use a strong, random CRON_SECRET
- Set Power Automate to run every 1 minute
- Let the backend handle all timing logic
- Monitor run history occasionally

### ❌ DON'T:
- Don't add complex logic to Power Automate
- Don't change the 1-minute interval
- Don't expose your CRON_SECRET
- Don't manually trigger updates (use the UI instead)

---

## Advanced: Alternative Cron Services

If you don't want to use Power Automate, you can use:

### 1. **Vercel Cron** (if hosting on Vercel)
```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/update?secret=YOUR_SECRET",
    "schedule": "* * * * *"
  }]
}
```

### 2. **GitHub Actions**
```yaml
# .github/workflows/cron.yml
name: Vestaboard Scheduler
on:
  schedule:
    - cron: '* * * * *'  # Every minute
jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - run: curl -X POST https://your-domain.com/api/cron/update?secret=${{ secrets.CRON_SECRET }}
```

### 3. **EasyCron** (external service)
- URL: `https://your-domain.com/api/cron/update?secret=YOUR_SECRET`
- Interval: Every 1 minute

---

## Summary

**Power Automate Setup**: 5 minutes, set and forget
**Backend**: Handles all complexity automatically
**Result**: Precise, synchronized, reliable Vestaboard updates

🎯 **Your boards will update exactly when you want them to, with perfect synchronization!**
