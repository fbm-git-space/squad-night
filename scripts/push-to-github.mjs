/**
 * Push project to GitHub without Git installed.
 * Requires: gh auth login (one-time browser sign-in)
 * Usage: node scripts/push-to-github.mjs [repo-name]
 */
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, posix } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const REPO_NAME = process.argv[2] || "squad-night";
const COMMIT_MESSAGE = process.argv[3] || "Update Squad Night";
const API = "https://api.github.com";

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  "dist",
  ".partykit",
  ".turbo",
  ".git",
  ".tools",
]);

const SKIP_FILES = new Set([".env", ".env.local"]);

function getToken() {
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
  try {
    return execSync("gh auth token", { encoding: "utf8" }).trim();
  } catch {
    console.error(
      "Not logged in. Run: gh auth login\nThen run this script again."
    );
    process.exit(1);
  }
}

async function api(token, path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(
      `GitHub API ${options.method || "GET"} ${path} → ${res.status}: ${data?.message || text}`
    );
  }
  return data;
}

function shouldSkip(relPath) {
  const parts = relPath.split(/[/\\]/);
  if (parts.some((p) => SKIP_DIRS.has(p))) return true;
  const base = parts[parts.length - 1];
  if (SKIP_FILES.has(base)) return true;
  if (base.endsWith(".log")) return true;
  return false;
}

function collectFiles(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    const rel = relative(ROOT, abs);
    if (shouldSkip(rel)) continue;
    const st = statSync(abs);
    if (st.isDirectory()) collectFiles(abs, files);
    else if (st.isFile()) files.push({ abs, rel: rel.replace(/\\/g, "/") });
  }
  return files;
}

async function createBlob(token, owner, repo, content) {
  return api(token, `/repos/${owner}/${repo}/git/blobs`, {
    method: "POST",
    body: JSON.stringify({ content, encoding: "base64" }),
  });
}

async function ensureRepoInitialized(token, owner, repo) {
  try {
    await api(token, `/repos/${owner}/${repo}/git/ref/heads/main`);
    return;
  } catch {
    await api(token, `/repos/${owner}/${repo}/contents/.gitkeep`, {
      method: "PUT",
      body: JSON.stringify({
        message: "Initialize repository",
        content: Buffer.from("").toString("base64"),
      }),
    });
  }
}

async function main() {
  const token = getToken();
  const user = await api(token, "/user");
  const owner = user.login;

  console.log(`Logged in as ${owner}`);
  console.log(`Creating repo: ${owner}/${REPO_NAME}`);

  try {
    await api(token, `/repos/${owner}/${REPO_NAME}`, { method: "GET" });
    console.log("Repo already exists — updating main branch.");
  } catch {
    await api(token, "/user/repos", {
      method: "POST",
      body: JSON.stringify({
        name: REPO_NAME,
        description: "Squad Night — football-themed online party games",
        private: false,
        auto_init: false,
      }),
    });
    console.log("Repo created.");
  }

  await ensureRepoInitialized(token, owner, REPO_NAME);

  const files = collectFiles(ROOT);
  console.log(`Uploading ${files.length} files…`);

  const tree = [];
  for (let i = 0; i < files.length; i++) {
    const { abs, rel } = files[i];
    const buf = readFileSync(abs);
    const content = buf.toString("base64");
    const blob = await createBlob(token, owner, REPO_NAME, content);
    tree.push({ path: rel, mode: "100644", type: "blob", sha: blob.sha });
    if ((i + 1) % 20 === 0 || i === files.length - 1) {
      process.stdout.write(`  ${i + 1}/${files.length}\r`);
    }
  }
  console.log("");

  const treeRes = await api(token, `/repos/${owner}/${REPO_NAME}/git/trees`, {
    method: "POST",
    body: JSON.stringify({ tree }),
  });

  let parentSha;
  try {
    const ref = await api(
      token,
      `/repos/${owner}/${REPO_NAME}/git/ref/heads/main`
    );
    parentSha = ref.object.sha;
  } catch {
    parentSha = undefined;
  }

  const commit = await api(token, `/repos/${owner}/${REPO_NAME}/git/commits`, {
    method: "POST",
    body: JSON.stringify({
      message: COMMIT_MESSAGE,
      tree: treeRes.sha,
      ...(parentSha ? { parents: [parentSha] } : {}),
    }),
  });

  try {
    await api(token, `/repos/${owner}/${REPO_NAME}/git/refs`, {
      method: "POST",
      body: JSON.stringify({ ref: "refs/heads/main", sha: commit.sha }),
    });
  } catch (err) {
    if (!String(err.message).includes("422")) throw err;
    await api(token, `/repos/${owner}/${REPO_NAME}/git/refs/heads/main`, {
      method: "PATCH",
      body: JSON.stringify({ sha: commit.sha, force: true }),
    });
  }

  const url = `https://github.com/${owner}/${REPO_NAME}`;
  console.log(`\nDone! ${url}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
