# claude-github-mcp

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A production-ready MCP (Model Context Protocol) bridge server that connects **Claude Chat** (claude.ai) to **any GitHub repository**. Claude can read files, write code, search code, batch-commit changes, and manage Issues directly from a conversation — all through a custom MCP connector using Streamable HTTP transport with OAuth 2.0 authentication.

**V2: Multi-repo mode** — no hardcoded repo. Claude passes `owner` and `repo` on every tool call. Lock Claude to a specific repo using a Claude Project system prompt (see [Project Scoping](#project-scoping) below).

## Architecture

```
  Claude Chat (claude.ai)
    ↕ MCP connector (Streamable HTTP + OAuth 2.0)
  MCP Bridge Server (your host) — multi-repo mode
    ↕ GitHub REST API (Octokit)
  Any GitHub Repo (files + Issues)
```

The server exposes a single `/mcp` endpoint that speaks the MCP protocol over Streamable HTTP. Claude.ai connects to this endpoint using OAuth 2.0 Client Credentials, discovers the available tools, and calls them as needed during your conversation. In V2, the server is repo-agnostic — Claude specifies the target `owner/repo` on every tool call.

## Prerequisites

- A **GitHub account** with a repository you want Claude to manage
- A **Claude Pro, Max, or Team plan** (custom MCP connectors require a paid plan)
- A hosting platform that can run a Node.js server (Replit, Railway, Render, VPS, etc.)

## Setup Instructions

### 1. Fork or clone this repo

```bash
git clone https://github.com/ioTus/claude-github-mcp.git
cd claude-github-mcp
npm install
```

### 2. Create a GitHub Personal Access Token (PAT)

1. Go to **GitHub → Settings → Developer Settings → Personal Access Tokens → Tokens (classic)**
2. Click **Generate new token (classic)**
3. Give it a descriptive name (e.g. `claude-mcp-bridge`)
4. Select the **`repo`** scope (this covers file read/write, Issues, and repository metadata)
5. Click **Generate token** and copy the value — you won't see it again

### 3. Generate OAuth credentials

These credentials protect your MCP endpoint using industry-standard OAuth 2.0:

```bash
# Generate a random Client ID and Client Secret
OAUTH_CLIENT_ID=$(openssl rand -hex 16)
OAUTH_CLIENT_SECRET=$(openssl rand -hex 32)
echo "OAUTH_CLIENT_ID=$OAUTH_CLIENT_ID"
echo "OAUTH_CLIENT_SECRET=$OAUTH_CLIENT_SECRET"
```

Save both values — you'll need them in the next step and when configuring Claude.

### 4. Set environment variables

Create a `.env` file or set these in your hosting platform's secrets/environment panel:

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_PERSONAL_ACCESS_TOKEN` | **Yes** | GitHub PAT with `repo` scope |
| `OAUTH_CLIENT_ID` | **Yes** | OAuth Client ID for authenticating MCP connections |
| `OAUTH_CLIENT_SECRET` | **Yes** | OAuth Client Secret (used to sign/verify JWT access tokens) |
| `PORT` | No | Server port (default: `5000`) |

The server will **refuse to start** if `GITHUB_PERSONAL_ACCESS_TOKEN` is missing. If only one of `OAUTH_CLIENT_ID` / `OAUTH_CLIENT_SECRET` is set, the server will also refuse to start.

> **V2 note:** `GITHUB_OWNER` and `GITHUB_REPO` environment variables are no longer used. The target repository is specified per tool call via `owner` and `repo` parameters.

If neither OAuth variable is set, MCP endpoints are open (no authentication). This is fine for local development but **never deploy publicly without authentication**.

### 5. Deploy / Run

**On Replit:** Click Run. The server starts automatically.

**Locally or on other platforms:**

```bash
npm run dev
```

The server will start on port 5000 (or whatever you set `PORT` to). You should see:

```
[MCP] OAuth 2.0 Client Credentials authentication is ENABLED
[MCP] Token endpoint: /oauth/token
[MCP] MCP endpoint: /mcp
```

### 6. Connect Claude

1. Go to **claude.ai → Settings → Integrations → Add More → Custom MCP connector**
2. Enter your server URL: `https://your-server-url.example.com/mcp`
3. Open **Advanced settings**
4. Set **Client ID** to your `OAUTH_CLIENT_ID` value
5. Set **Client Secret** to your `OAUTH_CLIENT_SECRET` value
6. Set **Authorization URL** to `https://your-server-url.example.com/oauth/token`
7. Claude will authenticate using the Client Credentials flow and discover all tools automatically

### 7. Start using it

In any Claude conversation, you can now say things like:

- *"Read the file src/index.ts from the repo"*
- *"Create a new file called utils/helpers.ts with a debounce function"*
- *"List all open issues labeled 'bug'"*
- *"Create an issue titled 'Add dark mode support' with a description"*

Claude will use the MCP tools to interact with your GitHub repo directly.

## Security

### How authentication works

The server implements the **OAuth 2.0 Client Credentials flow** (RFC 6749). When Claude.ai connects:

1. Claude POSTs to `/oauth/token` with `client_id`, `client_secret`, and `grant_type=client_credentials`
2. The server validates the credentials against `OAUTH_CLIENT_ID` and `OAUTH_CLIENT_SECRET`
3. If valid, the server returns a signed JWT access token (HMAC-SHA256, expires in 1 hour)
4. Claude includes the JWT as a `Bearer` token in the `Authorization` header for all MCP requests
5. The server verifies the JWT signature and expiration on every request
6. When the token expires, Claude automatically re-authenticates

No secrets are embedded in URLs. All authentication happens via standard HTTP headers.

### Trust model

- Your OAuth credentials control who can connect to the MCP server
- Your `GITHUB_PERSONAL_ACCESS_TOKEN` controls what the server can do on GitHub — the PAT's scope determines which repos Claude can access
- Anyone with your OAuth credentials can use your GitHub PAT's permissions through the server
- In multi-repo mode, Claude can access any repo the PAT has permissions for — use Claude Project system prompts to constrain which repo Claude targets (see [Project Scoping](#project-scoping))
- Treat all tokens and secrets as confidential — never commit them to version control

### Recommendations

- Always set `OAUTH_CLIENT_ID` and `OAUTH_CLIENT_SECRET` on any publicly accessible deployment
- Use a GitHub PAT with the minimum required scope (`repo`)
- Consider using a fine-grained PAT scoped to a single repository if GitHub supports it for your use case
- Rotate credentials periodically

## Tools

All tools accept `owner` and `repo` as required parameters. Write tools prefix their responses with `✅ Writing to: {owner}/{repo}`.

### File Tools

| Tool | Description |
|------|-------------|
| `read_file` | Read the contents of a file from a GitHub repo |
| `write_file` | Create or update a single file |
| `push_multiple_files` | Create or update multiple files in a single commit |
| `list_files` | List files and folders at a path |

### Search & History

| Tool | Description |
|------|-------------|
| `search_files` | Search file contents using GitHub Code Search |
| `get_recent_commits` | Return recent commit history for a branch |

### Advanced File Operations

| Tool | Description |
|------|-------------|
| `move_file` | Copy to new path + return link for manual delete of original |
| `delete_file` | Delete a file from the repo (destructive) |
| `queue_write` | Queue a file write for batch commit (in-memory, resets on restart) |
| `flush_queue` | Commit all queued writes in a single commit |

### Issue Tools

| Tool | Description |
|------|-------------|
| `create_issue` | Create a new GitHub Issue |
| `update_issue` | Update an existing GitHub Issue |
| `list_issues` | List GitHub Issues with optional filters |
| `add_issue_comment` | Add a comment to an existing GitHub Issue |

### Phase 2 (Registered stubs, not yet implemented)

| Tool | Description |
|------|-------------|
| `create_branch` | Create a new branch from an existing one |
| `list_branches` | List all branches in the repo |
| `get_file_diff` | Show file changes since a specific commit SHA |
| `get_project_board` | Read GitHub Projects kanban board |
| `move_issue_to_column` | Move an issue card on the Projects board |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/oauth/token` | OAuth 2.0 token endpoint (Client Credentials flow) |
| `POST` | `/mcp` | MCP over Streamable HTTP (recommended) |
| `GET` | `/mcp` | SSE stream for an existing Streamable HTTP session |
| `DELETE` | `/mcp` | Close a Streamable HTTP session |
| `GET` | `/sse` | Legacy SSE transport (MCP over SSE) |
| `POST` | `/messages` | Message endpoint for legacy SSE transport |
| `GET` | `/api/status` | Server status, tool registry, and auth status |

## Project Scoping

Since V2 uses multi-repo mode (no hardcoded `GITHUB_OWNER`/`GITHUB_REPO`), you should use a **Claude Project** with a system prompt to lock Claude to a specific repository. This prevents accidental writes to the wrong repo.

### Example system prompt

```
You are working exclusively in the GitHub repository:
owner=YOUR_USERNAME repo=YOUR_REPO

Pass these values on every tool call to the GitHub MCP bridge.
Never write to any other repository regardless of what the user asks.
If asked to work in a different repo, tell the user to switch to
the appropriate Claude Project for that repository.

At the start of each session:
1. Call list_files to confirm you can reach the repo
2. Ask the user what they want to work on
```

Create one Claude Project per repository you want to manage. Each project gets its own system prompt with the correct `owner` and `repo` values.

If your repository has a `CLAUDE.md` file, add it to the Claude Project as a project knowledge file — Claude will read it automatically at the start of each conversation for repo-specific rules and context.

## Dashboard

The server includes a web dashboard at the root URL that shows:

- Server status, version, and operating mode
- Authentication status (OAuth 2.0 enabled or open)
- Token endpoint URL for reference
- Active MCP sessions
- MCP endpoint URL for easy copying
- Full tool registry with phase indicators

## Tech Stack

- **Runtime:** Node.js with TypeScript
- **MCP SDK:** `@modelcontextprotocol/sdk` (Streamable HTTP + SSE transports)
- **GitHub API:** Octokit REST client
- **Auth:** OAuth 2.0 Client Credentials with HMAC-SHA256 signed JWTs
- **Server:** Express
- **Frontend:** React + Vite + Tailwind CSS + shadcn/ui

## License

MIT
