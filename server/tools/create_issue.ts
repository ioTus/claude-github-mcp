import { octokit, validateOwnerRepo, ownerRepoParams, logToolCall } from "../lib/github.js";

export const createIssueSchema = {
  name: "create_issue",
  description: "Create a new GitHub Issue in a repository",
  inputSchema: {
    type: "object" as const,
    properties: {
      ...ownerRepoParams,
      title: { type: "string", description: "Issue title" },
      body: { type: "string", description: "Issue description in markdown" },
      labels: {
        type: "array",
        items: { type: "string" },
        description: "Labels to apply (e.g. ['feature', 'backlog'])",
      },
      assignees: {
        type: "array",
        items: { type: "string" },
        description: "GitHub usernames to assign",
      },
    },
    required: ["owner", "repo", "title"],
  },
};

export async function createIssue(args: {
  owner?: string;
  repo?: string;
  title: string;
  body?: string;
  labels?: string[];
  assignees?: string[];
}) {
  const validated = validateOwnerRepo(args);
  if ("error" in validated) {
    return { content: [{ type: "text", text: `Error: ${validated.error}` }], isError: true };
  }
  const { owner, repo } = validated;
  const { title, body, labels, assignees } = args;

  try {
    const response = await octokit.issues.create({ owner, repo, title, body, labels, assignees });

    logToolCall("create_issue", { owner, repo, title }, "success", `#${response.data.number}`);
    return {
      content: [
        {
          type: "text",
          text: `✅ Writing to: ${owner}/${repo}\nIssue created successfully.\nNumber: #${response.data.number}\nTitle: ${response.data.title}\nURL: ${response.data.html_url}`,
        },
      ],
    };
  } catch (error: any) {
    const message = `Failed to create issue: ${error.message}`;
    logToolCall("create_issue", { owner, repo, title }, "error", message);
    return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
  }
}
