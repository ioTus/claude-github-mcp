import { validateOwnerRepo, ownerRepoParams, logToolCall } from "../lib/github.js";

interface QueueEntry {
  content: string;
  branch: string;
}

const writeQueue: Map<string, Map<string, QueueEntry>> = new Map();

export function getWriteQueue(): Map<string, Map<string, QueueEntry>> {
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
      branch: { type: "string", description: "Branch name (default: main)", default: "main" },
    },
    required: ["owner", "repo", "path", "content"],
  },
};

export async function queueWrite(args: {
  owner?: string;
  repo?: string;
  path: string;
  content: string;
  branch?: string;
}) {
  const validated = validateOwnerRepo(args);
  if ("error" in validated) {
    return { content: [{ type: "text", text: `Error: ${validated.error}` }], isError: true };
  }
  const { owner, repo } = validated;
  const { path, content, branch = "main" } = args;

  const key = `${owner}/${repo}/${branch}`;
  if (!writeQueue.has(key)) {
    writeQueue.set(key, new Map());
  }

  const repoQueue = writeQueue.get(key)!;
  const wasReplaced = repoQueue.has(path);
  repoQueue.set(path, { content, branch });

  logToolCall("queue_write", { owner, repo, path, branch }, "success", `queued (${repoQueue.size} pending)`);
  return {
    content: [
      {
        type: "text",
        text: `✅ Writing to: ${owner}/${repo}\nQueued ✓ — ${repoQueue.size} write${repoQueue.size === 1 ? "" : "s"} pending for ${owner}/${repo} (branch: ${branch}).${wasReplaced ? `\n(Previous content for '${path}' was replaced — last-write-wins.)` : ""}\nCall flush_queue to commit.\n⚠️ Note: queue resets if the server restarts.`,
      },
    ],
  };
}
