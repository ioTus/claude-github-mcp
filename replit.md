# gitbridge-mcp

## Overview
MCP (Model Context Protocol) bridge server that connects Claude Chat (claude.ai) to any GitHub repository. V2 multi-repo mode — Claude passes owner/repo on every tool call.

## Architecture
- **Server**: Express.js with MCP SDK (Streamable HTTP + legacy SSE transport)
- **Frontend**: React status dashboard (Vite)
- **Transport**: Streamable HTTP at `/mcp` (recommended), legacy SSE at `/sse` + `/messages`
- **GitHub API**: Octokit REST client (PAT-only, no per-repo env vars)
- **Auth**: OAuth 2.0 Client Credentials flow — HMAC-SHA256 signed JWTs via `/oauth/token`

## Key Files
- `server/routes.ts` — MCP server setup, OAuth token endpoint, Streamable HTTP + SSE endpoints, CORS, auth middleware, tool registration
- `server/lib/github.ts` — Octokit client, shared `validateOwnerRepo()` helper, `ownerRepoParams` schema fragment
- `server/tools/` — Individual tool implementations (16 active + 5 Phase 2 stubs)
  - File tools: `read_file.ts`, `write_file.ts`, `push_multiple_files.ts`, `list_files.ts`
  - Issue tools: `create_issue.ts`, `update_issue.ts`, `list_issues.ts`, `read_issue.ts`, `add_issue_comment.ts`
  - Search: `search_files.ts`, `get_recent_commits.ts`
  - Advanced: `move_file.ts`, `delete_file.ts`, `queue_write.ts`, `flush_queue.ts`
  - Repo mgmt: `create_repo.ts`
  - Stubs: `phase2_stubs.ts` (create_branch, list_branches, get_file_diff, get_project_board, move_issue_to_column)
- `client/src/pages/Home.tsx` — Status dashboard with tool categories, project scoping template

## Environment Variables
- `GITHUB_PERSONAL_ACCESS_TOKEN` — GitHub PAT with repo scope (required, server exits if missing)
- `OAUTH_CLIENT_ID` — OAuth Client ID (required, server exits if missing)
- `OAUTH_CLIENT_SECRET` — OAuth Client Secret; used to sign/verify JWT access tokens (required, server exits if missing)
- `ALLOWED_REPOS` — Optional comma-separated `owner/repo` pairs to restrict tool access (e.g. `ioTus/my-repo,ioTus/other-repo`). When unset, all repos the PAT can reach are allowed.

## Authentication
- OAuth 2.0 is **mandatory** — there is no unauthenticated/open mode. The server exits at startup if `OAUTH_CLIENT_ID` or `OAUTH_CLIENT_SECRET` is missing.
- Full Authorization Code flow with optional PKCE (S256). Exposes OAuth discovery metadata. JWTs signed with HMAC-SHA256. All MCP endpoints require Bearer JWT.
- Dashboard login uses `client_credentials` grant with the same OAuth credentials. JWT stored in `sessionStorage`.
- `/api/status` returns tiered data: unauthenticated gets `{status, server, version}` only; authenticated gets full tool list, session count, and endpoint info.
- CORS headers are only set for allow-listed origins (claude.ai, claude.com). Unknown origins get no CORS headers.
- Optional `ALLOWED_REPOS` env var restricts which repositories all tools can access. Check is in `validateOwnerRepo()`.

## Endpoints
- `GET /.well-known/oauth-protected-resource[/mcp]` — RFC 9728 Protected Resource Metadata
- `GET /.well-known/oauth-authorization-server` — RFC 8414 Authorization Server Metadata
- `GET /authorize` — OAuth 2.0 Authorization endpoint (auto-approves, supports PKCE S256)
- `POST /oauth/token` — Token endpoint; supports `authorization_code` (+ PKCE) and `client_credentials` grants
- `POST|GET|DELETE /mcp` — Streamable HTTP transport (Claude.ai connector URL), auth-protected
- `GET /sse` — Legacy SSE connection for MCP protocol, auth-protected
- `POST /messages` — Legacy SSE message endpoint, auth-protected
- `GET /api/status` — Server status JSON (tiered: public gets basic info; Bearer JWT gets full details)

## V2 Changes
- Multi-repo mode: all tools accept `owner` and `repo` params (no hardcoded env vars)
- Write confirmation headers: `✅ Writing to: {owner}/{repo}` prefix on write tool responses
- 6 new tools: search_files, move_file, delete_file, queue_write, flush_queue, get_recent_commits
- Queue: in-memory Map keyed by `owner/repo`, last-write-wins dedup, resets on server restart
- Project scoping: two approaches documented — Option A (one Project per repo) and Option B (multi-repo with CLAUDE.md)
- Security: PAT scoping best practices added to README, OAuth audit completed (Issue #6)

## Agent Collaboration Workflow
- Plan documents exchanged in `docs/plans/` — numbered sequentially
- Responses use `-response` suffix; revisions use `-v2`, `-v3`
- GitHub Issues used for task tracking alongside plan documents
- Replit Agent has GitHub API access via the Replit GitHub integration (authenticated as `ioTus`)

## Public Repository
- Source published at github.com/ioTus/gitbridge-mcp
