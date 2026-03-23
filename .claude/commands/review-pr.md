---
description: Dispatch specialized subagent swarm for deep review with cross-review, verification, and ranked voting
---

# Swarm Review

Target: $ARGUMENTS

## Your Task

Deploy a specialized swarm of reviewers to independently review the target, cross-pollinate findings, verify critical issues, then aggregate via ranked choice voting. ULTRATHINK throughout.

## Modes

Parse the first argument for mode flags:

| Flag         | Mode     | Agents                               | Features                                       | Time Target |
| ------------ | -------- | ------------------------------------ | ---------------------------------------------- | ----------- |
| `--quick`    | Quick    | 6 specialists (2 per top 3 domains)  | No cross-review, no verification               | ~60s        |
| (default)    | Deep     | 9 specialists (3 per top 3 domains)  | Full cross-review + verification               | ~3-5min     |
| `--thorough` | Thorough | 12 specialists (4 per top 3 domains) | Multiple verification rounds, sleeper analysis | ~8-10min    |

Strip the mode flag from arguments before processing the target.

**Key Design**: Instead of spreading thin across all domains, the Coordinator first identifies the **3 most relevant domains** for the content being reviewed, then deploys multiple specialists per domain for statistical consensus.

---

## Step 1: Gather Context & Detect Type

First, understand what needs to be reviewed and its type:

| Input                   | How to gather                       | Content type                       |
| ----------------------- | ----------------------------------- | ---------------------------------- |
| (no argument)           | `git diff HEAD` (staged + unstaged) | Auto-detect from files             |
| PR number (e.g. `#123`) | `gh pr diff 123`                    | Auto-detect from files             |
| File/directory path     | Read the files                      | Auto-detect from extension/content |
| `staged`                | `git diff --staged`                 | Auto-detect from files             |
| `recent`                | `git diff HEAD~1`                   | Auto-detect from files             |
| Plan/RFC (pasted text)  | Use the provided text               | Plan                               |

**Default (no argument):** Review all current changes (staged + unstaged) via `git diff HEAD`.

---

## Step 2: Inject Codebase Context

Before deploying reviewers, gather architectural context specific to this project:

1. **Read project instructions**: Check `CLAUDE.md` in repo root for:
   - Error handling patterns (`errorHandler` vs direct console usage)
   - Import conventions (no barrel exports, direct imports only)
   - Naming conventions (platform-agnostic names for shared code)
   - Recommended libraries (Zustand, Zod, es-toolkit, etc.)

2. **Find relevant patterns**: Look at existing code in affected directories for:
   - React 19 patterns and hooks usage
   - Zustand store patterns
   - Zod schema definitions
   - Tailwind v4 styling conventions

3. **Pull recent history**: `git log --oneline -5 -- <affected_files>` to see recent changes

4. **Identify platform context**: Note if changes affect:
   - Excel-specific code (`/src/surfaces/excel/`)
   - Google Sheets-specific code (`/src/surfaces/sheets/`)
   - Shared code (`/src/surfaces/sheet/` - platform-agnostic)

Compile this into a `CODEBASE_CONTEXT` block to inject into each reviewer's prompt.

---

## Subagent Rules (Apply to ALL agents)

**CRITICAL FOR ALL SUBAGENTS (Coordinator, Specialists, Verifiers):**

1. **DO NOT create any files** - Return all findings in your response only
2. **DO NOT write to disk** - All output must be in-conversation
3. **DO NOT use Write, Edit, or file creation tools** - Response text only
4. Keep responses focused and structured per the output format specified

---

## Step 3: Coordinator Domain Selection (FIRST)

**IMPORTANT**: Run Coordinator BEFORE deploying specialists to select relevant domains.

