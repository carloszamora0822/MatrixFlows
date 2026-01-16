# Cascade ↔ Claude CLI Integration Guide

## Overview
This document standardizes how Windsurf Cascade should interact with the Claude Code CLI agent for collaborative development work, ensuring clear communication and context preservation.

---

## Prerequisites

### Installation
Claude CLI should be installed at `~/.local/bin/claude`:
```bash
curl -fsSL https://claude.ai/install.sh | bash
export PATH="$HOME/.local/bin:$PATH"
```

### Verification
```bash
which claude  # Should return: /Users/[username]/.local/bin/claude
claude --version
```

---

## Communication Protocol

### 1. Starting Claude CLI Session

**DO:**
```bash
# Start Claude CLI in non-blocking mode
claude
```

**DON'T:**
- Try to pipe prompts directly (e.g., `echo "prompt" | claude`)
- Use blocking mode for interactive sessions
- Assume you can programmatically send input to the interactive CLI

### 2. Current Limitation: Interactive CLI Input

**IMPORTANT:** As of this implementation, Cascade **cannot** programmatically send text input to an already-running interactive Claude CLI session.

**Why:** The `claude` CLI is an interactive terminal application that requires:
- Manual keyboard input from the user
- TTY (terminal) interaction
- Cannot receive stdin piped input after startup

**Workaround Options:**

#### Option A: Manual User Interaction (RECOMMENDED)
1. Cascade starts `claude` CLI in background
2. User manually types prompts into the Claude CLI terminal
3. Cascade monitors terminal output using `read_terminal`
4. Cascade validates Claude's responses and provides feedback

#### Option B: Direct Command Execution (ALTERNATIVE)
1. Cascade runs verification commands directly
2. Cascade reports findings to user
3. User can optionally use Claude CLI manually for complex tasks

#### Option C: File-Based Communication (FUTURE)
1. Cascade writes prompts to a file (e.g., `claude_prompt.txt`)
2. User copies prompt from file to Claude CLI
3. Claude CLI outputs to another file
4. Cascade reads output file

---

## Monitoring Claude CLI Output

### Reading Terminal Output
```javascript
// Check terminal output every few seconds
read_terminal({
  ProcessID: "209",  // The command ID from run_command
  Name: "claude"
})
```

### Checking Command Status
```javascript
command_status({
  CommandId: "209",
  OutputCharacterCount: 5000,
  WaitDurationSeconds: 3
})
```

---

## Standard Workflow Pattern

### Phase 1: Task Assignment
```markdown
**Cascade's Role:**
1. Analyze user request
2. Break down into specific tasks
3. Prepare clear, actionable prompts for Claude CLI
4. Document expected outcomes

**Output Format:**
- Task description
- Specific commands to run
- Expected results
- Validation criteria
```

### Phase 2: Execution (Manual User Input Required)
```markdown
**User's Role:**
1. Open Claude CLI terminal
2. Copy/paste Cascade's prepared prompt
3. Let Claude CLI execute tasks

**Cascade's Role:**
1. Monitor terminal output via read_terminal
2. Wait for completion indicators
3. Parse results
```

### Phase 3: Validation
```markdown
**Cascade's Role:**
1. Read Claude CLI output from terminal
2. Verify against expected outcomes
3. Check for errors/warnings
4. Provide feedback to user
5. Suggest next steps or corrections
```

---

## Example: Verification Task

### Cascade Prepares Prompt
```markdown
**For User to Input into Claude CLI:**

You just completed refactoring Workflows.js from 1431 to 382 lines.

**Verification Tasks:**
1. Run: cd frontend && npm run build
   - Check for compilation errors
   - Report any warnings

2. Run: find src -name "*.js" -exec wc -l {} \; | sort -rn | head -10
   - Identify largest remaining files
   - Suggest refactoring candidates

3. Run: npm run lint
   - Check for linting issues
   - Report any violations

4. Functional test:
   - Start dev server
   - Navigate to /workflows
   - Verify page loads without errors
   - Check browser console

**Report Format:**
- ✅ or ❌ for each task
- Error messages if any
- File sizes for large files
- Recommendations
```

### User Copies to Claude CLI
User manually pastes the above prompt into the Claude CLI terminal.

### Cascade Monitors
```javascript
// Poll every 5 seconds
setInterval(() => {
  read_terminal({ ProcessID: "209", Name: "claude" })
}, 5000)
```

### Cascade Validates
```markdown
**Cascade checks for:**
- "npm run build" success/failure
- Error messages
- File size outputs
- Completion indicators

**Cascade reports:**
- Summary of findings
- Issues that need attention
- Confirmation of success
- Next recommended actions
```

---

## Best Practices

### For Cascade

1. **Clear Task Definitions**
   - One task at a time
   - Specific commands with full paths
   - Expected output format
   - Success/failure criteria

2. **Context Preservation**
   - Reference previous work
   - Maintain task history
   - Link related changes
   - Document decisions

3. **Validation Protocol**
   - Always verify outputs
   - Check for errors
   - Confirm expected behavior
   - Report discrepancies

4. **Communication Style**
   - Direct, actionable prompts
   - No ambiguity
   - Include examples
   - Specify formats

### For Claude CLI Agent

1. **Response Format**
   - Start with task acknowledgment
   - Show command being run
   - Display full output
   - End with status (✅/❌)

2. **Error Handling**
   - Report errors immediately
   - Include full error messages
   - Suggest fixes
   - Ask for clarification if needed

3. **Progress Updates**
   - Report before each command
   - Show intermediate results
   - Indicate completion
   - Summarize findings

---

## Troubleshooting

### Claude CLI Not Responding
```bash
# Check if process is running
ps aux | grep claude

# Check terminal output
read_terminal({ ProcessID: "209", Name: "claude" })

# If hung, restart
kill [PID]
claude
```

### No Terminal Output
**Possible causes:**
- CLI waiting for input (expected behavior)
- Process crashed
- Output buffering

**Solutions:**
- User should manually input prompt
- Check process status
- Restart if necessary

### Context Loss
**Prevention:**
- Keep this document open
- Reference previous messages
- Maintain task log
- Document all changes

---

## Integration Checklist

Before starting Cascade ↔ Claude CLI collaboration:

- [ ] Claude CLI installed and in PATH
- [ ] User understands manual input requirement
- [ ] Cascade has clear task breakdown
- [ ] Validation criteria defined
- [ ] Terminal monitoring set up
- [ ] Context preservation plan in place

---

## Future Improvements

### Potential Enhancements
1. **Automated Input:** Explore `expect` or similar tools for programmatic CLI interaction
2. **File-Based Queue:** Implement prompt/response file system
3. **WebSocket Bridge:** Create real-time communication channel
4. **Shared Context Store:** Centralized state management
5. **Task Orchestration:** Automated workflow management

### Research Needed
- Claude CLI API/programmatic interface
- Alternative CLI tools with better automation
- IPC (Inter-Process Communication) methods
- Terminal multiplexer integration (tmux/screen)

---

## Summary

**Current State:**
- Cascade can START Claude CLI
- Cascade can MONITOR Claude CLI output
- Cascade CANNOT send input to Claude CLI
- User MUST manually input prompts

**Recommended Workflow:**
1. Cascade prepares detailed prompts
2. User pastes into Claude CLI
3. Cascade monitors and validates
4. Cascade provides feedback and next steps

**Key Principle:**
Cascade acts as **project manager and validator**, while Claude CLI acts as **executor**. User acts as **communication bridge** until programmatic input is solved.

---

## Version History
- v1.0 (2026-01-16): Initial documentation based on MatrixFlow refactoring session
