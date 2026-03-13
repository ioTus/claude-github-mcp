import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  CircleDot,
  CheckCircle2,
  Clock,
  Server,
  Link2,
  Copy,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Search,
  FolderSync,
  Trash2,
  Layers,
  GitCommitHorizontal,
} from "lucide-react";
import { SiGithub } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ToolInfo {
  name: string;
  description: string;
  phase: number;
}

interface StatusData {
  status: string;
  server: string;
  version: string;
  mode: string;
  authEnabled: boolean;
  authMode: "oauth" | "open";
  oauthClientId: string | null;
  mcpPath: string;
  ssePath: string;
  authorizeEndpoint: string | null;
  tokenEndpoint: string | null;
  tools: ToolInfo[];
  activeSessions: number;
}

export default function Home() {
  const { toast } = useToast();

  const { data, isLoading, error } = useQuery<StatusData>({
    queryKey: ["/api/status"],
    refetchInterval: 10000,
  });

  const mcpUrl = typeof window !== "undefined" && data?.mcpPath
    ? `${window.location.origin}${data.mcpPath}`
    : "";

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard", description: text });
  }

  const phase1Tools = data?.tools.filter((t) => t.phase === 1) || [];
  const phase2Tools = data?.tools.filter((t) => t.phase === 2) || [];

  const fileTools = phase1Tools.filter((t) =>
    ["read_file", "write_file", "push_multiple_files", "list_files"].includes(t.name)
  );
  const issueTools = phase1Tools.filter((t) =>
    ["create_issue", "update_issue", "list_issues", "add_issue_comment"].includes(t.name)
  );
  const searchTools = phase1Tools.filter((t) =>
    ["search_files", "get_recent_commits"].includes(t.name)
  );
  const advancedTools = phase1Tools.filter((t) =>
    ["move_file", "delete_file", "queue_write", "flush_queue"].includes(t.name)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="loading-state">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Connecting to server...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="error-state">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive font-medium">Failed to connect to server</p>
            <p className="text-sm text-muted-foreground mt-1">{(error as Error).message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-server-name">
              claude-github-mcp
            </h1>
            <Badge variant="secondary" data-testid="badge-version">v{data?.version}</Badge>
            <Badge
              variant={data?.status === "running" ? "default" : "destructive"}
              data-testid="badge-status"
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              {data?.status}
            </Badge>
            <Badge variant="outline" data-testid="badge-mode">
              <SiGithub className="w-3 h-3 mr-1" />
              {data?.mode}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            MCP bridge server connecting Claude Chat to any GitHub repository via the Model Context Protocol.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card data-testid="card-mode">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <SiGithub className="w-4 h-4" />
                <span>Mode</span>
              </div>
              <span className="font-medium text-foreground" data-testid="text-mode">
                Multi-repo (owner/repo per tool call)
              </span>
            </CardContent>
          </Card>

          <Card data-testid="card-tools-count">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Server className="w-4 h-4" />
                <span>Tools Registered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{phase1Tools.length} active</span>
                <span className="text-muted-foreground">/</span>
                <span className="text-muted-foreground">{phase2Tools.length} planned</span>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-sessions">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Link2 className="w-4 h-4" />
                <span>Active Sessions</span>
              </div>
              <span className="font-medium text-foreground" data-testid="text-sessions">
                {data?.activeSessions}
              </span>
            </CardContent>
          </Card>
        </div>

        <Card data-testid="card-auth">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              {data?.authMode === "oauth" ? (
                <>
                  <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm" data-testid="text-auth-status">OAuth 2.0 authenticated</p>
                    <p className="text-xs text-muted-foreground">
                      All MCP endpoints are protected with OAuth 2.0. See the connection details below to set up Claude.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm" data-testid="text-auth-status">No authentication</p>
                    <p className="text-xs text-muted-foreground">
                      MCP endpoints are open to anyone. Set OAUTH_CLIENT_ID + OAUTH_CLIENT_SECRET to enable OAuth 2.0 authentication.
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-connect" className="border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="w-4 h-4" />
              Connect to Claude
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Go to <strong>claude.ai &rarr; Settings &rarr; Connectors &rarr; Add custom connector</strong>, then fill in the fields below.
            </p>
          </CardHeader>
          <CardContent className="space-y-4" data-testid="text-setup-steps">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Name</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted px-3 py-2 rounded-md text-sm font-mono" data-testid="text-connector-name">GitHub MCP</code>
                <Button size="icon" variant="outline" onClick={() => copyToClipboard("GitHub MCP")} data-testid="button-copy-name">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Remote MCP server URL</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted px-3 py-2 rounded-md text-sm font-mono break-all" data-testid="text-mcp-url">{mcpUrl}</code>
                <Button size="icon" variant="outline" onClick={() => copyToClipboard(mcpUrl)} data-testid="button-copy-mcp-url">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {data?.authMode === "oauth" && (
              <>
                <Separator />
                <p className="text-xs text-muted-foreground">Expand <strong>Advanced settings</strong> in the Claude connector form to see these fields.</p>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">OAuth Client ID</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-muted px-3 py-2 rounded-md text-sm font-mono break-all" data-testid="text-oauth-client-id">{data.oauthClientId}</code>
                    <Button size="icon" variant="outline" onClick={() => copyToClipboard(data.oauthClientId || "")} data-testid="button-copy-client-id">
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">OAuth Client Secret</label>
                  <div className="bg-muted/60 border border-border rounded-md px-3 py-2.5 text-xs text-muted-foreground space-y-1" data-testid="text-oauth-secret-hint">
                    <p>Open the <strong>Secrets</strong> panel in Replit (lock icon), find <code className="bg-background px-1 rounded font-mono">OAUTH_CLIENT_SECRET</code>, and copy its value into this field.</p>
                  </div>
                </div>
              </>
            )}

            <Separator />
            <p className="text-xs text-muted-foreground">
              Click <strong>Add</strong> — Claude will automatically discover all OAuth endpoints and tools via the server's metadata.
            </p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Active Tools</h2>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="w-4 h-4" />
              File Tools
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {fileTools.map((tool) => (
                <Card key={tool.name} data-testid={`card-tool-${tool.name}`}>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-sm font-mono font-medium">{tool.name}</code>
                      <Badge variant="outline" className="text-xs no-default-active-elevate">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-green-600 dark:text-green-400" />
                        active
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{tool.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CircleDot className="w-4 h-4" />
              Issue Tools
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {issueTools.map((tool) => (
                <Card key={tool.name} data-testid={`card-tool-${tool.name}`}>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-sm font-mono font-medium">{tool.name}</code>
                      <Badge variant="outline" className="text-xs no-default-active-elevate">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-green-600 dark:text-green-400" />
                        active
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{tool.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Search className="w-4 h-4" />
              Search & History
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {searchTools.map((tool) => (
                <Card key={tool.name} data-testid={`card-tool-${tool.name}`}>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-sm font-mono font-medium">{tool.name}</code>
                      <Badge variant="outline" className="text-xs no-default-active-elevate">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-green-600 dark:text-green-400" />
                        active
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{tool.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Advanced (Move, Delete, Batch)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {advancedTools.map((tool) => (
                <Card key={tool.name} data-testid={`card-tool-${tool.name}`}>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-sm font-mono font-medium">{tool.name}</code>
                      <Badge variant="outline" className="text-xs no-default-active-elevate">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-green-600 dark:text-green-400" />
                        active
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{tool.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {phase2Tools.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                Roadmap
                <Badge variant="secondary" className="no-default-active-elevate">
                  <Clock className="w-3 h-3 mr-1" />
                  coming soon
                </Badge>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {phase2Tools.map((tool) => (
                  <Card key={tool.name} className="opacity-60" data-testid={`card-tool-${tool.name}`}>
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-sm font-mono font-medium">{tool.name}</code>
                        <Badge variant="secondary" className="text-xs no-default-active-elevate">
                          <Clock className="w-3 h-3 mr-1" />
                          stub
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {tool.description.replace("[Phase 2] ", "")}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}

        <Separator />

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Initial Setup</h2>
          <p className="text-sm text-muted-foreground">
            Prerequisites before connecting Claude (one-time setup):
          </p>
          <div className="space-y-3">
            {[
              "Create a GitHub Personal Access Token with 'repo' scope",
              "Set GITHUB_PERSONAL_ACCESS_TOKEN in the Secrets tab",
              "Set OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET in the Secrets tab for authentication",
              "Deploy this server (click Run in Replit)",
              "Create a Claude Project with a system prompt that locks Claude to your owner/repo",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center">
                  {i + 1}
                </span>
                <p className="text-sm pt-0.5" data-testid={`text-step-${i + 1}`}>{step}</p>
              </div>
            ))}
          </div>

          <Card className="bg-muted/50 mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Example Claude Project System Prompt</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed" data-testid="text-system-prompt-template">
{`You are working exclusively in the GitHub repository:
owner=YOUR_USERNAME repo=YOUR_REPO

Pass these values on every tool call to the GitHub MCP bridge.
Never write to any other repository regardless of what the user asks.
If asked to work in a different repo, tell the user to switch to
the appropriate Claude Project for that repository.

At the start of each session:
1. Call list_files to confirm you can reach the repo
2. Ask the user what they want to work on`}
              </pre>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-muted/50">
          <CardContent className="pt-5 pb-4">
            <pre className="text-xs font-mono text-muted-foreground whitespace-pre leading-relaxed" data-testid="text-architecture">
{`  Claude Chat (claude.ai)
    ↕ custom MCP connector (OAuth 2.0)
  MCP Bridge Server (Replit) — multi-repo mode
    ↕ GitHub API (Octokit)
  Any GitHub Repo (files + Issues)`}
            </pre>
          </CardContent>
        </Card>

        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">
            MIT License &middot; claude-github-mcp v{data?.version}
          </p>
        </div>
      </div>
    </div>
  );
}
