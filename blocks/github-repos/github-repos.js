/**
 * Parses the key/value configuration rows authored into the block.
 * @param {Element} block The block element
 * @returns {Object} Configuration object
 */
function parseConfig(block) {
  const config = {};
  block.querySelectorAll(':scope > div').forEach((row) => {
    const cells = row.querySelectorAll(':scope > div');
    if (cells.length === 2) {
      const key = cells[0].textContent.trim().toLowerCase();
      const value = cells[1].textContent.trim();
      if (key) config[key] = value;
    }
  });
  return config;
}

/**
 * Creates a status message paragraph and replaces block contents with it.
 * @param {Element} block The block element
 * @param {string} className CSS class for the paragraph
 * @param {string} message Text content
 */
function showMessage(block, className, message) {
  const p = document.createElement('p');
  p.className = className;
  p.textContent = message;
  block.replaceChildren(p);
}

/**
 * Builds a single repository card element.
 * @param {Object} repo GitHub repository object
 * @returns {HTMLLIElement} The card list item
 */
function buildCard(repo) {
  const li = document.createElement('li');
  li.className = 'github-repos-card';

  // Name (linked)
  const header = document.createElement('div');
  header.className = 'github-repos-card-header';

  const nameLink = document.createElement('a');
  nameLink.href = repo.html_url;
  nameLink.target = '_blank';
  nameLink.rel = 'noopener';
  nameLink.className = 'github-repos-card-name';
  nameLink.textContent = repo.name;
  header.append(nameLink);
  li.append(header);

  // Description
  if (repo.description) {
    const desc = document.createElement('p');
    desc.className = 'github-repos-card-description';
    desc.textContent = repo.description;
    li.append(desc);
  }

  // Meta row: language + stats
  const meta = document.createElement('div');
  meta.className = 'github-repos-card-meta';

  if (repo.language) {
    const lang = document.createElement('span');
    lang.className = 'github-repos-card-language';

    const dot = document.createElement('span');
    dot.className = 'github-repos-card-language-dot';
    dot.dataset.language = repo.language;
    dot.setAttribute('aria-hidden', 'true');

    lang.append(dot, document.createTextNode(repo.language));
    meta.append(lang);
  }

  const stats = document.createElement('span');
  stats.className = 'github-repos-card-stats';

  const stars = document.createElement('span');
  stars.className = 'github-repos-card-stars';
  stars.setAttribute('aria-label', `${repo.stargazers_count} stars`);
  stars.setAttribute('aria-hidden', 'false');
  const starIcon = document.createElement('span');
  starIcon.setAttribute('aria-hidden', 'true');
  starIcon.textContent = '★';
  stars.append(starIcon, document.createTextNode(` ${repo.stargazers_count}`));

  const forks = document.createElement('span');
  forks.className = 'github-repos-card-forks';
  forks.setAttribute('aria-label', `${repo.forks_count} forks`);
  forks.textContent = `${repo.forks_count} forks`;

  stats.append(stars, forks);
  meta.append(stats);
  li.append(meta);

  // Topics (max 5)
  if (repo.topics && repo.topics.length > 0) {
    const topicsEl = document.createElement('ul');
    topicsEl.className = 'github-repos-card-topics';

    repo.topics.slice(0, 5).forEach((topic) => {
      const topicLi = document.createElement('li');
      topicLi.className = 'github-repos-card-topic';
      topicLi.textContent = topic;
      topicsEl.append(topicLi);
    });

    li.append(topicsEl);
  }

  return li;
}

/**
 * Loads and decorates the github-repos block.
 * Fetches repositories from the GitHub API and renders them as cards.
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const {
    username,
    limit = '6',
    topic = '',
    sort = 'updated',
  } = parseConfig(block);

  if (!username) {
    showMessage(block, 'github-repos-error', 'No GitHub username configured.');
    return;
  }

  const limitNum = parseInt(limit, 10) || 6;
  const isList = block.classList.contains('list');

  // Show loading state while fetching
  const loading = document.createElement('p');
  loading.className = 'github-repos-loading';
  loading.setAttribute('aria-live', 'polite');
  loading.textContent = 'Loading repositories…';
  block.replaceChildren(loading);

  try {
    const response = await fetch(`/data/github-repos/${encodeURIComponent(username)}.json`);

    if (!response.ok) {
      throw new Error(`Failed to load repo data: ${response.status}`);
    }

    let repos = await response.json();

    // Client-side topic filter
    if (topic) {
      repos = repos.filter((repo) => Array.isArray(repo.topics) && repo.topics.includes(topic));
    }

    // Client-side sort for stars and name
    if (sort === 'stars') {
      repos.sort((a, b) => b.stargazers_count - a.stargazers_count);
    } else if (sort === 'name') {
      repos.sort((a, b) => a.name.localeCompare(b.name));
    }

    repos = repos.slice(0, limitNum);

    if (repos.length === 0) {
      showMessage(block, 'github-repos-empty', 'No repositories found.');
      return;
    }

    const ul = document.createElement('ul');
    ul.className = isList ? 'github-repos-list' : 'github-repos-grid';
    ul.setAttribute('aria-label', `${username} repositories`);

    repos.forEach((repo) => ul.append(buildCard(repo)));

    block.replaceChildren(ul);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('github-repos: failed to load repositories', err);
    showMessage(block, 'github-repos-error', 'Unable to load repositories. Please try again later.');
  }
}
