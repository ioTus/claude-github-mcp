import { octokit, OWNER, REPO, logToolCall } from "../lib/github.js";

export const addIssueCommentSchema = {
  name: "add_issue_comment",
  description: "Add a comment to an existing GitHub Issue",
  inputSchema: {
    type: "object" as const,
    properties: {
      issue_number: { type: "number", description: "Issue number to comment on" },
      body: { type: "string", description: "Comment text in markdown" },
    },
    required: ["issue_number", "body"],
  },
};

export async function addIssueComment(args: { issue_number: number; body: string }) {
  const { issue_number, body } = args;

  try {
    const response = await octokit.issues.createComment({
      owner: OWNER,
      repo: REPO,
      issue_number,
      body,
    });

    logToolCall("add_issue_comment", { issue_number }, "success", response.data.html_url);
    return {
      content: [
        {
          type: "text",
          text: `Comment added to issue #${issue_number}.\nComment URL: ${response.data.html_url}`,
        },
      ],
    };
  } catch (error: any) {
    const message = error.status === 404
      ? `Issue #${issue_number} not found`
      : `Failed to add comment: ${error.message}`;
    logToolCall("add_issue_comment", { issue_number }, "error", message);
    return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
  }
}
