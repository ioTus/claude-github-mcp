import { octokit, OWNER, REPO, logToolCall } from "../lib/github.js";

export const writeFileSchema = {
  name: "write_file",
  description: "Create or update a single file in the GitHub repo",
  inputSchema: {
    type: "object" as const,
    properties: {
      path: { type: "string", description: "File path in the repo" },
      content: { type: "string", description: "Full file content" },
      commit_message: { type: "string", description: "Commit message (auto-generated if not provided)" },
      branch: { type: "string", description: "Branch name (default: main)", default: "main" },
    },
    required: ["path", "content"],
  },
};

export async function writeFile(args: {
  path: string;
  content: string;
  commit_message?: string;
  branch?: string;
}) {
  const { path, content, branch = "main" } = args;
  const commitMessage = args.commit_message || `Claude: update ${path}`;

  try {
    let sha: string | undefined;
    try {
      const existing = await octokit.repos.getContent({
        owner: OWNER,
        repo: REPO,
        path,
        ref: branch,
      });
      if (!Array.isArray(existing.data) && existing.data.type === "file") {
        sha = existing.data.sha;
      }
    } catch {
      // file doesn't exist yet
    }

    const response = await octokit.repos.createOrUpdateFileContents({
      owner: OWNER,
      repo: REPO,
      path,
      message: commitMessage,
      content: Buffer.from(content).toString("base64"),
      branch,
      ...(sha ? { sha } : {}),
    });

    const commitSha = response.data.commit.sha;
    logToolCall("write_file", { path, branch, commit_message: commitMessage }, "success", `commit: ${commitSha}`);
    return {
      content: [
        {
          type: "text",
          text: `File '${path}' ${sha ? "updated" : "created"} successfully.\nCommit SHA: ${commitSha}\nBranch: ${branch}`,
        },
      ],
    };
  } catch (error: any) {
    const message = `Failed to write file: ${error.message}`;
    logToolCall("write_file", { path, branch }, "error", message);
    return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
  }
}
