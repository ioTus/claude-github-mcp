import { octokit, OWNER, REPO, logToolCall } from "../lib/github.js";

export const createIssueSchema = {
  name: "create_issue",
  description: "Create a new GitHub Issue in the repo",
  inputSchema: {
    type: "object" as const,
    properties: {
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
    required: ["title"],
  },
};

export async function createIssue(args: {
  title: string;
  body?: string;
  labels?: string[];
  assignees?: string[];
}) {
  const { title, body, labels, assignees } = args;

  try {
    const response = await octokit.issues.create({
      owner: OWNER,
      repo: REPO,
      title,
      body,
      labels,
      assignees,
    });

    logToolCall("create_issue", { title }, "success", `#${response.data.number}`);
    return {
      content: [
        {
          type: "text",
          text: `Issue created successfully.\nNumber: #${response.data.number}\nTitle: ${response.data.title}\nURL: ${response.data.html_url}`,
        },
      ],
    };
  } catch (error: any) {
    const message = `Failed to create issue: ${error.message}`;
    logToolCall("create_issue", { title }, "error", message);
    return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
  }
}
