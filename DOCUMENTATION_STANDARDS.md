# Documentation Standards & Auto-Entry System

## Overview
This document defines a standardized, no-code approach to ensure every developer (human or AI) must read and understand service/component documentation before making changes. This creates a "documentation gateway" that enforces knowledge transfer.

---

## Core Concept: Documentation Gateway Pattern

### Principle
**Every file has a companion `.README.md` that must be read before editing.**

### Structure
```
/backend/lib/
  ├── schedulerService.js
  ├── schedulerService.README.md          ← Gateway documentation
  ├── timeUtils.js
  ├── timeUtils.README.md                 ← Gateway documentation
  └── workflowService.js
      └── workflowService.README.md       ← Gateway documentation

/frontend/src/components/
  ├── WorkflowEditor.js
  ├── WorkflowEditor.README.md            ← Gateway documentation
  └── workflows/
      ├── WorkflowCard.js
      └── WorkflowCard.README.md          ← Gateway documentation
```

---

## Standard Documentation Template

### File Naming Convention
```
[FileName].README.md
```

**Examples:**
- `schedulerService.js` → `schedulerService.README.md`
- `WorkflowEditor.js` → `WorkflowEditor.README.md`
- `timeUtils.js` → `timeUtils.README.md`

### Template Structure

```markdown
# [Component/Service Name]

> **⚠️ REQUIRED READING:** You must read and understand this document before modifying `[FileName]`

---

## 📋 Metadata

| Property | Value |
|----------|-------|
| **File Path** | `/absolute/path/to/file.js` |
| **Type** | Service / Component / Utility / Model / API |
| **Last Changed** | 2026-01-16 |
| **Last Changed By** | [Name/AI Agent] |
| **Lines of Code** | ~500 |
| **Complexity** | Low / Medium / High / Critical |
| **Test Coverage** | 85% |
| **Status** | ✅ Stable / 🚧 In Progress / ⚠️ Needs Refactor / 🔴 Deprecated |

---

## 🎯 Purpose

### What This Does
[1-2 sentence description of primary purpose]

### What This Does NOT Do
[Common misconceptions or out-of-scope functionality]

### Why It Exists
[Business/technical reason for this component]

---

## 🏗️ Architecture

### Position in System
```
[ASCII diagram showing where this fits]

Example:
Cron Job → schedulerService → workflowService → Vestaboard API
              ↓
           timeUtils
              ↓
          BoardState DB
```

### Data Flow
```
Input: [What comes in]
  ↓
Processing: [What happens]
  ↓
Output: [What goes out]
```

---

## 🔗 Dependencies

### Direct Dependencies
| Dependency | Purpose | Critical? |
|------------|---------|-----------|
| `moment-timezone` | Timezone handling | ✅ Yes |
| `./timeUtils` | Centralized time operations | ✅ Yes |
| `../models/BoardState` | State persistence | ✅ Yes |

### Dependents (What Uses This)
| File | How It's Used |
|------|---------------|
| `/api/cron/update.js` | Calls `processAllBoards()` |
| `/api/workflows/trigger.js` | Calls `checkAndRunWorkflow()` |

### Environment Variables
| Variable | Required? | Purpose |
|----------|-----------|---------|
| `VESTABOARD_API_KEY` | ✅ Yes | API authentication |
| `CRON_SECRET` | ✅ Yes | Cron endpoint security |
| `MONGODB_URI` | ✅ Yes | Database connection |

---

## 🔑 Key Concepts

### Core Logic
1. **[Concept 1]**: [Explanation]
2. **[Concept 2]**: [Explanation]
3. **[Concept 3]**: [Explanation]

### Critical Algorithms
```javascript
// Example: Next trigger calculation
nextTriggerMinutes = Math.ceil((currentMinutes + 1) / intervalMinutes) * intervalMinutes
```

### Important Constants
```javascript
const TIMEZONE = 'America/Chicago';
const MIN_DISPLAY_SECONDS = 15;
const RATE_LIMIT_SECONDS = 15;
```

---

## 📊 State Management

### State Variables
| Variable | Type | Purpose | Persistence |
|----------|------|---------|-------------|
| `nextScheduledTrigger` | Date | Next run time | MongoDB |
| `workflowRunning` | Boolean | Execution status | MongoDB |
| `currentStepIndex` | Number | Current position | MongoDB |

### State Transitions
```
IDLE → RUNNING → COMPLETED → IDLE
  ↓       ↓          ↓
