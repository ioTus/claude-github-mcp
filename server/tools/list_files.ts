import { octokit, OWNER, REPO, logToolCall } from "../lib/github.js";

export const listFilesSchema = {
  name: "list_files",
  description: "List files and folders at a path in the GitHub repo",
  inputSchema: {
    type: "object" as const,
    properties: {
      path: { type: "string", description: "Directory path (default: root)", default: "" },
      branch: { type: "string", description: "Branch name (default: main)", default: "main" },
    },
  },
};

export async function listFiles(args: { path?: string; branch?: string }) {
  const { path = "", branch = "main" } = args;

  try {
    const response = await octokit.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path,
      ref: branch,
    });

    const data = response.data;
    if (!Array.isArray(data)) {
      logToolCall("list_files", { path, branch }, "error", "Path is a file, not a directory");
      return {
        content: [{ type: "text", text: `Error: '${path}' is a file, not a directory. Use read_file instead.` }],
        isError: true,
      };
    }

    const items = data.map((item) => ({
      name: item.name,
      path: item.path,
      type: item.type === "dir" ? "dir" : "file",
    }));

    logToolCall("list_files", { path, branch }, "success", `${items.length} items`);
    return { content: [{ type: "text", text: JSON.stringify(items, null, 2) }] };
  } catch (error: any) {
    const message = error.status === 404
      ? `Directory not found: '${path}' on branch '${branch}'`
      : `Failed to list files: ${error.message}`;
    logToolCall("list_files", { path, branch }, "error", message);
    return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
  }
}
