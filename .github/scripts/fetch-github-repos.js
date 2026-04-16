/**
 * Fetches repository data from the GitHub API for each entry in repos-config.json
 * and writes the result to data/github-repos/{username}.json.
 *
 * Intended to be run by the sync-github-repos GitHub Actions workflow, but can
 * also be run locally to populate data for development:
 *
 *   GITHUB_TOKEN=<token> node .github/scripts/fetch-github-repos.js
 */

const { readFileSync, mkdirSync, writeFileSync } = require('fs');
const { join } = require('path');

const CONFIG_PATH = join(__dirname, 'repos-config.json');
const OUTPUT_DIR = join(__dirname, '../../data/github-repos');

/** Fields the github-repos block actually uses — keeps JSON files small. */
const PICK_FIELDS = [
  'name',
  'html_url',
  'description',
  'language',
  'stargazers_count',
  'forks_count',
  'topics',
];

function pick(repo) {
  return PICK_FIELDS.reduce((acc, key) => {
    acc[key] = repo[key] ?? null;
    return acc;
  }, {});
}

async function fetchRepos(username, type) {
  const base = type === 'org'
    ? `https://api.github.com/orgs/${encodeURIComponent(username)}/repos`
    : `https://api.github.com/users/${encodeURIComponent(username)}/repos`;

  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(
    `${base}?per_page=100&sort=updated&direction=desc`,
    { headers },
  );

  if (!response.ok) {
    throw new Error(`GitHub API returned ${response.status} for ${username}`);
  }

  return (await response.json()).map(pick);
}

async function main() {
  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const results = await Promise.allSettled(
    config.map(async ({ username, type }) => {
      const repos = await fetchRepos(username, type || 'user');
      const outPath = join(OUTPUT_DIR, `${username}.json`);
      writeFileSync(outPath, JSON.stringify(repos, null, 2));
      console.log(`✓ ${username}: ${repos.length} repos → ${outPath}`);
    }),
  );

  const failures = results.filter((r) => r.status === 'rejected');
  failures.forEach((r) => console.error('✗', r.reason.message));
  if (failures.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
