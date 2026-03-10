import { octokit, OWNER, REPO, logToolCall } from "../lib/github.js";

export const pushMultipleFilesSchema = {
  name: "push_multiple_files",
  description: "Create or update multiple files in a single commit using the Git Data API",
  inputSchema: {
    type: "object" as const,
    properties: {
      files: {
        type: "array",
        items: {
          type: "object",
          properties: {
            path: { type: "string", description: "File path in the repo" },
            content: { type: "string", description: "Full file content" },
          },
          required: ["path", "content"],
        },
        description: "Array of files to create/update",
      },
      commit_message: { type: "string", description: "Commit message (auto-generated if not provided)" },
      branch: { type: "string", description: "Branch name (default: main)", default: "main" },
    },
    required: ["files"],
  },
};

export async function pushMultipleFiles(args: {
  files: Array<{ path: string; content: string }>;
  commit_message?: string;
  branch?: string;
}) {
  const { files, branch = "main" } = args;
  const commitMessage = args.commit_message || `Claude: push ${files.length} files`;

  try {
    const refResponse = await octokit.git.getRef({
      owner: OWNER,
      repo: REPO,
      ref: `heads/${branch}`,
    });
    const latestCommitSha = refResponse.data.object.sha;

    const commitResponse = await octokit.git.getCommit({
      owner: OWNER,
      repo: REPO,
      commit_sha: latestCommitSha,
    });
    const baseTreeSha = commitResponse.data.tree.sha;

    const tree = await Promise.all(
      files.map(async (file) => {
        const blob = await octokit.git.createBlob({
          owner: OWNER,
          repo: REPO,
          content: Buffer.from(file.content).toString("base64"),
          encoding: "base64",
        });
        return {
          path: file.path,
          mode: "100644" as const,
          type: "blob" as const,
          sha: blob.data.sha,
        };
      })
    );

    const newTree = await octokit.git.createTree({
      owner: OWNER,
      repo: REPO,
      base_tree: baseTreeSha,
      tree,
    });

    const newCommit = await octokit.git.createCommit({
      owner: OWNER,
      repo: REPO,
      message: commitMessage,
      tree: newTree.data.sha,
      parents: [latestCommitSha],
    });

    await octokit.git.updateRef({
      owner: OWNER,
      repo: REPO,
      ref: `heads/${branch}`,
      sha: newCommit.data.sha,
    });

    const filePaths = files.map((f) => f.path).join(", ");
    logToolCall("push_multiple_files", { files: filePaths, branch, commit_message: commitMessage }, "success", `commit: ${newCommit.data.sha}`);
    return {
      content: [
        {
          type: "text",
          text: `Successfully pushed ${files.length} files in a single commit.\nFiles: ${filePaths}\nCommit SHA: ${newCommit.data.sha}\nBranch: ${branch}`,
        },
      ],
    };
  } catch (error: any) {
    const message = `Failed to push multiple files: ${error.message}`;
    logToolCall("push_multiple_files", { fileCount: files.length, branch }, "error", message);
    return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
  }
}
