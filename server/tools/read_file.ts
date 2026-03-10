import { octokit, OWNER, REPO, logToolCall } from "../lib/github.js";

export const readFileSchema = {
  name: "read_file",
  description: "Read the contents of a file from the GitHub repo",
  inputSchema: {
    type: "object" as const,
    properties: {
      path: { type: "string", description: "File path in the repo" },
      branch: { type: "string", description: "Branch name (default: main)", default: "main" },
    },
    required: ["path"],
  },
};

export async function readFile(args: { path: string; branch?: string }) {
  const { path, branch = "main" } = args;
  try {
    const response = await octokit.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path,
      ref: branch,
    });

    const data = response.data;
    if (Array.isArray(data)) {
      logToolCall("read_file", { path, branch }, "error", "Path is a directory, not a file");
      return { content: [{ type: "text", text: `Error: '${path}' is a directory, not a file. Use list_files instead.` }], isError: true };
    }

    if (data.type !== "file" || !("content" in data)) {
      logToolCall("read_file", { path, branch }, "error", "Not a file");
      return { content: [{ type: "text", text: `Error: '${path}' is not a readable file.` }], isError: true };
    }

    const content = Buffer.from(data.content, "base64").toString("utf-8");
    logToolCall("read_file", { path, branch }, "success", `${content.length} chars`);
    return { content: [{ type: "text", text: content }] };
  } catch (error: any) {
    const message = error.status === 404
      ? `File not found: '${path}' on branch '${branch}'`
      : `Failed to read file: ${error.message}`;
    logToolCall("read_file", { path, branch }, "error", message);
    return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
  }
}
