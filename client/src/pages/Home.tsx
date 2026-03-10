import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  GitBranch,
  FileText,
  CircleDot,
  CheckCircle2,
  Clock,
  Server,
  Link2,
  Copy,
  ExternalLink,
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
  owner: string;
  repo: string;
  tools: ToolInfo[];
  activeSessions: number;
}

export default function Home() {
  const { toast } = useToast();

  const { data, isLoading, error } = useQuery<StatusData>({
    queryKey: ["/api/status"],
    refetchInterval: 10000,
  });

  const sseUrl = typeof window !== "undefined"
    ? `${window.location.origin}/sse`
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
          </div>
          <p className="text-muted-foreground">
            MCP bridge server connecting Claude Chat to GitHub via the Model Context Protocol.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card data-testid="card-repo">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <SiGithub className="w-4 h-4" />
                <span>Repository</span>
              </div>
              <a
                href={`https://github.com/${data?.owner}/${data?.repo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground flex items-center gap-1"
                data-testid="link-repo"
              >
                {data?.owner}/{data?.repo}
                <ExternalLink className="w-3 h-3 text-muted-foreground" />
              </a>
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

        <Card data-testid="card-endpoint">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">SSE Endpoint</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted px-3 py-2 rounded-md text-sm font-mono break-all" data-testid="text-sse-url">
                {sseUrl}
              </code>
              <Button
                size="icon"
                variant="outline"
                onClick={() => copyToClipboard(sseUrl)}
                data-testid="button-copy-url"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Use this URL when configuring Claude.ai custom MCP connector.
            </p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Phase 1 Tools (Active)</h2>

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
              Issues Tools
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
        </div>

        <Separator />

        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            Phase 2 Roadmap
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

        <Separator />

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Quick Setup</h2>
          <div className="space-y-3">
            {[
              "Create a GitHub Personal Access Token with 'repo' scope",
              "Set GITHUB_PERSONAL_ACCESS_TOKEN, GITHUB_OWNER, and GITHUB_REPO in environment",
              "Deploy this server on Replit (click Run)",
              "Copy the SSE endpoint URL above",
              "Go to claude.ai > Settings > Connectors > Add custom connector",
              "Paste the URL — Claude discovers all tools automatically",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center">
                  {i + 1}
                </span>
                <p className="text-sm pt-0.5" data-testid={`text-step-${i + 1}`}>{step}</p>
              </div>
            ))}
          </div>
        </div>

        <Card className="bg-muted/50">
          <CardContent className="pt-5 pb-4">
            <pre className="text-xs font-mono text-muted-foreground whitespace-pre leading-relaxed" data-testid="text-architecture">
{`  Claude Chat (claude.ai)
    ↕ custom MCP connector
  MCP Bridge Server (Replit)
    ↕ GitHub API (Octokit)
  GitHub Repo (files + Issues + Projects)`}
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
