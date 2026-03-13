import { octokit, validateOwnerRepo, ownerRepoParams, logToolCall } from "../lib/github.js";

export const getRecentCommitsSchema = {
  name: "get_recent_commits",
  description: "Return recent commit history for a branch in a GitHub repository",
  inputSchema: {
    type: "object" as const,
    properties: {
      ...ownerRepoParams,
      branch: { type: "string", description: "Branch name (default: main)", default: "main" },
      limit: { type: "number", description: "Max results (default: 10)", default: 10 },
    },
    required: ["owner", "repo"],
  },
};

export async function getRecentCommits(args: {
  owner?: string;
  repo?: string;
  branch?: string;
  limit?: number;
}) {
  const validated = validateOwnerRepo(args);
  if ("error" in validated) {
    return { content: [{ type: "text", text: `Error: ${validated.error}` }], isError: true };
  }
  const { owner, repo } = validated;
  const { branch = "main", limit = 10 } = args;

  try {
    const response = await octokit.repos.listCommits({
      owner, repo,
      sha: branch,
      per_page: limit,
    });

    const commits = response.data.map((commit) => ({
      sha: commit.sha.substring(0, 7),
      full_sha: commit.sha,
      message: commit.commit.message,
      author: commit.commit.author?.name || commit.author?.login || "unknown",
      date: commit.commit.author?.date,
      url: commit.html_url,
    }));

    logToolCall("get_recent_commits", { owner, repo, branch, limit }, "success", `${commits.length} commits`);
    return { content: [{ type: "text", text: JSON.stringify(commits, null, 2) }] };
  } catch (error: any) {
    const message = error.status === 404
      ? `Branch '${branch}' not found in ${owner}/${repo}`
      : `Failed to get commits: ${error.message}`;
    logToolCall("get_recent_commits", { owner, repo, branch, limit }, "error", message);
    return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
  }
}
