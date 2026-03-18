import { execSync } from "child_process";

const EXPECTED_REPO = "ioTus/gitbridge-mcp";

interface CheckResult {
  name: string;
  passed: boolean;
  detail: string;
}

const results: CheckResult[] = [];

function check(name: string, fn: () => { passed: boolean; detail: string }) {
  try {
    const result = fn();
    results.push({ name, ...result });
  } catch (err: any) {
    results.push({ name, passed: false, detail: err.message || String(err) });
  }
}

check("Git remote configured", () => {
  const output = execSync("git remote -v 2>&1", { encoding: "utf8" });
  const originLine = output
    .split("\n")
    .find((l) => l.startsWith("origin") && l.includes("(fetch)"));
  if (!originLine) {
    return {
      passed: false,
      detail: `No 'origin' remote found. Replit↔GitHub sync may be broken. See docs or Issue #19 for recovery steps.`,
    };
  }
  const hasRepo = originLine.includes(EXPECTED_REPO);
  return {
    passed: hasRepo,
    detail: hasRepo
      ? `origin → ${EXPECTED_REPO}`
      : `origin exists but points elsewhere: ${originLine.trim()}`,
  };
});

check("GITHUB_PERSONAL_ACCESS_TOKEN set", () => {
  const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
  if (!token) {
    return { passed: false, detail: "Environment variable is not set" };
  }
  return {
    passed: true,
    detail: `Set (${token.length} chars, starts with ${token.slice(0, 4)}...)`,
  };
});

check("GITHUB_PERSONAL_ACCESS_TOKEN valid", () => {
  const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
  if (!token) {
    return { passed: false, detail: "Skipped — token not set" };
  }
  const output = execSync(
    `curl -s -o /dev/null -w "%{http_code}" -H "Authorization: token ${token}" https://api.github.com/user`,
    { encoding: "utf8" },
  );
  const code = output.trim();
  return {
    passed: code === "200",
    detail:
      code === "200"
        ? "GitHub API returned 200 — token is valid"
        : `GitHub API returned ${code} — token may be expired or invalid`,
  };
});

check("GitHub repo accessible", () => {
  const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
  if (!token) {
    return { passed: false, detail: "Skipped — token not set" };
  }
  const output = execSync(
    `curl -s -o /dev/null -w "%{http_code}" -H "Authorization: token ${token}" https://api.github.com/repos/${EXPECTED_REPO}`,
    { encoding: "utf8" },
  );
  const code = output.trim();
  return {
    passed: code === "200",
    detail:
      code === "200"
        ? `${EXPECTED_REPO} is accessible`
        : `Got HTTP ${code} — repo may not exist or token lacks access`,
  };
});

check("OAUTH_CLIENT_ID set", () => {
  const val = process.env.OAUTH_CLIENT_ID;
  return {
    passed: !!val,
    detail: val ? `Set (${val.length} chars)` : "Environment variable is not set",
  };
});

check("OAUTH_CLIENT_SECRET set", () => {
  const val = process.env.OAUTH_CLIENT_SECRET;
  return {
    passed: !!val,
    detail: val ? `Set (${val.length} chars)` : "Environment variable is not set",
  };
});

check("Server reachable", () => {
  const url =
    process.env.REPLIT_DOMAINS
      ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}/api/status`
      : "http://localhost:5000/api/status";
  try {
    const output = execSync(
      `curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${url}"`,
      { encoding: "utf8" },
    );
    const code = output.trim();
    return {
      passed: code === "200",
      detail:
        code === "200"
          ? `${url} returned 200`
          : `${url} returned ${code} — server may not be running`,
    };
  } catch {
    return { passed: false, detail: `Could not reach ${url} — server may not be running` };
  }
});

console.log("\n=== GitBridge MCP — Setup Validation ===\n");

let failures = 0;
for (const r of results) {
  const icon = r.passed ? "✅" : "❌";
  if (!r.passed) failures++;
  console.log(`${icon}  ${r.name}`);
  console.log(`   ${r.detail}\n`);
}

console.log("---");
if (failures === 0) {
  console.log("All checks passed.\n");
} else {
  console.log(`${failures} check(s) failed. See above for details.\n`);
}

process.exit(failures > 0 ? 1 : 0);
