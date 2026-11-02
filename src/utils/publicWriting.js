import policy from '../data/publicWritingPolicy.json';

export const WRITING_PAGE_SIZE = 12;
export const BUILD_NOTES_ENDPOINT = '/.netlify/functions/blog-posts';
// Matches the slugs daily-blog writes: the commit date, then the title.
export const BUILD_NOTE_SLUG = /^\d{4}-\d{2}-\d{2}-[a-z0-9-]{0,60}$/;

// Hand-reviewed persona posts from before policy version 2. Their documents
// stay in Firestore; their URLs redirect to /blog (public/_redirects).
export function isRetiredPostSlug(slug, sourcePolicy = policy) {
  return (sourcePolicy.retiredPosts || []).some((entry) => entry.slug === slug);
}

export function repositoryProject(fullName, sourcePolicy = policy) {
  const project = sourcePolicy.buildNotes?.repositoryProjects?.[fullName];
  return project ? { title: project.title, path: `/projects/${project.projectId}` } : null;
}

// Product names for a note's repositories, once each.
export function noteProducts(post, sourcePolicy = policy) {
  const names = (post?.sourceRepos || []).map((repo) => repositoryProject(repo, sourcePolicy)?.title || repo);
  return [...new Set(names)];
}

// Says who wrote a note's prose: a language model, or nobody (the commit list).
export function noteLabel(post) {
  if (post?.generator === 'model') return 'Automated · summary written by a language model';
  if (post?.generator === 'template') return 'Automated · commit list';
  return 'Automated';
}

export function formatNoteDate(post) {
  const date = post?.commitDate && /^\d{4}-\d{2}-\d{2}$/.test(post.commitDate)
    ? new Date(`${post.commitDate}T12:00:00Z`)
    : post?.publishedAt ? new Date(post.publishedAt) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export async function fetchBuildNotes(fetchImpl = fetch) {
  const response = await fetchImpl(BUILD_NOTES_ENDPOINT);
  if (!response.ok) throw new Error(`Build notes returned ${response.status}`);
  const data = await response.json();
  return Array.isArray(data.posts) ? data.posts : [];
}

// Resolves to null when the note is not public; throws when it could not load.
export async function fetchBuildNote(slug, fetchImpl = fetch) {
  if (!BUILD_NOTE_SLUG.test(slug || '')) return null;
  const response = await fetchImpl(`${BUILD_NOTES_ENDPOINT}?slug=${encodeURIComponent(slug)}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Build note returned ${response.status}`);
  const data = await response.json();
  return data.post || null;
}
