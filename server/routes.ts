import type { Express, Request, Response } from "express";
import { type Server as HttpServer } from "http";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { OWNER, REPO } from "./lib/github.js";

import { readFileSchema, readFile } from "./tools/read_file.js";
import { writeFileSchema, writeFile } from "./tools/write_file.js";
import { pushMultipleFilesSchema, pushMultipleFiles } from "./tools/push_multiple_files.js";
import { listFilesSchema, listFiles } from "./tools/list_files.js";
import { createIssueSchema, createIssue } from "./tools/create_issue.js";
import { updateIssueSchema, updateIssue } from "./tools/update_issue.js";
import { listIssuesSchema, listIssues } from "./tools/list_issues.js";
import { addIssueCommentSchema, addIssueComment } from "./tools/add_issue_comment.js";
import { phase2Stubs } from "./tools/phase2_stubs.js";

const allTools = [
  readFileSchema,
  writeFileSchema,
  pushMultipleFilesSchema,
  listFilesSchema,
  createIssueSchema,
  updateIssueSchema,
  listIssuesSchema,
  addIssueCommentSchema,
  ...phase2Stubs.map((s) => s.schema),
];

const toolHandlers: Record<string, (args: any) => Promise<any>> = {
  read_file: readFile,
  write_file: writeFile,
  push_multiple_files: pushMultipleFiles,
  list_files: listFiles,
  create_issue: createIssue,
  update_issue: updateIssue,
  list_issues: listIssues,
  add_issue_comment: addIssueComment,
};

for (const stub of phase2Stubs) {
  toolHandlers[stub.schema.name] = stub.handler;
}

const transports: Record<string, SSEServerTransport> = {};

export async function registerRoutes(
  httpServer: HttpServer,
  app: Express
): Promise<HttpServer> {
  app.get("/api/status", (_req: Request, res: Response) => {
    res.json({
      status: "running",
      server: "claude-github-mcp",
      version: "1.0.0",
      owner: OWNER,
      repo: REPO,
      tools: allTools.map((t) => ({
        name: t.name,
        description: t.description,
        phase: t.description.startsWith("[Phase 2]") ? 2 : 1,
      })),
      activeSessions: Object.keys(transports).length,
    });
  });

  app.get("/sse", async (req: Request, res: Response) => {
    console.log(`[${new Date().toISOString()}] [MCP] New SSE connection request`);

    const mcpServer = new Server(
      { name: "claude-github-mcp", version: "1.0.0" },
      { capabilities: { tools: {} } }
    );

    mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
      return { tools: allTools };
    });

    mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const handler = toolHandlers[name];
      if (!handler) {
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
      }
      try {
        return await handler(args || {});
      } catch (error: any) {
        console.error(`[${new Date().toISOString()}] [MCP] Unhandled error in tool '${name}':`, error);
        return {
          content: [{ type: "text", text: `Internal error in tool '${name}': ${error.message}` }],
          isError: true,
        };
      }
    });

    const transport = new SSEServerTransport("/messages", res);
    transports[transport.sessionId] = transport;

    transport.onclose = () => {
      console.log(`[${new Date().toISOString()}] [MCP] SSE session closed: ${transport.sessionId}`);
      delete transports[transport.sessionId];
    };

    await mcpServer.connect(transport);
    console.log(`[${new Date().toISOString()}] [MCP] SSE session started: ${transport.sessionId}`);
  });

  app.post("/messages", async (req: Request, res: Response) => {
    const sessionId = req.query.sessionId as string;
    const transport = transports[sessionId];

    if (!transport) {
      res.status(400).json({ error: "Invalid or expired session ID" });
      return;
    }

    await transport.handlePostMessage(req, res);
  });

  return httpServer;
}
