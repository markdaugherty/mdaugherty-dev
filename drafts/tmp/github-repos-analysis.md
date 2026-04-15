# github-repos Block — Analysis

## Task Description

Build a new `github-repos` block that fetches repositories from the GitHub REST API for a configured user or organization and renders each as a card.

## Requirements

### Author Inputs

| Field | Required | Notes |
|---|---|---|
| GitHub username or org name | Yes | Passed to the API |
| Account type (`user` / `org`) | No | Defaults to `user` |
| Topic filter | No | Client-side filter after fetch |
| Max repos | No | Defaults to 6 |
| Sort (`updated` / `stars` / `name`) | No | Defaults to `updated` |

### Dynamic Data (from GitHub API)

Each repo card displays:
- **Name** — linked to `html_url`
- **Description** — omitted if empty
- **Primary language** — shown as a badge with dot; omitted if null
- **Stars** — `stargazers_count` with ★ icon
- **Forks** — `forks_count` with fork icon
- **Topics** — rendered as tags if present

### API Endpoints

- User: `https://api.github.com/users/{username}/repos?sort={sort}&per_page={max}&direction=desc`
- Org: `https://api.github.com/orgs/{org}/repos?sort={sort}&per_page={max}&direction=desc`
- Unauthenticated rate limit: 60 req/hr per IP (acceptable for low-traffic pages)
- Topic filtering applied client-side after fetch (filter before rendering)

### Variants

- **Default** — responsive card grid
- **list** — compact single-column list layout (narrower, text-forward)

## Responsive Behavior

| Viewport | Columns |
|---|---|
| Mobile (< 600px) | 1 |
| Tablet (600px–899px) | 2 |
| Desktop (≥ 900px) | 3 |

## Edge Cases

- API error (network failure, rate limit 403, 404 user not found) → show error message
- Repo with no description → omit description row
- Repo with no language → omit language badge
- Repo with no topics → omit topics row
- Zero repos returned (all filtered out or empty account) → show "No repositories found" message
- Loading state → show skeleton or loading indicator while fetching

## Acceptance Criteria

1. Block renders a grid of repo cards for the configured username/org
2. Cards display: name (linked), description (if present), language badge (if present), star count, fork count, topics (if present)
3. Topic filter: when configured, only repos with that topic are shown
4. Max repos limit is respected (no more than configured number of cards rendered)
5. Loading state is shown while fetch is in progress
6. API errors and empty results are handled gracefully with visible user feedback
7. List variant renders a compact single-column layout
8. Responsive: 1 col mobile, 2 col tablet, 3 col desktop
9. All links open in a new tab (`target="_blank"`, `rel="noopener"`)
10. Accessible: cards are keyboard-navigable, stats have descriptive aria-labels, language/topic badges have meaningful text
11. No console errors in any scenario
12. Linting passes clean