ERROR ← ERROR ← ERROR
```

---

## 🚨 Critical Sections

### ⚠️ DO NOT MODIFY WITHOUT UNDERSTANDING

#### Section 1: [Name]
**Location:** Lines [X-Y]
**Why Critical:** [Explanation]
**Last Bug:** [Date] - [Description]
**Tests:** `[test file name]` lines [X-Y]

#### Section 2: [Name]
**Location:** Lines [X-Y]
**Why Critical:** [Explanation]
**Last Bug:** [Date] - [Description]
**Tests:** `[test file name]` lines [X-Y]

---

## 🐛 Known Issues & Gotchas

### Active Issues
1. **[Issue Name]**
   - **Impact:** [Description]
   - **Workaround:** [Solution]
   - **Tracked:** [Issue #123 / TODO]

### Historical Bugs (Fixed)
1. **Midnight Rollover Bug** (Fixed: 2026-01-15)
   - **Problem:** Calculations failed at day boundaries
   - **Solution:** Implemented `timeUtils.calculateNextTrigger()`
   - **Tests:** `timeUtils.test.js` lines 50-70

### Common Mistakes
- ❌ **Don't:** Use `new Date()` directly
  - ✅ **Do:** Use `timeUtils.now()` for Central Time
- ❌ **Don't:** Hardcode display seconds
  - ✅ **Do:** Respect `screen.displaySeconds` setting

---

## 🧪 Testing

### Test Files
| Test File | Coverage | Purpose |
|-----------|----------|---------|
| `schedulerService.test.js` | 85% | Core scheduling logic |
| `timeUtils.test.js` | 95% | Time calculations |

### How to Test
```bash
# Run all tests
npm test

# Run specific test
npm test -- schedulerService.test.js

# Run with coverage
npm test -- --coverage
```

### Manual Testing Checklist
- [ ] Test midnight rollover (23:59 → 00:00)
- [ ] Test day-of-week restrictions
- [ ] Test window boundaries
- [ ] Test multi-board synchronization

---

## 📝 Usage Examples

### Example 1: Basic Usage
```javascript
// Description of what this does
const result = await schedulerService.processAllBoards();
```

### Example 2: Advanced Usage
```javascript
// Description of advanced scenario
const workflow = await Workflow.findById(workflowId);
await schedulerService.checkAndRunWorkflowForBoards(boards);
```

### Example 3: Edge Case
```javascript
// How to handle special situation
if (timeUtils.isInWindow(startTime, endTime, daysOfWeek)) {
  // ...
}
```

---

## 🔄 Change Protocol

### Before Making Changes

1. **Read this entire document** ✅
2. **Understand dependencies** ✅
3. **Check test coverage** ✅
4. **Review critical sections** ✅
5. **Plan your changes** ✅

### While Making Changes

1. **Update tests first** (TDD approach)
2. **Make minimal changes**
3. **Preserve existing behavior** unless explicitly changing it
4. **Add comments** for complex logic
5. **Update this README** if behavior changes

### After Making Changes

1. **Run all tests** ✅
2. **Update metadata** (Last Changed, Lines of Code)
3. **Document new gotchas** if any
4. **Update dependencies** if changed
5. **Commit with clear message**

### Update Checklist
```markdown
- [ ] Tests pass
- [ ] Documentation updated
- [ ] Metadata updated
- [ ] Dependencies reviewed
- [ ] No new warnings
- [ ] Backward compatible (or migration plan exists)
```

---

## 🔍 Debugging Guide

### Common Errors

#### Error: "Workflow not running at expected time"
**Cause:** Timezone mismatch or window calculation error
**Solution:** Check `timeUtils.isInWindow()` logic
**Debug:** Add logging to `checkAndRunWorkflowForBoards()`

#### Error: "Board state out of sync"
**Cause:** Primary board pattern not followed
**Solution:** Ensure all boards use `boards[0]` state
**Debug:** Check `nextScheduledTrigger` values in DB

### Debug Commands
```bash
# Check board states
node scripts/diagnosticBoardState.js

