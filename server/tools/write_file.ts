import { octokit, validateOwnerRepo, ownerRepoParams, logToolCall } from "../lib/github.js";

export const writeFileSchema = {
  name: "write_file",
  description: "Create or update a single file in a GitHub repository",
  inputSchema: {
    type: "object" as const,
    properties: {
      ...ownerRepoParams,
      path: { type: "string", description: "File path in the repo" },
      content: { type: "string", description: "Full file content" },
      commit_message: { type: "string", description: "Commit message (auto-generated if not provided)" },
      branch: { type: "string", description: "Branch name (default: main)", default: "main" },
    },
    required: ["owner", "repo", "path", "content"],
  },
};

export async function writeFile(args: {
  owner?: string;
  repo?: string;
  path: string;
  content: string;
  commit_message?: string;
  branch?: string;
}) {
  const validated = validateOwnerRepo(args);
  if ("error" in validated) {
    return { content: [{ type: "text", text: `Error: ${validated.error}` }], isError: true };
  }
  const { owner, repo } = validated;
  const { path, content, branch = "main" } = args;
  const commitMessage = args.commit_message || `Claude: update ${path}`;

  try {
    let sha: string | undefined;
    try {
      const existing = await octokit.repos.getContent({ owner, repo, path, ref: branch });
      if (!Array.isArray(existing.data) && existing.data.type === "file") {
        sha = existing.data.sha;
      }
    } catch {
    }

    const response = await octokit.repos.createOrUpdateFileContents({
      owner, repo, path,
      message: commitMessage,
      content: Buffer.from(content).toString("base64"),
      branch,
      ...(sha ? { sha } : {}),
    });

    const commitSha = response.data.commit.sha;
    logToolCall("write_file", { owner, repo, path, branch, commit_message: commitMessage }, "success", `commit: ${commitSha}`);
    return {
      content: [
        {
          type: "text",
          text: `✅ Writing to: ${owner}/${repo}\nFile '${path}' ${sha ? "updated" : "created"} successfully.\nCommit SHA: ${commitSha}\nBranch: ${branch}`,
        },
      ],
    };
  } catch (error: any) {
    const message = `Failed to write file: ${error.message}`;
    logToolCall("write_file", { owner, repo, path, branch }, "error", message);
    return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
  }
}
