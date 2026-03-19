# IME-AGENTS-replit.md — Replit Agent Rules

> **Replit Agent-specific rules.** Read `IME.md` for repo-wide context
> and `IME-AGENTS.md` for the shared multi-agent principles. This file defines
> Replit Agent's specific domain, workspace boundaries, and conventions.

---

## Role

Replit Agent is the **engineer / builder**. It owns all implementation
code, testing, deployment, and infrastructure for this project.

---

## Replit Agent's Domain

### What Replit Agent owns:

- All implementation code (TypeScript, JavaScript, CSS, HTML)
- Server logic (`server/` directory and all subdirectories)
- Client/dashboard UI (`client/` directory and all subdirectories)
- Configuration files (`package.json`, `tsconfig.json`, `vite.config.ts`,
  `tailwind.config.ts`, `postcss.config.js`, `components.json`, etc.)
- Build scripts (`script/` directory)
- Running the dev server, testing, debugging
- Deployment and infrastructure (Replit hosting, public URL)
- Package management and dependency updates
- Commit prefixes: `[feat]`, `[fix]`, `[chore]`

### What Replit Agent does NOT own:

- Plan documents (`IME-docs/plans/`) — shared workspace, see `IME-AGENTS.md`
- Decision log (`IME-docs/decisions/`) — shared workspace
- `IME.md` — spoke bootstrap and operating rules
- `IME-AGENTS.md` — shared agent index
- `README.md` — collaboratively maintained (both agents can update)

---

## Protected Directories

These directories are Replit Agent's workspace. Claude should not write
files into these directories without explicit coordination:

- `server/` — MCP server code
- `client/` — Dashboard UI
- `script/` — Build and utility scripts

**Why this matters:** Replit Agent actively works in these directories.
Uncoordinated writes from Claude could overwrite in-progress work,
break the build, or create merge conflicts. If Claude needs to
propose changes to files in these directories, the proposal goes in
a plan doc or issue body — not as a direct file commit.

