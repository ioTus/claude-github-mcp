import { logToolCall } from "../lib/github.js";

async function stubResponse(toolName: string, args: Record<string, any>) {
  logToolCall(toolName, args, "success", "stub — not yet implemented");
  return {
    content: [
      {
        type: "text",
        text: `Tool '${toolName}' is registered but not yet implemented. This is a Phase 2 feature — coming soon.`,
      },
    ],
  };
}

export const createBranchSchema = {
  name: "create_branch",
  description: "[Phase 2] Create a new branch from an existing one",
  inputSchema: {
    type: "object" as const,
    properties: {
      owner: { type: "string", description: "GitHub username or organization" },
      repo: { type: "string", description: "Repository name" },
      branch_name: { type: "string", description: "New branch name" },
      from_branch: { type: "string", description: "Source branch (default: main)", default: "main" },
    },
    required: ["owner", "repo", "branch_name"],
  },
};

export const listBranchesSchema = {
  name: "list_branches",
  description: "[Phase 2] List all branches in the repo",
  inputSchema: {
    type: "object" as const,
    properties: {
      owner: { type: "string", description: "GitHub username or organization" },
      repo: { type: "string", description: "Repository name" },
      limit: { type: "number", description: "Max results (default: 30)", default: 30 },
    },
    required: ["owner", "repo"],
  },
};

export const getFileDiffSchema = {
  name: "get_file_diff",
  description: "[Phase 2] Show file changes since a specific commit SHA",
  inputSchema: {
    type: "object" as const,
    properties: {
      owner: { type: "string", description: "GitHub username or organization" },
      repo: { type: "string", description: "Repository name" },
      commit_sha: { type: "string", description: "Commit SHA to compare against" },
      path: { type: "string", description: "Optional file path to filter" },
    },
    required: ["owner", "repo", "commit_sha"],
  },
};

export const getProjectBoardSchema = {
  name: "get_project_board",
  description: "[Phase 2] Read GitHub Projects kanban board (requires GraphQL)",
  inputSchema: {
    type: "object" as const,
    properties: {
      owner: { type: "string", description: "GitHub username or organization" },
      repo: { type: "string", description: "Repository name" },
      project_number: { type: "number", description: "Project number" },
    },
    required: ["owner", "repo", "project_number"],
  },
};

export const moveIssueToColumnSchema = {
  name: "move_issue_to_column",
  description: "[Phase 2] Move an issue card on the Projects board (requires GraphQL)",
  inputSchema: {
    type: "object" as const,
    properties: {
      owner: { type: "string", description: "GitHub username or organization" },
      repo: { type: "string", description: "Repository name" },
      issue_number: { type: "number", description: "Issue number" },
      column_name: { type: "string", description: "Target column name" },
      project_number: { type: "number", description: "Project number" },
    },
    required: ["owner", "repo", "issue_number", "column_name", "project_number"],
  },
};

export const phase2Stubs = [
  { schema: createBranchSchema, handler: (args: any) => stubResponse("create_branch", args) },
  { schema: listBranchesSchema, handler: (args: any) => stubResponse("list_branches", args) },
  { schema: getFileDiffSchema, handler: (args: any) => stubResponse("get_file_diff", args) },
  { schema: getProjectBoardSchema, handler: (args: any) => stubResponse("get_project_board", args) },
  { schema: moveIssueToColumnSchema, handler: (args: any) => stubResponse("move_issue_to_column", args) },
];
