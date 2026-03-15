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

export const getProjectBoardSchema = {
  name: "get_project_board",
  category: "project",
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
  category: "project",
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
  { schema: getProjectBoardSchema, handler: (args: any) => stubResponse("get_project_board", args) },
  { schema: moveIssueToColumnSchema, handler: (args: any) => stubResponse("move_issue_to_column", args) },
];
