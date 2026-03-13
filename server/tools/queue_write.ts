import { validateOwnerRepo, ownerRepoParams, logToolCall } from "../lib/github.js";

const writeQueue: Map<string, Map<string, string>> = new Map();

export function getWriteQueue(): Map<string, Map<string, string>> {
  return writeQueue;
}

export const queueWriteSchema = {
  name: "queue_write",
  description: "Queue a file write for batch commit. Writes are held in server memory and flushed together when flush_queue is called. Queue resets if the server restarts.",
  inputSchema: {
    type: "object" as const,
    properties: {
      ...ownerRepoParams,
      path: { type: "string", description: "File path" },
      content: { type: "string", description: "File content" },
    },
    required: ["owner", "repo", "path", "content"],
  },
};

export async function queueWrite(args: {
  owner?: string;
  repo?: string;
  path: string;
  content: string;
}) {
  const validated = validateOwnerRepo(args);
  if ("error" in validated) {
    return { content: [{ type: "text", text: `Error: ${validated.error}` }], isError: true };
  }
  const { owner, repo } = validated;
  const { path, content } = args;

  const key = `${owner}/${repo}`;
  if (!writeQueue.has(key)) {
    writeQueue.set(key, new Map());
  }

  const repoQueue = writeQueue.get(key)!;
  const wasReplaced = repoQueue.has(path);
  repoQueue.set(path, content);

  logToolCall("queue_write", { owner, repo, path }, "success", `queued (${repoQueue.size} pending)`);
  return {
    content: [
      {
        type: "text",
        text: `✅ Writing to: ${owner}/${repo}\nQueued ✓ — ${repoQueue.size} write${repoQueue.size === 1 ? "" : "s"} pending for ${owner}/${repo}.${wasReplaced ? `\n(Previous content for '${path}' was replaced — last-write-wins.)` : ""}\nCall flush_queue to commit.\n⚠️ Note: queue resets if the server restarts.`,
      },
    ],
  };
}
