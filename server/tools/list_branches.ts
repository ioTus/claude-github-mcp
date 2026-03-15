import { octokit, validateOwnerRepo, ownerRepoParams, logToolCall } from "../lib/github.js";

export const listBranchesSchema = {
  name: "list_branches",
  category: "branch",
  description: "List all branches in a GitHub repository",
  inputSchema: {
    type: "object" as const,
    properties: {
      ...ownerRepoParams,
      limit: { type: "number", description: "Max results to return (default: 30)", default: 30 },
    },
    required: ["owner", "repo"],
  },
};

export async function listBranches(args: {
  owner?: string;
  repo?: string;
  limit?: number;
}) {
  const validated = validateOwnerRepo(args);
  if ("error" in validated) {
    return { content: [{ type: "text", text: `Error: ${validated.error}` }], isError: true };
  }
  const { owner, repo } = validated;
  const limit = Math.max(1, Math.min(100, Math.floor(args.limit ?? 30)));

  try {
    const repoData = await octokit.repos.get({ owner, repo });
    const defaultBranch = repoData.data.default_branch;

    const response = await octokit.repos.listBranches({
      owner,
      repo,
      per_page: limit,
    });

    const branches = response.data.map((branch) => ({
      name: branch.name,
      sha: branch.commit.sha.slice(0, 7),
      protected: branch.protected,
      default: branch.name === defaultBranch,
    }));

    logToolCall("list_branches", { owner, repo, limit }, "success", `${branches.length} branches`);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(branches, null, 2),
        },
      ],
    };
  } catch (error: any) {
    const message = `Failed to list branches: ${error.message}`;
    logToolCall("list_branches", { owner, repo, limit }, "error", message);
    return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
  }
}
