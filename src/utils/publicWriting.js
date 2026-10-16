import policy from '../data/publicWritingPolicy.json';

export const WRITING_PAGE_SIZE = 12;

// This is editorial curation, not Firestore access control. Each entry has
// individually reviewed content and exact generation provenance. Unknown
// posts and changed content stay out of public pages until reviewed again.
export function getReviewedWritingEntries(sourcePolicy = policy) {
  const repositories = new Set(sourcePolicy.writingRepositoryFullNames || []);
  return (sourcePolicy.reviewedPosts || []).filter((entry) => (
    typeof entry.id === 'string' && entry.id.length > 0 &&
    typeof entry.slug === 'string' && entry.slug.length > 0 &&
    /^[a-f0-9]{64}$/.test(entry.contentSha256 || '') &&
    Array.isArray(entry.sourceRepos) && entry.sourceRepos.length > 0 &&
    entry.sourceRepos.every((repo) => repositories.has(repo))
  ));
}

export function getReviewedWritingEntry(slug, sourcePolicy = policy) {
  return getReviewedWritingEntries(sourcePolicy).find((entry) => entry.slug === slug) || null;
}

export function writingContentForReview(post) {
  return JSON.stringify([
    post.title || '', post.excerpt || '', post.content || '',
    post.coverImage || '', post.tags || [], post.relatedProject || '',
  ]);
}

export async function isReviewedPublicPost(post, sourcePolicy = policy, cryptoApi = typeof window !== 'undefined' ? window.crypto : undefined) {
  if (!post || post.published !== true) return false;
  const entry = getReviewedWritingEntry(post.slug, sourcePolicy);
  if (!entry || entry.id !== post.id || !cryptoApi?.subtle) return false;
  try {
    const content = new TextEncoder().encode(writingContentForReview(post));
    const bytes = await cryptoApi.subtle.digest('SHA-256', content);
    const digest = Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
    return digest === entry.contentSha256;
  } catch {
    return false;
  }
}