# View logs
tail -f logs/scheduler.log

# Test specific workflow
curl -X POST http://localhost:5001/api/workflows/:id/trigger
```

---

## 📚 Related Documentation

### Internal Docs
- [SCHEDULING_SYSTEM_FIXES.md](./SCHEDULING_SYSTEM_FIXES.md) - Recent fixes
- [WORKFLOW_TIMING_FIXES.md](./WORKFLOW_TIMING_FIXES.md) - Timing issues
- [timeUtils.README.md](./backend/lib/timeUtils.README.md) - Time utility docs

### External Resources
- [Moment.js Timezone Docs](https://momentjs.com/timezone/)
- [Vestaboard API Docs](https://docs.vestaboard.com/)
- [MongoDB Mongoose Docs](https://mongoosejs.com/)

---

## 📞 Contact & Ownership

### Primary Owner
**Name:** [Team/Person]
**Contact:** [Email/Slack]

### Subject Matter Experts
- **Scheduling Logic:** [Name]
- **Timezone Handling:** [Name]
- **Database Queries:** [Name]

### Last Major Refactor
**Date:** 2026-01-15
**By:** Cascade AI + Claude Code CLI
**Reason:** Fix timezone inconsistencies and midnight rollover bugs
**PR/Commit:** [Link]

---

## 🎓 Onboarding Checklist

New to this file? Complete this checklist:

- [ ] Read entire README
- [ ] Understand purpose and architecture
- [ ] Review dependencies
- [ ] Read critical sections
- [ ] Run tests locally
- [ ] Try usage examples
- [ ] Review recent changes (git log)
- [ ] Ask questions if anything unclear

**Estimated Time:** 20-30 minutes

---

## 📈 Metrics & Health

### Performance
- **Avg Execution Time:** [X ms]
- **P95 Execution Time:** [Y ms]
- **Error Rate:** [Z%]

### Maintenance
- **Last Bug:** [Date]
- **Open Issues:** [Count]
- **Tech Debt Score:** [Low/Medium/High]

### Usage
- **Calls per Day:** [~X]
- **Peak Usage:** [Time period]

---

## 🚀 Future Improvements

### Planned Enhancements
1. **[Enhancement 1]** - [Description] - [Priority: High/Med/Low]
2. **[Enhancement 2]** - [Description] - [Priority: High/Med/Low]

### Technical Debt
1. **[Debt Item 1]** - [Why it exists] - [Impact]
2. **[Debt Item 2]** - [Why it exists] - [Impact]

### Refactoring Candidates
- [ ] Extract [X] into separate utility
- [ ] Simplify [Y] logic
- [ ] Add caching for [Z]

---

## ✅ Certification

**I have read and understood this documentation.**

- **Date:** [YYYY-MM-DD]
- **Name/Agent:** [Your name or AI agent identifier]
- **Changes Made:** [Brief description or "None - just reviewing"]

---

*Last Updated: 2026-01-16 by Cascade AI*
*Document Version: 1.0*
```

---

## Implementation Strategy

### Phase 1: Create Template Generator Script

Create `/scripts/generate-readme.js`:

