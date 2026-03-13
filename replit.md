# claude-github-mcp

## Overview
MCP (Model Context Protocol) bridge server that connects Claude Chat (claude.ai) to a GitHub repository. Allows Claude to read/write files and manage GitHub Issues directly from conversations.

## Architecture
- **Server**: Express.js with MCP SDK (Streamable HTTP + legacy SSE transport)
- **Frontend**: React status dashboard (Vite)
- **Transport**: Streamable HTTP at `/mcp` (recommended), legacy SSE at `/sse` + `/messages`
- **GitHub API**: Octokit REST client
- **Auth**: OAuth 2.0 Client Credentials flow — HMAC-SHA256 signed JWTs via `/oauth/token`

## Key Files
- `server/routes.ts` — MCP server setup, OAuth token endpoint, Streamable HTTP + SSE endpoints, CORS, auth middleware, tool registration
- `server/lib/github.ts` — Octokit client initialized from env vars (no fallback defaults — all required)
- `server/tools/` — Individual tool implementations
  - `read_file.ts`, `write_file.ts`, `push_multiple_files.ts`, `list_files.ts` — File tools
  - `create_issue.ts`, `update_issue.ts`, `list_issues.ts`, `add_issue_comment.ts` — Issues tools
  - `phase2_stubs.ts` — Stubbed Phase 2 tools
- `client/src/pages/Home.tsx` — Status dashboard with OAuth auth indicator and token endpoint display

## Environment Variables
- `GITHUB_PERSONAL_ACCESS_TOKEN` — GitHub PAT with repo scope (required, server exits if missing)
- `GITHUB_OWNER` — GitHub username/org (required, server exits if missing)
- `GITHUB_REPO` — Target repo name (required, server exits if missing)
- `OAUTH_CLIENT_ID` — OAuth Client ID; set with OAUTH_CLIENT_SECRET to enable OAuth 2.0 auth
- `OAUTH_CLIENT_SECRET` — OAuth Client Secret; used to sign/verify JWT access tokens

## Authentication
- **OAuth 2.0** (`OAUTH_CLIENT_ID` + `OAUTH_CLIENT_SECRET` set): Full Authorization Code flow with optional PKCE (S256). Exposes OAuth discovery metadata. JWTs signed with HMAC-SHA256. All MCP endpoints require Bearer JWT. Clean /mcp URL.
- **Open** (neither set): Endpoints are unprotected. Development only.
- Server exits if only one of the OAuth vars is set (partial config).

## Endpoints
- `GET /.well-known/oauth-protected-resource[/mcp]` — RFC 9728 Protected Resource Metadata; returns `resource` URL + `authorization_servers` (Claude.ai fetches this first)
- `GET /.well-known/oauth-authorization-server` — RFC 8414 Authorization Server Metadata; returns auth + token endpoints
- `GET /authorize` — OAuth 2.0 Authorization endpoint (auto-approves, supports PKCE S256)
- `POST /oauth/token` — Token endpoint; supports `authorization_code` (+ PKCE) and `client_credentials` grants; returns signed JWT
- `POST|GET|DELETE /mcp` — Streamable HTTP transport (Claude.ai connector URL), auth-protected
- `GET /sse` — Legacy SSE connection for MCP protocol, auth-protected
- `POST /messages` — Legacy SSE message endpoint, auth-protected
- `GET /api/status` — Server status JSON (public, includes authMode field)

## CORS
- Allows origins: claude.ai, claude.com (and www variants)
- Handles OPTIONS preflight for /mcp, /sse, /messages

## Dependencies
- `@modelcontextprotocol/sdk` — MCP protocol implementation (Streamable HTTP + SSE)
- `@octokit/rest` — GitHub API client
- `express` — HTTP server
- React + Vite — Frontend dashboard

## Agent Collaboration Workflow
- Plan documents are exchanged in `docs/plans/` — numbered sequentially (e.g., `001-topic.md`)
- Responses use `-response` suffix; revisions use `-v2`, `-v3`
- GitHub Issues are used for task tracking alongside plan documents
- Replit Agent has GitHub API access via the Replit GitHub integration (authenticated as `ioTus`)
- The user orchestrates communication between Replit Agent and Claude

## Public Repository
- Source published at github.com/ioTus/claude-github-mcp
