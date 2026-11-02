// Automated build notes: pure helpers shared by daily-blog (writes) and
// blog-posts (serves). Nothing here touches the network or Firestore, so the
// validation gate can be unit-tested directly.
const policy = require('../../../src/data/publicWritingPolicy.json');
const { isApprovedWritingRepository, selectWritingRepositories, getRepositoryFullName } = require('./public-writing-policy');

const POLICY_VERSION = 2;
// The only repositories a note may draw from. daily-blog queries these by
// name, so no other repository's data is ever fetched.
const WRITING_REPOSITORIES = (policy.writingRepositoryFullNames || [])
  .filter((fullName) => /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(fullName));
const SLUG_PATTERN = /^\d{4}-\d{2}-\d{2}-[a-z0-9-]{0,60}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TAG_PATTERN = /^[a-z0-9][a-z0-9-]{0,23}$/;
const MESSAGE_LIMIT = 140;

const LIMITS = {
  title: [8, 110], excerpt: [20, 240], content: [60, 20000], summary: [0, 700], tags: 5,
};

// Owners whose "owner/name" mentions must be allowlisted repositories.
const KNOWN_OWNERS = new Set(
  [...(policy.publicRepositoryFullNames || []), ...(policy.writingRepositoryFullNames || [])]
    .map((fullName) => fullName.split('/')[0].toLowerCase())
);

const FIRST_PERSON = /\b(i|me|my|mine|myself|we|us|our|ours|ourselves)\b/gi;
const GENDERED = /\b(he|him|his|himself|she|her|hers|herself)\b/gi;
// Narrative, feelings, plans and hype. A word is allowed when the commit text
// itself uses it (a commit can add a "challenge mode").
const NARRATIVE = /\b(hiccups?|journey|excit\w*|thrill\w*|stay tuned|lessons? learned|next steps?|going forward|in the future|coming soon|plans? to|planning|can't wait|proud|frustrat\w*|struggl\w*|headaches?|painful|seamless\w*|cutting-edge|leverag\w*|empower\w*|unlock\w*|elevat\w*|supercharg\w*|game-?chang\w*)\b/gi;
// Any figure, including one glued to a unit ("40x", "390px"); not version tags like "v2".
const NUMBER = /(?<![A-Za-z0-9_.])\d+(?:[.,]\d+)*/g;
const SHA_LIKE = /\b(?=[0-9a-f]*\d)(?=[0-9a-f]*[a-f])[0-9a-f]{7,40}\b/gi;
const GITHUB_URL = /https?:\/\/(?:www\.)?github\.com\/([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+)(\/[^\s)\]]*)?/gi;
const MARKDOWN_LINK = /\]\(([^)\s]+)\)/g;
const OWNER_REPO = /(?:^|[^A-Za-z0-9_./-])([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+)/g;

const normalize = (text) => ` ${String(text || '').toLowerCase().replace(/[_\-./\\:]+/g, ' ').replace(/[^a-z0-9& ]+/g, ' ').replace(/\s+/g, ' ').trim()} `;

// BLOG_PRIVATE_TERMS lives only in the server environment: comma or newline
// separated names (employers, clients, private repositories) that must never
// appear in a public note. It is never written into the repository.
function parsePrivateTerms(raw) {
  if (typeof raw !== 'string') return [];
  return [...new Set(raw.split(/[\n,]/).map((term) => normalize(term).trim()).filter((term) => term.length >= 2))];
}

// Index of the first private term found, or -1. Reasons and logs only ever
// carry the index, never the term or the matching text.
function findPrivateTerm(texts, terms) {
  const haystack = normalize([].concat(texts).filter(Boolean).join(' \n '));
  return terms.findIndex((term) => haystack.includes(` ${term} `));
}

function repositoryProject(fullName) {
  return policy.buildNotes?.repositoryProjects?.[fullName] || null;
}

const firstLine = (message) => String(message || '').split('\n')[0].trim();
const clip = (text, limit) => (text.length > limit ? `${text.slice(0, limit - 1).trimEnd()}…` : text);

const MERGE_COMMIT = /^Merge (pull request|branch|remote-tracking branch)\b/;

// GitHub GraphQL repository nodes -> { 'owner/name': { repoUrl, commits } }.
// Only public, approved writing repositories and the owner's own commits
// survive. Merge commits are skipped (their commits are listed themselves).
// Commits whose message names a private term are dropped before any model
// sees them; the caller learns only how many.
function collectCommits(repositories, { login, privateTerms = [] }) {
  const commitsByRepo = {};
  let withheld = 0;
  for (const repo of selectWritingRepositories(repositories)) {
    const fullName = getRepositoryFullName(repo);
    const nodes = repo.defaultBranchRef?.target?.history?.nodes || [];
    const commits = [];
    for (const node of nodes) {
      if (node?.author?.user?.login !== login || typeof node.oid !== 'string' || !/^[0-9a-f]{40}$/.test(node.oid)) continue;
      if (MERGE_COMMIT.test(firstLine(node.message))) continue;
      if (findPrivateTerm([node.message], privateTerms) !== -1) { withheld += 1; continue; }
      commits.push({
        oid: node.oid,
        sha: node.oid.slice(0, 7),
        url: `https://github.com/${fullName}/commit/${node.oid}`,
        message: firstLine(node.message),
        body: String(node.message || '').split('\n').slice(1).join('\n').trim().slice(0, 600),
        timestamp: node.committedDate || null,
        additions: node.additions || 0,
        deletions: node.deletions || 0,
        filesChanged: node.changedFilesIfAvailable || 0,
      });
    }
    if (commits.length) {
      commitsByRepo[fullName] = {
        repoFullName: fullName, repoName: repo.name, repoUrl: `https://github.com/${fullName}`,
        isPrivate: repo.isPrivate, description: repo.description || '', commits,
      };
    }
  }
  return { commitsByRepo, withheld };
}

function formatLongDate(date) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
}

