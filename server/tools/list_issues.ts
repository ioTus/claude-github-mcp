import { octokit, OWNER, REPO, logToolCall } from "../lib/github.js";

export const listIssuesSchema = {
  name: "list_issues",
  description: "List GitHub Issues in the repo with optional filters",
  inputSchema: {
    type: "object" as const,
    properties: {
      state: {
        type: "string",
        description: "Filter by state: 'open', 'closed', or 'all' (default: open)",
        enum: ["open", "closed", "all"],
        default: "open",
      },
      labels: {
        type: "array",
        items: { type: "string" },
        description: "Filter by labels",
      },
      limit: {
        type: "number",
        description: "Max results to return (default: 20)",
        default: 20,
      },
    },
  },
};

export async function listIssues(args: {
  state?: "open" | "closed" | "all";
  labels?: string[];
  limit?: number;
}) {
  const { state = "open", labels, limit = 20 } = args;

  try {
    const response = await octokit.issues.listForRepo({
      owner: OWNER,
      repo: REPO,
      state,
      labels: labels?.join(","),
      per_page: limit,
    });

    const issues = response.data
      .filter((issue) => !issue.pull_request)
      .map((issue) => ({
        number: issue.number,
        title: issue.title,
        state: issue.state,
        labels: issue.labels.map((l) => (typeof l === "string" ? l : l.name)),
        assignees: issue.assignees?.map((a) => a.login) || [],
        url: issue.html_url,
      }));

    logToolCall("list_issues", { state, labels, limit }, "success", `${issues.length} issues`);
    return { content: [{ type: "text", text: JSON.stringify(issues, null, 2) }] };
  } catch (error: any) {
    const message = `Failed to list issues: ${error.message}`;
    logToolCall("list_issues", { state, labels, limit }, "error", message);
    return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
  }
}