**Exception:** If the user explicitly asks Claude to create a new file
in a protected directory (e.g., "Claude, create a new tool stub at
`server/tools/search_files.ts`"), Claude may do so after confirming
with the user, provided it reads the directory first to avoid conflicts.

---

## Handoff Protocol

### Claude → Replit Agent (spec to build):

1. Claude writes a plan doc in `IME-docs/plans/`
2. Claude creates an Issue referencing the plan
3. User tells Replit Agent to read the plan and issue
4. Replit Agent responds (via `-response` doc) or builds
5. If Replit Agent has concerns, it writes a response doc before building

### Replit Agent → Claude (build to review):

1. Replit Agent completes a build and pushes code
2. Replit Agent updates the Issue with status / completion notes
3. User tells Claude to review what was built
4. Claude reads the repo, checks against success criteria in the plan doc
5. Claude reports findings to the user (and optionally comments on the Issue)

---

## Post-Build Responsibilities

After completing a build that changes tools or architecture, Replit Agent
should:

1. Update `IME.md` tool tables (Available Tools section)
2. Update this file if the build affects workspace boundaries
3. Push code to GitHub (see rule below)
4. Comment on the relevant Issue with completion status
5. Close the Issue only after the push is confirmed

---

## Sync to GitHub

  GitHub is the source of truth. Work that isn't pushed doesn't exist
  from the perspective of the other agents in this system.

  ### Platform Constraints (Confirmed via Issue #23)

  The Replit main agent workspace has the following hard constraints:

  1. **No `origin` remote exists.** The only git remotes are
     `gitsafe-backup` (Replit internal backup) and `subrepl-*`
     (Replit workspace SSH). There is no remote pointing to GitHub.
  2. **`git push` cannot reach GitHub.** Even with an HTTPS URL,
     push operations time out silently. The platform blocks outbound
     git protocol traffic.
  3. **`git status`, `git add`, `git commit`** are blocked by a
     permanent `.git/index.lock` held by the Replit platform. The
     platform manages commits internally for its checkpoint system.
  4. **`git log`, `git remote -v`, `git diff`** work (read-only).
  5. **`gh` CLI is not installed.**
  6. **Local git history may diverge from GitHub.** When pushes go
     through the GitHub API (not `git push`), the local commit chain
     and GitHub's commit chain diverge. Local git state is unreliable
     as a reference for GitHub operations.

  **Bottom line:** The Git Data API is the **only reliable push mechanism.**
  Local git state is maintained by Replit's internal systems for backup
  purposes but is not a reliable reference for GitHub operations.

  ### The Git Data API Push Protocol (Confirmed Working)

  This sequence was tested and verified on Issue #23, commit `e25a2076`.

  ```
  PUSH SEQUENCE (atomic multi-file commit):

  1. GET  /repos/{owner}/{repo}/git/refs/heads/main
     → current HEAD SHA (fetch this IMMEDIATELY before pushing)

  2. GET  /repos/{owner}/{repo}/git/commits/{headSha}
     → base tree SHA

  3. POST /repos/{owner}/{repo}/git/trees
     body: { base_tree: baseTreeSha, tree: [{ path, mode: "100644", type: "blob", content }] }
     → new tree SHA

  4. POST /repos/{owner}/{repo}/git/commits
     body: { message, tree: newTreeSha, parents: [headSha] }
     → new commit SHA

  5. PATCH /repos/{owner}/{repo}/git/refs/heads/main
     body: { sha: newCommitSha }
     → updated ref (trust this response as confirmation)

  6. VERIFY: The PATCH response returns the new SHA. If doing a
     separate GET to verify, add a 3-second delay (GitHub API
     eventual consistency).
  ```

  For single-file writes, the Contents API is also reliable:
  ```
  SINGLE FILE WRITE:

  1. GET  /repos/{owner}/{repo}/contents/{path}?ref=main
     → current content + SHA (the SHA is required for updates)

  2. PUT  /repos/{owner}/{repo}/contents/{path}
     body: { message, content: base64(newContent), sha: currentSha }
     → new commit SHA
  ```

  ### Session Start Checklist

  Before starting any work:

  1. Fetch GitHub HEAD: `GET /git/refs/heads/main` → note the SHA
  2. Compare to local HEAD: `git log -1` → note the SHA
  3. If SHAs differ: the histories have diverged (expected). Do not
     attempt `git pull` or `git merge`. Accept that local git state
     is decorative.
  4. For any file you plan to edit that could also be edited by Claude,
     read it from GitHub via Contents API and compare against the local
     version before proceeding.

  ### Shared File Conflict Check

  Before writing to any file that both agents edit:

  - `IME.md` (tool table between `<!-- TOOLS:START -->` and `<!-- TOOLS:END -->`)
  - `README.md`
  - Any file outside Replit Agent's protected directories

  **Procedure:**
  1. Read the current version from GitHub via Contents API
  2. Compare against the local version
  3. If they differ: **STOP** and report the divergence to the user
  4. If they match: proceed with the write

  ### The Never-Do List

  1. **Never `git push origin main`** — `origin` doesn't exist and
     cannot be configured to reach GitHub from this platform
  2. **Never assume a Replit commit reached GitHub** — local commits
     only reach `gitsafe-backup` (Replit internal), never GitHub
  3. **Never build a Git Data API commit on a stale SHA** — always
     fetch the current HEAD immediately before constructing the
     tree/commit. Claude may have pushed in between.
  4. **Never declare "pushed to GitHub" without verifying** — check the
     `PATCH /git/refs` response SHA or do a delayed `GET` to confirm
  5. **Never `git push --force`** — rewrites history, can destroy
     Claude's commits
  6. **Never `git pull` or `git merge`** — no valid GitHub remote
     exists, and local history has diverged from GitHub
  7. **Never close an issue without confirming the push landed** on
     GitHub with a commit SHA in the issue comment
  8. **Never reference local git state (HEAD SHA, commit history) as
     the basis for any GitHub API operation** — always read current
     state from the GitHub API

  ### Post-Push Reporting

  After every push:
  1. Comment on the relevant Issue with the commit SHA
  2. Confirm the commit message and files changed
  3. Only close the issue after the push is confirmed on GitHub

  ### Issue Comment Attribution

  Both agents post to GitHub Issues as `ioTus` (same PAT). To
  distinguish authorship:

  - **Replit Agent comments** must start with:
    `**[Replit Agent — Engineer]:**`
  - **Claude comments** start with:
    `**[Claude — PM/Strategist]:**`

  This is mandatory for all issue comments. Without attribution,
  there is no way to tell which agent wrote what.

  ### History

  - Issue #19: First git sync incident — attempted `git pull` via API,
    made divergence worse. Motivated the original protocol.
  - Issue #23: Full capabilities audit, root cause identified (no
    `origin` remote), Git Data API path tested and confirmed. This
    protocol is the result.

  ## Commit Conventions

| Prefix | Use for |
|--------|---------|
| `[feat]` | New features, new tools |
| `[fix]` | Bug fixes |
| `[chore]` | Cleanup, dependency updates, refactoring |
| `[docs]` | Documentation updates (shared with Claude) |

Include the plan doc reference when applicable:
`[feat] 002-mcp-v2-build-spec.md — implement multi-repo mode`

---

*Last updated: 2026-03-19 (Git sync protocol rewrite — Issue #23)*

*This file is maintained by Replit Agent with user approval. Updated when
Replit Agent's domain, workspace boundaries, or conventions change.
See git history for full change log.*
