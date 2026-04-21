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

async function fetchRepo(owner, repo) {
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;

  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`GitHub API returned ${response.status} for ${owner}/${repo}`);
  }

  return pick(await response.json());
}

async function main() {
  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const results = await Promise.allSettled(
    config.map(async (entry) => {
      const [owner, repo] = entry.split('/');
      const data = await fetchRepo(owner, repo);
      console.log(`✓ ${entry}`);
      return data;
    }),
  );

  const failures = results.filter((r) => r.status === 'rejected');
  failures.forEach((r) => console.error('✗', r.reason.message));

  const repos = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  const outPath = join(OUTPUT_DIR, 'repos.json');
  writeFileSync(outPath, JSON.stringify(repos, null, 2));
  console.log(`\n${repos.length} repos → ${outPath}`);

  if (failures.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
