import { octokit, validateOwnerRepo, ownerRepoParams, logToolCall } from "../lib/github.js";

export const getFileDiffSchema = {
  name: "get_file_diff",
  category: "search",
  description: "Show file changes between a commit SHA and a branch head (default: main). Returns changed files with status and patch content.",
  inputSchema: {
    type: "object" as const,
    properties: {
      ...ownerRepoParams,
      commit_sha: { type: "string", description: "Commit SHA to compare from (base)" },
      path: { type: "string", description: "Optional file path to filter results" },
      branch: { type: "string", description: "Target branch to compare against (default: main)", default: "main" },
    },
    required: ["owner", "repo", "commit_sha"],
  },
};

export async function getFileDiff(args: {
  owner?: string;
  repo?: string;
  commit_sha: string;
  path?: string;
  branch?: string;
}) {
  const validated = validateOwnerRepo(args);
  if ("error" in validated) {
    return { content: [{ type: "text", text: `Error: ${validated.error}` }], isError: true };
  }
  const { owner, repo } = validated;
  const { commit_sha, path, branch = "main" } = args;

  try {
    const response = await octokit.repos.compareCommitsWithBasehead({
      owner,
      repo,
      basehead: `${commit_sha}...${branch}`,
    });

    const { ahead_by, behind_by, total_commits, status } = response.data;
    let files = response.data.files || [];

    if (path) {
      files = files.filter((f) => f.filename.startsWith(path));
    }

    const summary = [
      `Comparing ${commit_sha.slice(0, 7)}...${branch}`,
      `Status: ${status} | ${total_commits} commit(s) | +${ahead_by} ahead, -${behind_by} behind`,
      `Changed files: ${files.length}${path ? ` (filtered by "${path}")` : ""}`,
      ``,
    ];

    const fileDetails = files.map((f) => {
      const lines = [
        `--- ${f.status.toUpperCase()}: ${f.filename}`,
        `    +${f.additions} -${f.deletions} (${f.changes} changes)`,
      ];
      if (f.patch) {
        const patchLines = f.patch.split("\n");
        const truncated = patchLines.length > 100;
        const displayPatch = truncated ? patchLines.slice(0, 100).join("\n") : f.patch;
        lines.push(displayPatch);
        if (truncated) {
          lines.push(`    ... (${patchLines.length - 100} more lines truncated)`);
        }
      }
      return lines.join("\n");
    });

    const output = [...summary, ...fileDetails].join("\n");

    logToolCall("get_file_diff", { owner, repo, commit_sha: commit_sha.slice(0, 7), path, branch }, "success", `${files.length} files changed`);

    return {
      content: [{ type: "text", text: output }],
    };
  } catch (error: any) {
    let message: string;

    if (error.status === 404) {
      message = `Commit "${commit_sha.slice(0, 7)}" or branch "${branch}" not found in ${owner}/${repo}. Verify both exist.`;
    } else {
      message = `Failed to get diff: ${error.message}`;
    }

    logToolCall("get_file_diff", { owner, repo, commit_sha: commit_sha.slice(0, 7), path, branch }, "error", message);
    return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
  }
}
