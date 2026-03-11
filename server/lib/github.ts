import { Octokit } from "@octokit/rest";

const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
const owner = process.env.GITHUB_OWNER;
const repo = process.env.GITHUB_REPO;

if (!token) {
  console.error("FATAL: GITHUB_PERSONAL_ACCESS_TOKEN is not set.");
  console.error("Please set this environment variable with a GitHub PAT that has 'repo' scope.");
  process.exit(1);
}

if (!owner) {
  console.error("FATAL: GITHUB_OWNER is not set. Please set this to your GitHub username or organization.");
  process.exit(1);
}

if (!repo) {
  console.error("FATAL: GITHUB_REPO is not set. Please set this to the target repository name.");
  process.exit(1);
}

export const octokit = new Octokit({ auth: token });
export const OWNER = owner;
export const REPO = repo;

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