```javascript
const fs = require('fs');
const path = require('path');

/**
 * Generate README.md for a given file
 * @param {string} filePath - Path to the source file
 */
function generateReadme(filePath) {
  const fileName = path.basename(filePath);
  const readmePath = filePath.replace(path.extname(filePath), '.README.md');
  
  // Check if README already exists
  if (fs.existsSync(readmePath)) {
    console.log(`⚠️  README already exists: ${readmePath}`);
    return;
  }
  
  // Get file stats
  const stats = fs.statSync(filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const lineCount = content.split('\n').length;
  
  // Detect file type
  const fileType = detectFileType(filePath);
  
  // Generate README from template
  const readme = generateReadmeContent({
    fileName,
    filePath,
    fileType,
    lineCount,
    lastModified: stats.mtime.toISOString().split('T')[0]
  });
  
  // Write README
  fs.writeFileSync(readmePath, readme);
  console.log(`✅ Generated: ${readmePath}`);
}

function detectFileType(filePath) {
  if (filePath.includes('/models/')) return 'Model';
  if (filePath.includes('/api/')) return 'API';
  if (filePath.includes('/lib/') && filePath.includes('Service')) return 'Service';
  if (filePath.includes('/lib/')) return 'Utility';
  if (filePath.includes('/components/')) return 'Component';
  if (filePath.includes('/pages/')) return 'Page';
  return 'Module';
}

function generateReadmeContent(data) {
  return `# ${data.fileName.replace(/\.(js|jsx|ts|tsx)$/, '')}

> **⚠️ REQUIRED READING:** You must read and understand this document before modifying \`${data.fileName}\`

---

## 📋 Metadata

| Property | Value |
|----------|-------|
| **File Path** | \`${data.filePath}\` |
| **Type** | ${data.fileType} |
| **Last Changed** | ${data.lastModified} |
| **Last Changed By** | [TODO: Add name] |
| **Lines of Code** | ~${data.lineCount} |
| **Complexity** | [TODO: Low / Medium / High / Critical] |
| **Test Coverage** | [TODO: Add %] |
| **Status** | 🚧 Documentation In Progress |

---

## 🎯 Purpose

### What This Does
[TODO: Add 1-2 sentence description]

### What This Does NOT Do
[TODO: Add common misconceptions]

### Why It Exists
[TODO: Add business/technical reason]

---

## 🏗️ Architecture

### Position in System
\`\`\`
[TODO: Add ASCII diagram]
\`\`\`

### Data Flow
\`\`\`
Input: [TODO]
  ↓
Processing: [TODO]
  ↓
Output: [TODO]
\`\`\`

---

## 🔗 Dependencies

### Direct Dependencies
| Dependency | Purpose | Critical? |
|------------|---------|-----------|
| [TODO] | [TODO] | [TODO] |

### Dependents (What Uses This)
| File | How It's Used |
|------|---------------|
| [TODO] | [TODO] |

---

## 🔑 Key Concepts

[TODO: Add core logic explanation]

---

## 🚨 Critical Sections

### ⚠️ DO NOT MODIFY WITHOUT UNDERSTANDING

[TODO: Identify critical code sections]

---

## 🐛 Known Issues & Gotchas

[TODO: Document known issues]

---

## 🧪 Testing

### Test Files
| Test File | Coverage | Purpose |
|-----------|----------|---------|
| [TODO] | [TODO] | [TODO] |

---

## 📝 Usage Examples

\`\`\`javascript
// TODO: Add usage examples
\`\`\`

---

## 🔄 Change Protocol

### Before Making Changes
1. **Read this entire document** ✅
2. **Understand dependencies** ✅
3. **Check test coverage** ✅
4. **Review critical sections** ✅
5. **Plan your changes** ✅

---

## ✅ Certification

**I have read and understood this documentation.**

- **Date:** [YYYY-MM-DD]
- **Name/Agent:** [Your name]
- **Changes Made:** [Description]

---

*Last Updated: ${data.lastModified}*
*Document Version: 1.0 (Auto-generated - needs completion)*
`;
}

// CLI Usage
if (require.main === module) {
  const targetFile = process.argv[2];
  
  if (!targetFile) {
    console.log('Usage: node generate-readme.js <file-path>');
    console.log('Example: node generate-readme.js backend/lib/schedulerService.js');
    process.exit(1);
  }
  
  if (!fs.existsSync(targetFile)) {
    console.error(`❌ File not found: ${targetFile}`);
    process.exit(1);
  }
  
  generateReadme(targetFile);
}