function displayName(fullName) {
  return repositoryProject(fullName)?.title || fullName;
}

// Every source fact the prose may repeat: commit text, counts and the date.
function sourceText(commitsByRepo, date) {
  const repos = Object.values(commitsByRepo);
  const total = repos.reduce((sum, repo) => sum + repo.commits.length, 0);
  const [year, month, day] = date.split('-');
  return [
    ...repos.flatMap((repo) => [repo.repoFullName, displayName(repo.repoFullName), String(repo.commits.length),
      ...repo.commits.flatMap((commit) => [commit.message, commit.body])]),
    String(total), String(repos.length), date, formatLongDate(date), year, String(Number(month)), String(Number(day)),
  ].join('\n');
}

function slugFor(date, title) {
  const tail = String(title || '').toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 60).replace(/-+$/, '');
  return `${date}-${tail}`;
}

function cleanTags(tags) {
  const list = Array.isArray(tags) ? tags : [];
  const clean = list.map((tag) => String(tag || '').trim().toLowerCase().replace(/\s+/g, '-')).filter((tag) => TAG_PATTERN.test(tag));
  return [...new Set([...clean.slice(0, LIMITS.tags - 1), 'build-notes'])];
}

// Deterministic draft used when no model is configured or the model call
// fails: a plain changelog built only from the fetched commits.
function templateDraft(commitsByRepo, date) {
  const repos = Object.values(commitsByRepo);
  const total = repos.reduce((sum, repo) => sum + repo.commits.length, 0);
  const lead = repos[0];
  const products = [...new Set(repos.map((repo) => displayName(repo.repoFullName)))];
  const firstMessage = clip(lead.commits[0].message.replace(/[.\s]+$/, ''), 70);
  const title = total === 1
    ? `${displayName(lead.repoFullName)}: ${firstMessage}`
    : `${products.join(', ')}: ${total} changes`;
  return {
    title: clip(title, LIMITS.title[1]),
    excerpt: `${total} commit${total === 1 ? '' : 's'} to ${products.join(' and ')} on ${formatLongDate(date)}.`,
    sections: [],
    tags: [],
    generator: 'template',
  };
}

