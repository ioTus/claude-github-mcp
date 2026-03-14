import { octokit, logToolCall } from "../lib/github.js";

export const createRepoSchema = {
  name: "create_repo",
  description: "Create a new GitHub repository on a personal account or within an organization",
  inputSchema: {
    type: "object" as const,
    properties: {
      name: { type: "string", description: "Repository name (no spaces; use hyphens)" },
      org: {
        type: "string",
        description: "Organization name. If omitted, the repo is created on the authenticated user's personal account.",
      },
      description: { type: "string", description: "Short description of the repository" },
      private: {
        type: "boolean",
        description: "Whether the repository is private (default: true)",
      },
      auto_init: {
        type: "boolean",
        description: "Initialize with an empty README (default: false). Set to true if you want to write files immediately after creation.",
      },
    },
    required: ["name"],
  },
};

export async function createRepo(args: {
  name: string;
  org?: string;
  description?: string;
  private?: boolean;
  auto_init?: boolean;
}) {
  const { name, org, description, auto_init = false } = args;
  const isPrivate = args.private !== false;

  try {
    let repoData: Awaited<ReturnType<typeof octokit.repos.createForAuthenticatedUser>>["data"];

    if (org) {
      const response = await octokit.repos.createInOrg({
        org,
        name,
        description,
        private: isPrivate,
        auto_init,
      });
      repoData = response.data as typeof repoData;
    } else {
      const response = await octokit.repos.createForAuthenticatedUser({
        name,
        description,
        private: isPrivate,
        auto_init,
      });
      repoData = response.data;
    }

    const target = org ? `${org}/${name}` : repoData.full_name;
    logToolCall("create_repo", { name, org, private: isPrivate }, "success", target);

    return {
      content: [
        {
          type: "text",
          text: [
            `✅ Writing to: ${repoData.full_name}`,
            `Repository created successfully.`,
            ``,
            `Full name:      ${repoData.full_name}`,
            `URL:            ${repoData.html_url}`,
            `Clone URL:      ${repoData.clone_url}`,
            `Default branch: ${repoData.default_branch}`,
            `Visibility:     ${repoData.private ? "private" : "public"}`,
            ``,
            `You can now write files to this repo using write_file or push_multiple_files with owner="${repoData.owner.login}" repo="${repoData.name}".`,
          ].join("\n"),
        },
      ],
    };
  } catch (error: any) {
    let message: string;

    if (error.status === 422) {
      message = `Repository name "${name}" is already taken${org ? ` in org "${org}"` : " on this account"}. Choose a different name.`;
    } else if (error.status === 403) {
      message = `Permission denied. Ensure your GitHub PAT has the 'repo' scope (for private repos) or 'public_repo' scope (for public repos).${org ? ` For org repos, the PAT also needs the 'admin:org' or appropriate org-level permission.` : ""}`;
    } else if (error.status === 401) {
      message = `Authentication failed. Check that GITHUB_PERSONAL_ACCESS_TOKEN is valid and not expired.`;
    } else {
      message = `Failed to create repository: ${error.message}`;
    }

    logToolCall("create_repo", { name, org }, "error", message);
    return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
  }
}