```
You are the COORDINATOR for this swarm review. Your FIRST job is domain selection.

IMPORTANT: Do NOT create any files. Return your analysis in this response only.

CONTENT TO REVIEW:
{summary of files/changes - file types, directories touched, size}

AVAILABLE SPECIALIST DOMAINS:

| Domain       | Icon | Best For                                                    |
|--------------|------|-------------------------------------------------------------|
| Security     | 🛡️   | Auth, APIs, user input, data handling, secrets, OAuth       |
| Performance  | ⚡   | React components, queries, algorithms, bundle size          |
| Architecture | 🏗️   | New modules, refactors, API design, patterns, imports       |
| Correctness  | 🎯   | Logic changes, state management, async code, error handling |
| Testing      | 🧪   | Test files, untested code, Vitest patterns                  |
| UX/A11y      | ♿   | UI components, forms, user-facing changes                   |
| Platform     | 📊   | Excel/Sheets APIs, add-in manifests, cross-platform compat  |

YOUR TASK:
Analyze the content and select the **TOP 3 most relevant domains** for this review.

Consider:
- File types (.tsx = likely UX/Perf, .test.ts = Testing, api/ = Security)
- Directory (surfaces/excel/ or surfaces/sheets/ = Platform, surfaces/sheet/ = Architecture)
- Change nature (new feature vs refactor vs bug fix)
- Risk profile (auth changes = Security, state changes = Correctness)

OUTPUT FORMAT:
```json
{
  "selected_domains": ["Security", "Performance", "Correctness"],
  "reasoning": "API endpoint changes with user input (Security), React component updates (Performance), complex conditional logic (Correctness)",
  "excluded_domains": ["Testing", "UX/A11y", "Architecture", "Platform"],
  "exclusion_reasoning": "No test files modified, no UI components, not a structural refactor, no platform-specific code"
}
```
```

---

## Step 4: Deploy Specialized Reviewer Squad (Parallel)

Based on Coordinator's domain selection, deploy specialists. Use a **single message with multiple Task tool calls**.

### Specialist Pool

| Domain       | Icon | Focus Areas                                                            |
| ------------ | ---- | ---------------------------------------------------------------------- |
| Security     | 🛡️   | OWASP top 10, auth bypass, injection, XSS, data exposure, secrets, OAuth |
| Performance  | ⚡   | Rerenders, memoization, N+1 queries, bundle size, memory leaks, O(n²)  |
| Architecture | 🏗️   | Patterns, coupling, maintainability, abstraction levels, imports       |
| Correctness  | 🎯   | Logic errors, edge cases, race conditions, null handling, error handler |
| Testing      | 🧪   | Missing tests, edge case coverage, flakiness, Vitest patterns          |
| UX/A11y      | ♿   | ARIA, keyboard nav, loading/error/empty states, focus management       |
| Platform     | 📊   | Excel/Sheets API usage, manifest config, cross-platform compatibility  |

### Deployment by Mode

| Mode     | Per Domain | Total | Example                                    |
|----------|------------|-------|--------------------------------------------|
| Quick    | 2          | 6     | Security ×2, Performance ×2, Correctness ×2 |
| Deep     | 3          | 9     | Security ×3, Performance ×3, Correctness ×3 |
| Thorough | 4          | 12    | Security ×4, Performance ×4, Correctness ×4 |

**Why 3+ per domain**: With 3 specialists in the same domain, you get real consensus signal. If 2/3 Security specialists flag an issue, that's meaningful. If 1/2 flag it, that's a coin flip.

### Specialist Prompt Template

```
You are the {ROLE} (Reviewer #{N}) for this swarm review. ULTRATHINK.

IMPORTANT: Do NOT create any files. Return all findings in this response only.

YOUR SPECIALTY: {FOCUS_AREAS}
You are the EXPERT in this domain. Go deeper than a generalist would.

TARGET TO REVIEW:
{the content}

CONTENT TYPE: {auto-detected type}

CODEBASE CONTEXT:
{injected context from Step 2}

## Your Domain-Specific Checklist

{ROLE-SPECIFIC CHECKLIST - see below}

## Cross-Cutting Concerns (Always Check)

- Edge cases and failure modes in your domain
- Implicit assumptions that could break
- Future maintainability burden
- "What breaks when this scales 10x?"

## Output Format

For each issue found:

- **Title**: concise name
- **Category**: your specialty area
- **Severity**: 🔴 Critical | 🟠 High | 🟡 Medium | 🔵 Low
- **Confidence**: 🔒 Certain | 🔍 Likely | ❓ Uncertain (flag for verification)
- **Location**: `file:line` (if applicable)
- **Description**: what's wrong and why it matters
- **Suggestion**: how to fix or improve
- **Sleeper Risk**: Could this become worse over time? (Yes/No + why)

Report your **TOP 10 CONCERNS** ranked by severity × confidence.

Also note 1-2 **STRENGTHS** you observed in your domain.
```

### Role-Specific Checklists

**🛡️ Security Specialist:**

- Injection vulnerabilities (SQL, command, XSS, template)
- Authentication/authorization bypass vectors
- Sensitive data exposure (logs, errors, responses)
- CSRF, CORS misconfigurations
- Hardcoded secrets, API keys, credentials
- Insecure dependencies or imports
- Input validation gaps
- OAuth flow vulnerabilities

