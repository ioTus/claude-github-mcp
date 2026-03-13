import { octokit, validateOwnerRepo, ownerRepoParams, logToolCall } from "../lib/github.js";

export const deleteFileSchema = {
  name: "delete_file",
  description: "Delete a file from a GitHub repository. This is a destructive operation — the file will be permanently removed from the specified branch.",
  inputSchema: {
    type: "object" as const,
    properties: {
      ...ownerRepoParams,
      path: { type: "string", description: "File path to delete" },
      commit_message: { type: "string", description: "Commit message (auto-generated if not provided)" },
      branch: { type: "string", description: "Branch name (default: main)", default: "main" },
    },
    required: ["owner", "repo", "path"],
  },
};

export async function deleteFile(args: {
  owner?: string;
  repo?: string;
  path: string;
  commit_message?: string;
  branch?: string;
}) {
  const validated = validateOwnerRepo(args);
  if ("error" in validated) {
    return { content: [{ type: "text", text: `Error: ${validated.error}` }], isError: true };
  }
  const { owner, repo } = validated;
  const { path, branch = "main" } = args;
  const commitMessage = args.commit_message || `Claude: delete ${path}`;

  try {
    const existing = await octokit.repos.getContent({ owner, repo, path, ref: branch });
    if (Array.isArray(existing.data) || existing.data.type !== "file") {
      logToolCall("delete_file", { owner, repo, path, branch }, "error", "Path is not a file");
      return { content: [{ type: "text", text: `Error: '${path}' is not a file. Cannot delete directories through this tool.` }], isError: true };
    }

    const sha = existing.data.sha;

    const response = await octokit.repos.deleteFile({
      owner, repo, path,
      message: commitMessage,
      sha,
      branch,
    });

    const commitSha = response.data.commit.sha;
    logToolCall("delete_file", { owner, repo, path, branch }, "success", `commit: ${commitSha}`);
    return {
      content: [
        {
          type: "text",
          text: `✅ Writing to: ${owner}/${repo}\nFile '${path}' deleted successfully.\nCommit SHA: ${commitSha}\nBranch: ${branch}`,
        },
      ],
    };
  } catch (error: any) {
    const message = error.status === 404
      ? `File not found: '${path}' on branch '${branch}' in ${owner}/${repo}`
      : `Failed to delete file: ${error.message}`;
    logToolCall("delete_file", { owner, repo, path, branch }, "error", message);
    return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
  }
}
