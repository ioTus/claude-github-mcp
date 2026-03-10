import { octokit, OWNER, REPO, logToolCall } from "../lib/github.js";

export const updateIssueSchema = {
  name: "update_issue",
  description: "Update an existing GitHub Issue (change status, labels, title, or body)",
  inputSchema: {
    type: "object" as const,
    properties: {
      issue_number: { type: "number", description: "Issue number to update" },
      title: { type: "string", description: "New title" },
      body: { type: "string", description: "New body in markdown" },
      state: { type: "string", description: "'open' or 'closed'", enum: ["open", "closed"] },
      labels: {
        type: "array",
        items: { type: "string" },
        description: "Replace existing labels",
      },
      assignees: {
        type: "array",
        items: { type: "string" },
        description: "Replace existing assignees",
      },
    },
    required: ["issue_number"],
  },
};

export async function updateIssue(args: {
  issue_number: number;
  title?: string;
  body?: string;
  state?: "open" | "closed";
  labels?: string[];
  assignees?: string[];
}) {
  const { issue_number, title, body, state, labels, assignees } = args;

  try {
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (body !== undefined) updateData.body = body;
    if (state !== undefined) updateData.state = state;
    if (labels !== undefined) updateData.labels = labels;
    if (assignees !== undefined) updateData.assignees = assignees;

    const response = await octokit.issues.update({
      owner: OWNER,
      repo: REPO,
      issue_number,
      ...updateData,
    });

    logToolCall("update_issue", { issue_number, ...updateData }, "success");
    return {
      content: [
        {
          type: "text",
          text: `Issue #${issue_number} updated successfully.\nTitle: ${response.data.title}\nState: ${response.data.state}\nURL: ${response.data.html_url}`,
        },
      ],
    };
  } catch (error: any) {
    const message = error.status === 404
      ? `Issue #${issue_number} not found`
      : `Failed to update issue: ${error.message}`;
    logToolCall("update_issue", { issue_number }, "error", message);
    return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
  }
}
