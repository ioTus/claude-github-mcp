import { Octokit } from "@octokit/rest";

const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;

if (!token) {
  console.error("FATAL: GITHUB_PERSONAL_ACCESS_TOKEN is not set.");
  console.error("Please set this environment variable with a GitHub PAT that has 'repo' scope.");
  process.exit(1);
}

export const octokit = new Octokit({ auth: token });

export function validateOwnerRepo(args: { owner?: string; repo?: string }): { owner: string; repo: string } | { error: string } {
  if (!args.owner || !args.repo) {
    const missing = [];
    if (!args.owner) missing.push("owner");
    if (!args.repo) missing.push("repo");
    return {
      error: `Missing required parameters: ${missing.join(" and ")} must be provided on every tool call. Example: owner='yourUsername' repo='your-repo-name'`,
    };
  }
  return { owner: args.owner, repo: args.repo };
}

export const ownerRepoParams = {
  owner: { type: "string" as const, description: "GitHub username or organization that owns the repository" },
  repo: { type: "string" as const, description: "Repository name" },
};

export function logToolCall(
  toolName: string,
  params: Record<string, any>,
  result: "success" | "error",
  details?: string
) {
  const timestamp = new Date().toISOString();
  const sanitizedParams = { ...params };
  if (sanitizedParams.token) sanitizedParams.token = "[REDACTED]";
  if (sanitizedParams.content && typeof sanitizedParams.content === "string" && sanitizedParams.content.length > 200) {
    sanitizedParams.content = sanitizedParams.content.substring(0, 200) + "...[truncated]";
  }
  console.log(
    `[${timestamp}] [MCP] ${toolName} | ${result.toUpperCase()} | params=${JSON.stringify(sanitizedParams)}${details ? ` | ${details}` : ""}`
  );
}
