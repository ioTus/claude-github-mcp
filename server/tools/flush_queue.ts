import { octokit, validateOwnerRepo, ownerRepoParams, logToolCall } from "../lib/github.js";
import { getWriteQueue } from "./queue_write.js";

export const flushQueueSchema = {
  name: "flush_queue",
  description: "Commit all queued writes for a repository in a single GitHub commit. Call queue_write first to add files to the queue.",
  inputSchema: {
    type: "object" as const,
    properties: {
      ...ownerRepoParams,
      commit_message: { type: "string", description: "Commit message (auto-generated if not provided)" },
      branch: { type: "string", description: "Branch name (default: main)", default: "main" },
    },
    required: ["owner", "repo"],
  },
};

export async function flushQueue(args: {
  owner?: string;
  repo?: string;
  commit_message?: string;
  branch?: string;
}) {
  const validated = validateOwnerRepo(args);
  if ("error" in validated) {
    return { content: [{ type: "text", text: `Error: ${validated.error}` }], isError: true };
  }
  const { owner, repo } = validated;
  const { branch = "main" } = args;

  const writeQueue = getWriteQueue();
  const key = `${owner}/${repo}`;
  const repoQueue = writeQueue.get(key);

  if (!repoQueue || repoQueue.size === 0) {
    return {
      content: [
        {
          type: "text",
          text: `No writes queued for ${owner}/${repo}. Use queue_write to add files first.`,
        },
      ],
    };
  }

  const files = Array.from(repoQueue.entries()).map(([path, content]) => ({ path, content }));
  const commitMessage = args.commit_message || `Claude: batch commit ${files.length} files`;

  try {
    const refResponse = await octokit.git.getRef({ owner, repo, ref: `heads/${branch}` });
    const latestCommitSha = refResponse.data.object.sha;

    const commitResponse = await octokit.git.getCommit({ owner, repo, commit_sha: latestCommitSha });
    const baseTreeSha = commitResponse.data.tree.sha;

    const tree = await Promise.all(
      files.map(async (file) => {
        const blob = await octokit.git.createBlob({
          owner, repo,
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

    const newTree = await octokit.git.createTree({ owner, repo, base_tree: baseTreeSha, tree });

    const newCommit = await octokit.git.createCommit({
      owner, repo,
      message: commitMessage,
      tree: newTree.data.sha,
      parents: [latestCommitSha],
    });

    await octokit.git.updateRef({ owner, repo, ref: `heads/${branch}`, sha: newCommit.data.sha });

    repoQueue.clear();
    if (repoQueue.size === 0) {
      writeQueue.delete(key);
    }

    const filePaths = files.map((f) => f.path).join(", ");
    logToolCall("flush_queue", { owner, repo, fileCount: files.length, branch, commit_message: commitMessage }, "success", `commit: ${newCommit.data.sha}`);
    return {
      content: [
        {
          type: "text",
          text: `✅ Writing to: ${owner}/${repo}\nSuccessfully committed ${files.length} queued file${files.length === 1 ? "" : "s"} in a single commit.\nFiles: ${filePaths}\nCommit SHA: ${newCommit.data.sha}\nBranch: ${branch}`,
        },
      ],
    };
  } catch (error: any) {
    const message = `Failed to flush queue: ${error.message}`;
    logToolCall("flush_queue", { owner, repo, fileCount: files.length, branch }, "error", message);
    return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
  }
}
