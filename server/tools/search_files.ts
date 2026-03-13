import { octokit, validateOwnerRepo, ownerRepoParams, logToolCall } from "../lib/github.js";

export const searchFilesSchema = {
  name: "search_files",
  description: "Search file contents across a GitHub repository using GitHub Code Search",
  inputSchema: {
    type: "object" as const,
    properties: {
      ...ownerRepoParams,
      query: { type: "string", description: "Search terms" },
      path: { type: "string", description: "Limit search to a specific folder (e.g. 'src/tools')" },
      extension: { type: "string", description: "Limit to file type (e.g. 'md', 'ts', 'js')" },
    },
    required: ["owner", "repo", "query"],
  },
};

export async function searchFiles(args: {
  owner?: string;
  repo?: string;
  query: string;
  path?: string;
  extension?: string;
}) {
  const validated = validateOwnerRepo(args);
  if ("error" in validated) {
    return { content: [{ type: "text", text: `Error: ${validated.error}` }], isError: true };
  }
  const { owner, repo } = validated;
  const { query, path, extension } = args;

  try {
    let searchQuery = `${query} repo:${owner}/${repo}`;
    if (path) searchQuery += ` path:${path}`;
    if (extension) searchQuery += ` extension:${extension}`;

    const response = await octokit.rest.search.code({
      q: searchQuery,
      per_page: 20,
      headers: {
        accept: "application/vnd.github.text-match+json",
      },
    });

    const results = response.data.items.map((item: any) => ({
      path: item.path,
      url: item.html_url,
      text_matches: item.text_matches?.map((match: any) => ({
        fragment: match.fragment,
      })) || [],
    }));

    logToolCall("search_files", { owner, repo, query, path, extension }, "success", `${results.length} results`);

    if (results.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No results found for "${query}" in ${owner}/${repo}.\nNote: GitHub Code Search requires the repository to be indexed. Recently created repos or recently pushed files may have a delay before they're searchable.`,
          },
        ],
      };
    }

    return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
  } catch (error: any) {
    if (error.status === 403) {
      const message = "GitHub Code Search API rate limit exceeded (10 requests/minute for authenticated users). Please wait a moment and try again.";
      logToolCall("search_files", { owner, repo, query }, "error", message);
      return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
    }
    const message = `Failed to search files: ${error.message}`;
    logToolCall("search_files", { owner, repo, query }, "error", message);
    return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
  }
}