// The model writes only the title, excerpt and one short summary per
// repository. The commit list, with links, is always assembled from the
// fetched data, so every link in a note points at a real commit.
function assembleNote(draft, commitsByRepo, date) {
  const summaries = new Map((Array.isArray(draft.sections) ? draft.sections : [])
    .filter((section) => section && typeof section.repo === 'string')
    .map((section) => [section.repo, typeof section.summary === 'string' ? section.summary.trim() : '']));
  const blocks = [];
  const names = Object.keys(commitsByRepo).map(displayName);
  for (const repo of Object.values(commitsByRepo).sort((a, b) => b.commits.length - a.commits.length)) {
    // Two repositories of one product (the agent platform) get their own names.
    const name = displayName(repo.repoFullName);
    blocks.push(`## ${names.filter((other) => other === name).length > 1 ? `${name}: ${repo.repoName}` : name}`);
    const summary = summaries.get(repo.repoFullName);
    if (summary) blocks.push(summary.replace(/\n+/g, ' '));
    blocks.push(repo.commits.map((commit) => `- [${commit.sha}](${commit.url}) ${clip(commit.message.replace(/[[\]`]/g, ''), MESSAGE_LIMIT)}`).join('\n'));
    blocks.push(`Repository: [${repo.repoFullName}](${repo.repoUrl})`);
  }
  const title = String(draft.title || '').trim();
  return {
    title,
    slug: slugFor(date, title),
    excerpt: String(draft.excerpt || '').trim(),
    content: blocks.join('\n\n'),
    tags: cleanTags(draft.tags),
    sourceRepos: Object.keys(commitsByRepo).sort(),
    commitDate: date,
    commits: Object.values(commitsByRepo).flatMap((repo) => repo.commits.map((commit) => ({
      repo: repo.repoFullName, sha: commit.sha, oid: commit.oid, url: commit.url, message: commit.message,
    }))),
    // Template notes repeat commit text verbatim, so only model-written prose
    // goes through the voice checks.
    prose: draft.generator === 'template' ? [] : [title, String(draft.excerpt || ''), ...summaries.values()],
    unknownSections: [...summaries.keys()].filter((repo) => !commitsByRepo[repo]).length,
  };
}

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// The gate. Runs before any note is public; returns every reason it fails.
// Reasons never repeat the offending text, so they are safe to log.
function validateBuildNote(note, { commitsByRepo, privateTerms }) {
  const reasons = [];
  const fail = (reason) => { if (!reasons.includes(reason)) reasons.push(reason); };
  const fetched = commitsByRepo || {};
  const fetchedRepos = new Set(Object.keys(fetched));
  const fetchedRepoUrls = new Set(Object.values(fetched).map((repo) => repo.repoUrl.toLowerCase()));
  const commits = Object.values(fetched).flatMap((repo) => repo.commits.map((commit) => ({ ...commit, repo: repo.repoFullName })));
  const commitUrls = new Set(commits.map((commit) => commit.url.toLowerCase()));
  const isFetchedSha = (sha) => commits.some((commit) => commit.oid.startsWith(sha.toLowerCase()));

  const title = typeof note?.title === 'string' ? note.title : '';
  const excerpt = typeof note?.excerpt === 'string' ? note.excerpt : '';
  const content = typeof note?.content === 'string' ? note.content : '';
  const tags = Array.isArray(note?.tags) ? note.tags : [];
  const prose = (Array.isArray(note?.prose) ? note.prose : [title, excerpt]).filter((text) => typeof text === 'string');
  const allText = [title, excerpt, content, ...tags, note?.slug || ''].join('\n');

  // Length.
  const within = (text, [min, max]) => text.trim().length >= min && text.length <= max;
  if (!within(title, LIMITS.title)) fail('title length is out of range');
  if (!within(excerpt, LIMITS.excerpt)) fail('excerpt length is out of range');
  if (!within(content, LIMITS.content)) fail('content length is out of range');
  if (prose.slice(2).some((summary) => summary.length > LIMITS.summary[1])) fail('a summary is too long');
  if (tags.length > LIMITS.tags || tags.some((tag) => !TAG_PATTERN.test(tag))) fail('tags are malformed');
  if (typeof note?.slug !== 'string' || !SLUG_PATTERN.test(note.slug)) fail('slug is malformed');

  // Repositories.
  const sourceRepos = Array.isArray(note?.sourceRepos) ? note.sourceRepos : [];
  if (!sourceRepos.length || sourceRepos.some((repo) => !isApprovedWritingRepository(repo) || !fetchedRepos.has(repo))) {
    fail('source repositories are not all allowlisted and fetched');
  }
  if (!fetchedRepos.size || [...fetchedRepos].some((repo) => !isApprovedWritingRepository(repo))) {
    fail('fetched data includes a repository outside the allowlist');
  }
  if (note?.unknownSections) fail('a summary names a repository that has no fetched commits');
  for (const match of allText.matchAll(OWNER_REPO)) {
    const fullName = `${match[1]}/${match[2].replace(/\.+$/, '')}`;
    if (KNOWN_OWNERS.has(match[1].toLowerCase()) && !fetchedRepos.has(fullName)) {
      fail('names a repository outside the fetched allowlist');
    }
  }

  // Links: GitHub links must be fetched commits or repositories; every
  // markdown link must point at one of them.
  for (const match of allText.matchAll(GITHUB_URL)) {
    const base = `https://github.com/${match[1]}/${match[2].replace(/\.git$/, '')}`.toLowerCase();
    const rest = (match[3] || '').replace(/\/+$/, '');
    const url = `${base}${rest}`.toLowerCase();
    if (!rest ? !fetchedRepoUrls.has(base) : !commitUrls.has(url)) fail('links to GitHub content that is not in the fetched data');
  }
  for (const match of content.matchAll(MARKDOWN_LINK)) {
    const target = match[1].toLowerCase();
    if (!commitUrls.has(target) && !fetchedRepoUrls.has(target)) fail('contains a link that is not a fetched commit or repository');
  }

  // Commit SHAs cited anywhere must be fetched commits.
  const withoutUrls = allText.replace(GITHUB_URL, ' ');
  for (const match of withoutUrls.matchAll(SHA_LIKE)) {
    if (!isFetchedSha(match[0])) fail('cites a commit that is not in the fetched data');
  }
  if (!commits.some((commit) => content.includes(commit.url))) fail('cites no fetched commit');

  // Private terms (from the server environment only). Fail closed when the
  // list is not configured.
  if (!Array.isArray(privateTerms) || privateTerms.length === 0) {
    fail('BLOG_PRIVATE_TERMS is not configured');
  } else {
    const index = findPrivateTerm([title, excerpt, content, ...tags, note?.slug || ''], privateTerms);
    if (index !== -1) fail(`contains private term #${index + 1}`);
  }

  // Voice: factual changelog only, from the written prose.
  const source = sourceText(fetched, note?.commitDate && DATE_PATTERN.test(note.commitDate) ? note.commitDate : '1970-01-01');
  const sourceLower = source.toLowerCase();
  // A pronoun is fine inside a phrase the commits use ("a My Decks page").
  const quotedFromSource = (text, index, word) => {
    const phrase = (word + (text.slice(index + word.length).match(/^\s+[\w-]+/) || [''])[0]).toLowerCase();
    return phrase !== word.toLowerCase() && sourceLower.includes(phrase);
  };
  for (const text of prose) {
    for (const match of text.matchAll(FIRST_PERSON)) {
      if (!quotedFromSource(text, match.index, match[0])) fail('uses first-person narrative');
    }
    for (const match of text.matchAll(GENDERED)) {
      if (!quotedFromSource(text, match.index, match[0])) fail('refers to a person with a gendered pronoun');
    }
    if (/```|^\s{4,}\S/m.test(text)) fail('contains code');
    if (/^\s*>/m.test(text)) fail('contains a quotation');
    if (/https?:\/\/|\]\(/.test(text)) fail('summary text contains a link');
    for (const match of text.matchAll(NARRATIVE)) {
      if (!sourceLower.includes(match[0].toLowerCase())) fail('contains narrative, feelings, plans or hype');
    }
    for (const match of text.matchAll(NUMBER)) {
      if (!new RegExp(`(^|[^0-9])${escapeRegExp(match[0])}([^0-9]|$)`).test(source)) fail('states a number that is not in the commit data');
    }
  }
  if (/```/.test(content)) fail('contains code');

  return { ok: reasons.length === 0, reasons };
}

// Serving-side check: what blog-posts will show.
function isCompliantPost(post) {
  return !!post && post.published === true && post.policyVersion === POLICY_VERSION &&
    typeof post.slug === 'string' && SLUG_PATTERN.test(post.slug) &&
    Array.isArray(post.sourceRepos) && post.sourceRepos.length > 0 &&
    post.sourceRepos.every(isApprovedWritingRepository);
}

module.exports = {
  POLICY_VERSION, WRITING_REPOSITORIES, SLUG_PATTERN, DATE_PATTERN, LIMITS,
  parsePrivateTerms, findPrivateTerm, repositoryProject, displayName, collectCommits,
  formatLongDate, sourceText, slugFor, cleanTags, templateDraft, assembleNote,
  validateBuildNote, isCompliantPost,
};