**⚡ Performance Specialist:**

- React: unnecessary rerenders, missing memoization, unstable references
- React 19: proper use of new features (use, Actions, etc.)
- Zustand: selector patterns, avoiding full-store subscriptions
- JavaScript: O(n²) or worse algorithms, blocking operations
- Bundle: large imports, missing code splitting, unused dependencies
- Memory: leaks, unbounded caches, closure captures
- Network: waterfall requests, missing caching, over-fetching

**🏗️ Architecture Reviewer:**

- Coupling between modules/packages
- Abstraction level appropriateness
- Violation of existing patterns in codebase
- **Barrel exports (prohibited)** - should use direct imports
- **Import path conventions** - use `@/` alias, not deep relative paths
- Technical debt introduction
- API design and contracts
- Error boundary and recovery design
- Future extensibility blocked

**🎯 Correctness Reviewer:**

- Logic errors and edge cases
- Race conditions and timing issues
- Null/undefined handling
- Off-by-one errors
- State machine inconsistencies
- Async/await pitfalls
- Type narrowing gaps
- **Direct console.log/error usage** - should use `errorHandler`
- Zod schema validation gaps

**🧪 Test Coverage Reviewer:**

- Missing unit tests for new code
- Edge cases not covered
- Integration test gaps
- Flaky test patterns
- Test isolation issues
- Mock/stub appropriateness
- Assertion quality
- **Vitest patterns** - proper use of describe/it/expect
- **Path aliases** - use `@/` in test imports

**♿ UX/Accessibility Reviewer:**

- ARIA labels and roles
- Keyboard navigation
- Focus management
- Screen reader compatibility
- Loading/error/empty state handling
- Color contrast
- Touch target sizes
- Phosphor Icons usage (correct import pattern)

**📊 Platform Compatibility Reviewer:**

- Excel API usage patterns and limitations
- Google Sheets API usage patterns and limitations
- Cross-platform abstraction layer correctness
- Add-in manifest configuration
- Platform-specific vs shared code separation
- **Platform-agnostic naming** in shared code (use "sheet" not "Excel")
- Office.js and Apps Script compatibility

---

## Step 5: Wait for All Specialists to Complete

**CRITICAL**: Wait for ALL specialist agents to finish before proceeding. Do NOT continue until every specialist has returned their findings.

This avoids the race condition where synthesis starts before specialists finish.

### Timeout and Error Handling

| Mode     | Per-Specialist Timeout | Total Timeout | Min Completion |
|----------|------------------------|---------------|----------------|
| Quick    | 60s                    | 2min          | 4/6 (67%)      |
| Deep     | 90s                    | 5min          | 7/9 (78%)      |
| Thorough | 120s                   | 10min         | 9/12 (75%)     |

**On timeout or error:**
1. Log which specialist(s) failed in audit trail
2. If ≥ minimum completion threshold: proceed with partial results, note gaps
3. If < minimum threshold: abort with "Insufficient specialist coverage" error
4. Include warning in final output: "⚠️ {N} specialists timed out - coverage incomplete for {domains}"

**Graceful degradation**: Partial results are better than no results. If 8/9 specialists complete, proceed and flag the gap.

---

## Step 6: Coordinator Synthesis (Deep/Thorough modes only)

**AFTER** all specialists complete, run Coordinator synthesis:

```
You are the COORDINATOR. All specialists have completed. Now synthesize findings.

IMPORTANT: Do NOT create any files. Return your synthesis in this response only.

SPECIALIST REPORTS:
{all specialist findings}

YOUR TASKS:

1. Compile all issues (expect ~10 per specialist × 9 specialists = ~90 issues)
2. Deduplicate similar concerns using these criteria:
   - Same file AND within 10 lines AND same category = DUPLICATE
   - Merge duplicates: keep highest severity, note "Raised by: #1, #4, #7"
3. Calculate INTRA-DOMAIN CONSENSUS:
   - 3/3 specialists in domain flagged = "Strong consensus" [3/3]
   - 2/3 specialists in domain flagged = "Consensus" [2/3]
   - 1/3 specialists in domain flagged = "Single finding" [1/3]
4. Identify CONFLICTS (same issue, different severity across domains)
5. Flag issues marked ❓ Uncertain for verification
6. Identify BLIND SPOTS (areas no specialist covered)

OUTPUT: Deduplicated issue list with consensus tags ready for cross-review.
```