module.exports = { generateReadme };
```

### Phase 2: Bulk Generation Script

Create `/scripts/generate-all-readmes.js`:

```javascript
const fs = require('fs');
const path = require('path');
const { generateReadme } = require('./generate-readme');

const DIRECTORIES_TO_DOCUMENT = [
  'backend/lib',
  'backend/models',
  'backend/api',
  'frontend/src/components',
  'frontend/src/pages',
  'frontend/src/hooks'
];

const FILE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];

function findFilesToDocument(dir) {
  const files = [];
  
  function walk(directory) {
    const items = fs.readdirSync(directory);
    
    for (const item of items) {
      const fullPath = path.join(directory, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (FILE_EXTENSIONS.includes(path.extname(item))) {
        // Skip test files
        if (!item.includes('.test.') && !item.includes('.spec.')) {
          files.push(fullPath);
        }
      }
    }
  }
  
  walk(dir);
  return files;
}

function generateAllReadmes() {
  console.log('🚀 Starting README generation...\n');
  
  let totalGenerated = 0;
  let totalSkipped = 0;
  
  for (const dir of DIRECTORIES_TO_DOCUMENT) {
    if (!fs.existsSync(dir)) {
      console.log(`⚠️  Directory not found: ${dir}`);
      continue;
    }
    
    console.log(`📁 Processing: ${dir}`);
    const files = findFilesToDocument(dir);
    
    for (const file of files) {
      const readmePath = file.replace(path.extname(file), '.README.md');
      
      if (fs.existsSync(readmePath)) {
        totalSkipped++;
      } else {
        generateReadme(file);
        totalGenerated++;
      }
    }
    
    console.log('');
  }
  
  console.log('✅ README generation complete!');
  console.log(`   Generated: ${totalGenerated}`);
  console.log(`   Skipped (already exist): ${totalSkipped}`);
}

// Run
generateAllReadmes();
```

### Phase 3: Git Pre-Commit Hook

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash

# Check if README exists for modified files
echo "🔍 Checking for README documentation..."

# Get list of staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(js|jsx|ts|tsx)$')

MISSING_READMES=()

for FILE in $STAGED_FILES; do
  # Skip test files
  if [[ $FILE == *".test."* ]] || [[ $FILE == *".spec."* ]]; then
    continue
  fi
  
  # Check if README exists
  README="${FILE%.*}.README.md"
  
  if [ ! -f "$README" ]; then
    MISSING_READMES+=("$FILE")
  fi
done

if [ ${#MISSING_READMES[@]} -gt 0 ]; then
  echo "❌ Missing README files for:"
  for FILE in "${MISSING_READMES[@]}"; do
    echo "   - $FILE"
  done
  echo ""
  echo "Generate READMEs with:"
  echo "   node scripts/generate-readme.js <file-path>"
  echo ""
  echo "Or skip this check with:"
  echo "   git commit --no-verify"
  exit 1
fi

echo "✅ All files have documentation"
exit 0
```

### Phase 4: IDE Integration (VS Code)

Create `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Generate README for Current File",
      "type": "shell",
      "command": "node",
      "args": [
        "scripts/generate-readme.js",
        "${file}"
      ],
      "presentation": {
        "reveal": "always",
        "panel": "new"
      },
      "problemMatcher": []
    },
    {
      "label": "Open README for Current File",
      "type": "shell",
      "command": "code",
      "args": [
        "${fileDirname}/${fileBasenameNoExtension}.README.md"
      ],
      "presentation": {
        "reveal": "never"
      },
      "problemMatcher": []
    }
  ]
}
```

### Phase 5: Cascade Integration

Create `.cascade/rules.md`:

```markdown
# Cascade Rules for Documentation Gateway

## Before Editing Any File

1. **Check for README:**
   ```bash
   # If editing: /backend/lib/schedulerService.js
   # First read: /backend/lib/schedulerService.README.md
   ```

2. **Read Entire README:**
   - Use `read_file` tool
   - Pay attention to Critical Sections
   - Review Known Issues & Gotchas
   - Check Dependencies

3. **Verify Understanding:**
   - Can you explain the purpose?
   - Do you understand the data flow?
   - Are you aware of critical sections?
   - Do you know what tests exist?

## After Making Changes

1. **Update README Metadata:**
   - Last Changed date
   - Last Changed By
   - Lines of Code
   - Add any new gotchas

2. **Update Relevant Sections:**
   - Dependencies (if changed)
   - Usage Examples (if API changed)
   - Known Issues (if bug found)
   - Critical Sections (if added)

3. **Update Certification:**
   - Add your entry to certification section
   - Document what you changed

## If README Doesn't Exist

1. **Generate it:**
   ```bash
   node scripts/generate-readme.js <file-path>
   ```

2. **Fill in TODOs:**
   - Complete all [TODO] sections
   - Add meaningful content
   - Don't leave template placeholders

3. **Commit README with changes:**
   ```bash
   git add <file> <file.README.md>
   git commit -m "feat: add feature X with documentation"
   ```
```

---

## Enforcement Mechanisms

### 1. Git Hooks (Automatic)
- Pre-commit: Blocks commits without READMEs
- Pre-push: Validates README completeness

### 2. CI/CD Pipeline
```yaml
# .github/workflows/documentation-check.yml
name: Documentation Check

on: [pull_request]

jobs:
  check-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Check READMEs exist
        run: node scripts/validate-readmes.js
      - name: Check README completeness
        run: node scripts/check-readme-todos.js
```

### 3. Code Review Checklist
```markdown
## PR Review Checklist

- [ ] All modified files have READMEs
- [ ] READMEs are updated with changes
- [ ] No [TODO] placeholders in READMEs
- [ ] Certification section updated
- [ ] Dependencies documented
- [ ] Tests mentioned in README
```

### 4. Cascade Memory
```markdown
Create a memory that says:
"ALWAYS read [filename].README.md before editing [filename]. 
This is a mandatory documentation gateway."
```

---

## Benefits

### For Human Developers
- ✅ Faster onboarding
- ✅ Reduced bugs from misunderstanding
- ✅ Clear ownership and contacts
- ✅ Historical context preserved

### For AI Agents
- ✅ Required context before changes
- ✅ Understanding of critical sections
- ✅ Awareness of dependencies
- ✅ Knowledge of gotchas and edge cases

### For Teams
- ✅ Consistent documentation format
- ✅ Living documentation (updated with code)
- ✅ Knowledge transfer built-in
- ✅ Reduced technical debt

---

## Rollout Plan

### Week 1: Setup
- [ ] Create template and scripts
- [ ] Add to package.json scripts
- [ ] Document in main README

### Week 2: Core Services
- [ ] Generate READMEs for all `/backend/lib` files
- [ ] Fill in critical sections
- [ ] Add to git hooks

### Week 3: Models & APIs
- [ ] Generate READMEs for models
- [ ] Generate READMEs for API routes
- [ ] Enable pre-commit hook

### Week 4: Frontend
- [ ] Generate READMEs for components
- [ ] Generate READMEs for pages
- [ ] Full enforcement enabled

---

## Maintenance

### Monthly Review
- Check for outdated READMEs
- Update metrics
- Review and close completed TODOs

### Quarterly Audit
- Verify all files have READMEs
- Check README quality
- Update template if needed

---

## Success Metrics

### Coverage
- **Target:** 100% of non-test files have READMEs
- **Current:** [X%]

### Quality
- **Target:** <5% of READMEs have [TODO] placeholders
- **Current:** [X%]

### Usage
- **Target:** README read before 90% of file edits
- **Current:** [X%] (tracked via git hooks)

---

*This document itself follows the standards it defines.*
*Last Updated: 2026-01-16*
*Version: 1.0*
