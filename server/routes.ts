import type { Express, Request, Response } from "express";
import { type Server as HttpServer } from "http";
import { randomUUID } from "crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
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

function createMcpServer(): Server {
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

  return mcpServer;
}

const ALLOWED_ORIGINS = [
  "https://claude.ai",
  "https://www.claude.ai",
  "https://claude.com",
  "https://www.claude.com",
];

function setCorsHeaders(res: Response, origin?: string): boolean {
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, Authorization, Mcp-Session-Id");
  res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
  res.setHeader("Vary", "Origin");
  return true;
}

const sseTransports: Record<string, SSEServerTransport> = {};
const streamableTransports: Record<string, StreamableHTTPServerTransport> = {};

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
      activeSessions: Object.keys(sseTransports).length + Object.keys(streamableTransports).length,
    });
  });

  app.options("/mcp", (req: Request, res: Response) => {
    setCorsHeaders(res, req.headers.origin);
    res.status(204).end();
  });

  app.post("/mcp", async (req: Request, res: Response) => {
    setCorsHeaders(res, req.headers.origin);

    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (sessionId && streamableTransports[sessionId]) {
      console.log(`[${new Date().toISOString()}] [MCP] Streamable HTTP POST (existing session: ${sessionId})`);
      const transport = streamableTransports[sessionId];
      await transport.handleRequest(req, res, req.body);
      return;
    }

    if (sessionId && !streamableTransports[sessionId]) {
      res.status(404).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Session not found. Send an initialize request first." },
        id: null,
      });
      return;
    }

    console.log(`[${new Date().toISOString()}] [MCP] Streamable HTTP POST (new session)`);

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
    });

    const mcpServer = createMcpServer();

    transport.onclose = () => {
      const sid = transport.sessionId;
      if (sid) {
        console.log(`[${new Date().toISOString()}] [MCP] Streamable session closed: ${sid}`);
        delete streamableTransports[sid];
      }
    };

    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, req.body);

    if (transport.sessionId) {
      streamableTransports[transport.sessionId] = transport;
      console.log(`[${new Date().toISOString()}] [MCP] Streamable session started: ${transport.sessionId}`);
    }
  });

  app.get("/mcp", async (req: Request, res: Response) => {
    setCorsHeaders(res, req.headers.origin);
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (!sessionId || !streamableTransports[sessionId]) {
      res.status(400).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Invalid or missing session ID. Send an initialize request via POST first." },
        id: null,
      });
      return;
    }

    console.log(`[${new Date().toISOString()}] [MCP] Streamable HTTP GET (SSE stream) for session: ${sessionId}`);
    const transport = streamableTransports[sessionId];
    await transport.handleRequest(req, res);
  });

  app.delete("/mcp", async (req: Request, res: Response) => {
    setCorsHeaders(res, req.headers.origin);
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (!sessionId || !streamableTransports[sessionId]) {
      res.status(400).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Invalid or missing session ID" },
        id: null,
      });
      return;
    }

    console.log(`[${new Date().toISOString()}] [MCP] Streamable HTTP DELETE for session: ${sessionId}`);
    const transport = streamableTransports[sessionId];
    await transport.handleRequest(req, res);
    delete streamableTransports[sessionId];
  });

  app.options("/sse", (req: Request, res: Response) => {
    setCorsHeaders(res, req.headers.origin);
    res.status(204).end();
  });

  app.options("/messages", (req: Request, res: Response) => {
    setCorsHeaders(res, req.headers.origin);
    res.status(204).end();
  });

  app.get("/sse", async (req: Request, res: Response) => {
    setCorsHeaders(res, req.headers.origin);
    console.log(`[${new Date().toISOString()}] [MCP] New SSE connection request`);

    const mcpServer = createMcpServer();
    const transport = new SSEServerTransport("/messages", res);
    sseTransports[transport.sessionId] = transport;

    transport.onclose = () => {
      console.log(`[${new Date().toISOString()}] [MCP] SSE session closed: ${transport.sessionId}`);
      delete sseTransports[transport.sessionId];
    };

    await mcpServer.connect(transport);
    console.log(`[${new Date().toISOString()}] [MCP] SSE session started: ${transport.sessionId}`);
  });

  app.post("/messages", async (req: Request, res: Response) => {
    setCorsHeaders(res, req.headers.origin);
    const sessionId = req.query.sessionId as string;
    const transport = sseTransports[sessionId];

    if (!transport) {
      res.status(400).json({ error: "Invalid or expired session ID" });
      return;
    }

    await transport.handlePostMessage(req, res);
  });

  return httpServer;
}