### Deduplication Algorithm (Explicit)

Two issues are duplicates if ALL of:
- Same file path
- Line numbers within 10 of each other
- Same category (Security, Performance, etc.)

When merging:
- **Severity**: Take the HIGHEST
- **Confidence**: Take the LOWEST (most conservative)
- **Attribution**: List all specialists who found it
- **Description**: Concatenate unique points

---

## Step 7: Cross-Review Round

Deploy the **same specialists again** with each other's findings. Each specialist reviews findings OUTSIDE their domain:

```
You are {ROLE} (Reviewer #{N}) in the CROSS-REVIEW round.

Here are findings from OTHER specialists (not your domain):
{list of issues from specialists in OTHER domains}

Your task:

1. Review issues outside your expertise with fresh eyes
2. Flag any that seem OVER-rated (lower severity than claimed)
3. Flag any that seem UNDER-rated (higher severity than claimed)
4. Note issues you hadn't considered that change your perspective
5. Provide YOUR RANKED TOP 10 from these OTHER specialists' findings

For each ranking, explain your reasoning as a non-expert in that domain.

This surfaces underrated issues through diverse perspectives.
```

---

## Step 7.5: Compute Preliminary Ranking (Deep/Thorough modes)

**BEFORE verification**, compute preliminary scores using Phases 1-2 only:

```
For each specialist's Top 10 (initial):
  points[issue] += (11 - rank)

For each specialist's cross-review Top 10:
  points[issue] += (11 - rank)

Sort issues by points descending → preliminary_ranking
```

This preliminary ranking determines which issues get verified in Step 8.

---

## Step 8: Verification Round (Deep/Thorough modes)

**Verification targets** (from Step 7.5 preliminary ranking):
1. Top 5 issues from preliminary ranking
2. Plus any ❓ Uncertain issues in Top 15 (max 8 total verifications)

Deploy specialists from a DIFFERENT DOMAIN to verify:

```
You are a VERIFIER from {DIFFERENT_DOMAIN}. Your job is to CHALLENGE this finding.

FINDING TO VERIFY:
{issue details}
Original Domain: {domain} (you are NOT from this domain)
Severity Claimed: {severity}
Confidence: {confidence}

Your task:

1. Try to DISPROVE or find counterarguments
2. Check if the issue is actually exploitable/impactful
3. Verify the suggested fix is correct
4. Assess: Is the severity accurate?

Verdict options:
✅ VERIFIED - Issue is real and severity is accurate
⚠️ DOWNGRADE - Issue exists but severity should be lower because...
❌ DISMISSED - Issue is not actually a problem because...
🔼 UPGRADE - Issue is worse than claimed because...

Provide your verdict with reasoning.
```

**Verification bounds** (to prevent explosion):
- Quick mode: 0 verifications
- Deep mode: Max 8 (Top 5 + up to 3 uncertain)
- Thorough mode: Max 12 (Top 8 + up to 4 uncertain)

---

## Step 9: Ranked Choice Voting

### Voting Formula (Explicit)

**Phase 1: Initial Votes**
```
For each specialist's Top 10:
  points[issue] += (11 - rank) // #1 gets 10 pts, #2 gets 9, ..., #10 gets 1
```

**Phase 2: Cross-Review Votes**
```
For each specialist's cross-review Top 10:
  points[issue] += (11 - rank)
```

**Phase 3: Verification Adjustments**
```
For each verified issue:
  if verdict == VERIFIED:  points[issue] *= 1.2   # +20%
  if verdict == DOWNGRADE: points[issue] *= 0.7   # -30%
  if verdict == DISMISSED: points[issue] = 0      # removed entirely
  if verdict == UPGRADE:   points[issue] *= 1.3   # +30%
```

**Phase 4: Intra-Domain Consensus Bonus**
```
For issues flagged by multiple specialists in SAME domain:
  if consensus == [3/3]: points[issue] *= 1.3  # Strong signal
  if consensus == [2/3]: points[issue] *= 1.1  # Moderate signal
```

**Phase 5: Managerial Vote (your vote)**
```
Review final list, cast your Top 10 with 2x weight (not 3x - avoid override)
For your Top 10:
  points[issue] += (11 - rank) * 2
```

**Tie-Breaking Rules:**

1. Higher intra-domain consensus wins
2. Higher severity wins
3. Lower confidence (more conservative) wins
4. Alphabetical by title

