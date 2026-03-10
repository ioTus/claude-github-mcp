# claude-github-mcp

  [![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

  A production-ready MCP (Model Context Protocol) bridge server that connects Claude Chat (claude.ai) to a GitHub repository. It allows Claude to read and write files AND manage GitHub Issues directly from a conversation via a custom MCP connector using SSE transport.

  ## Architecture

  ```
    Claude Chat (claude.ai)
      ↕ custom MCP connector
    MCP Bridge Server (Replit)
      ↕ GitHub API (Octokit)
    GitHub Repo (files + Issues + Projects)
  ```

  ## Setup Instructions

  ### Step 1: Fork or clone this repo

  ```bash
  git clone https://github.com/ioTus/claude-github-mcp.git
  cd claude-github-mcp
  npm install
  ```

  ### Step 2: Create a GitHub Personal Access Token

  Go to GitHub → Settings → Developer Settings → Personal Access Tokens → Tokens (classic).
  Create a new token with `repo` scope (covers file read/write and Issues).

  ### Step 3: Set environment variables

  Copy `.env.example` to `.env` and fill in your values:

  ```bash
  cp .env.example .env
  ```

  | Variable | Required | Description |
  |----------|----------|-------------|
  | `GITHUB_PERSONAL_ACCESS_TOKEN` | **Yes** | GitHub PAT with `repo` scope |
  | `GITHUB_OWNER` | **Yes** | Your GitHub username or org |
  | `GITHUB_REPO` | **Yes** | Target repo name |
  | `PORT` | No | Server port (default: `5000`) |

  ### Step 4: Run the server

  ```bash
  npm run dev
  ```

  Or deploy on Replit — click Run.

  ### Step 5: Copy the public URL

  The SSE endpoint will be at `https://your-server-url/sse`

  ### Step 6: Connect Claude.ai

  Go to claude.ai → Settings → Connectors → Add custom connector.

  ### Step 7: Paste the URL

  Claude discovers all tools automatically.

  ## Phase 1 Tools (Active)

  ### File Tools

  | Tool | Description |
  |------|-------------|
  | `read_file` | Read the contents of a file from the GitHub repo |
  | `write_file` | Create or update a single file in the GitHub repo |
  | `push_multiple_files` | Create or update multiple files in a single commit |
  | `list_files` | List files and folders at a path in the repo |

  ### Issues Tools

  | Tool | Description |
  |------|-------------|
  | `create_issue` | Create a new GitHub Issue in the repo |
  | `update_issue` | Update an existing GitHub Issue |
  | `list_issues` | List GitHub Issues with optional filters |
  | `add_issue_comment` | Add a comment to an existing GitHub Issue |

  ## Phase 2 Roadmap

  These tools are registered but return "not yet implemented":

  | Tool | Description |
  |------|-------------|
  | `delete_file` | Remove a file from the repo |
  | `create_branch` | Create a new branch from an existing one |
  | `list_branches` | List all branches in the repo |
  | `get_recent_commits` | Return recent commit history for a branch |
  | `get_file_diff` | Show file changes since a specific commit SHA |
  | `get_project_board` | Read GitHub Projects kanban board (GraphQL) |
  | `move_issue_to_column` | Move an issue card on the Projects board (GraphQL) |

  ## API Endpoints

  | Method | Path | Description |
  |--------|------|-------------|
  | `GET` | `/sse` | Establishes SSE connection for MCP |
  | `POST` | `/messages` | Receives tool call messages from Claude |
  | `GET` | `/api/status` | Server status and tool registry |

  ## Status Dashboard

  When you visit the server URL in a browser, you'll see a status dashboard showing:
  - Server status and connected repository
  - SSE endpoint URL (copy-paste ready)
  - All registered tools with their current status
  - Quick setup instructions

  ## License

  MIT — Created by [ioTus](https://github.com/ioTus)
  