---

## Step 10: Present Results

### 🏆 Top 10 Issues (Consensus Ranking)

```
#1 [🔴 CRITICAL] [✅ Verified] Issue Title
   🛡️ Found by: Security Specialist
   📍 file.ts:123
   📝 Description of the problem and its impact
   ✅ Suggested fix
   🗳️ X points (raised by Y/10 reviewers)
   💤 Sleeper Risk: Yes - will worsen as user count grows
```

### 🔀 Contested Findings

Issues where specialists disagreed significantly:

```
⚖️ "Memory leak in useEffect cleanup"
   - ⚡ Performance Specialist: 🔴 Critical (cleanup never runs)
   - 🎯 Correctness Reviewer: 🟡 Medium (only affects unmount)
   - 🏗️ Architecture: 🟠 High (pattern used in 12 other places)
   → Resolution: Rated 🟠 High - pattern propagation is main concern
```

### 🃏 Wildcards (Notable Outsiders)

Issues outside top 10 that deserve attention:

- **High potential but low confidence**: Worth investigating further
- **Unconventional perspectives**: One specialist saw something others missed
- **Sleeper issues**: Low impact now, high impact in 6 months
- **Cross-domain concerns**: Touched multiple specialties

For each: explain why it's interesting despite not ranking higher.

### 💤 Sleeper Issues

Issues flagged as "will get worse over time":

```
⏰ "Hardcoded pagination limit of 100"
   Current impact: 🔵 Low (no users hit limit yet)
   Future impact: 🟠 High (will break at scale)
   When: ~6 months at current growth rate
```

### 💪 Strengths Observed

What the code does well (aggregated from specialist reports):

- 🛡️ Security: "Proper input sanitization throughout"
- ⚡ Performance: "Good use of React.memo on list items"
- 🏗️ Architecture: "Clean separation of concerns"

### 📊 Review Summary

| Metric              | Value                         |
| ------------------- | ----------------------------- |
| Total issues found  | X                             |
| After deduplication | Y                             |
| Verified critical   | Z                             |
| Consensus level     | High/Medium/Low               |
| Top concern areas   | Security (X), Performance (Y) |
| Blind spots         | {areas with less coverage}    |

### 📋 Audit Trail

<details>
<summary>Swarm Execution Details</summary>

| Reviewer | Role         | Issues Found | Top Issue   | Time |
| -------- | ------------ | ------------ | ----------- | ---- |
| #1       | 🛡️ Security  | 8            | Auth bypass | 45s  |
| #2       | 🛡️ Security  | 6            | XSS vector  | 52s  |
| ...      | ...          | ...          | ...         | ...  |

**Cross-review consensus**: X% agreement on top 5
**Verification results**: 4/5 verified, 1 downgraded
**Mode**: Deep
**Model distribution**: sonnet (specialists), haiku (coordinator)

</details>

---

## Usage Examples

```bash
# Quick review of current changes (fastest)
/swarm-review --quick

# Deep review of current changes (default, recommended)
/swarm-review

# Thorough review for complex PR
/swarm-review --thorough #456

# Review specific file
/swarm-review src/surfaces/sheet/utils.ts

# Review only staged changes before commit
/swarm-review staged

# Review last commit
/swarm-review recent

# Review a plan/RFC (paste after command)
/swarm-review --thorough
[paste your RFC here]
```

---

## Mode Comparison

| Feature           | Quick                 | Deep                  | Thorough                        |
| ----------------- | --------------------- | --------------------- | ------------------------------- |
| Domain selection  | Top 3 domains         | Top 3 domains         | Top 3 domains                   |
| Per domain        | 2 specialists         | 3 specialists         | 4 specialists                   |
| Total specialists | 6                     | 9                     | 12                              |
| Coordinator       | Domain selection only | Selection + Synthesis | Selection + Synthesis           |
| Cross-review      | No                    | Yes                   | Yes                             |
| Verification      | No                    | Max 8 issues          | Max 12 issues                   |
| Consensus signal  | Weak (2 per domain)   | Strong (3 per domain) | Very strong (4 per domain)      |
| Time target       | ~60s                  | ~3-5min               | ~8-10min                        |
| Best for          | Small fixes, typos    | Most PRs              | Architecture, security-critical |

**Why this design**: With 3 specialists per domain, a 2/3 or 3/3 consensus is statistically meaningful. With only 1-2 per domain, "consensus" is just coincidence.
