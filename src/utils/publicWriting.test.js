import { createHash, webcrypto } from 'crypto';
import { TextEncoder } from 'util';
import { getReviewedWritingEntries, getReviewedWritingEntry, isReviewedPublicPost, WRITING_PAGE_SIZE } from './publicWriting';

const post = {
  id: 'reviewed-example', slug: '2026-10-01-independent-product-note', published: true,
  title: 'A public product update', excerpt: 'An independent project.', content: 'A reviewed article.',
  coverImage: '/images/example.svg', tags: ['product'], relatedProject: 'row-crew',
};
const contentSha256 = createHash('sha256').update(JSON.stringify([
  'A public product update', 'An independent project.', 'A reviewed article.',
  '/images/example.svg', ['product'], 'row-crew',
])).digest('hex');
const policy = {
  writingRepositoryFullNames: ['azoni/rowing-tracker'],
  reviewedPosts: [{ id: post.id, slug: post.slug, sourceRepos: ['azoni/rowing-tracker'], contentSha256 }],
};
const previousEncoder = global.TextEncoder;
beforeAll(() => { global.TextEncoder = TextEncoder; });
afterAll(() => { global.TextEncoder = previousEncoder; });

test('accepts only the exact reviewed document and content', async () => {
  expect(await isReviewedPublicPost(post, policy, webcrypto)).toBe(true);
  expect(await isReviewedPublicPost({ ...post, id: 'different-document' }, policy, webcrypto)).toBe(false);
  expect(await isReviewedPublicPost({ ...post, slug: 'unknown-slug' }, policy, webcrypto)).toBe(false);
  expect(await isReviewedPublicPost({ ...post, published: false }, policy, webcrypto)).toBe(false);
});

test.each(['title', 'excerpt', 'content', 'coverImage', 'tags', 'relatedProject'])('withholds changed %s until it is reviewed again', async (field) => {
  const value = field === 'tags' ? ['unreviewed'] : 'Changed since review';
  expect(await isReviewedPublicPost({ ...post, [field]: value }, policy, webcrypto)).toBe(false);
});

test('mixed or missing source provenance cannot authorize a post', async () => {
  for (const sourceRepos of [[], ['unknown/repository'], ['azoni/rowing-tracker', 'unknown/repository']]) {
    const changedPolicy = { ...policy, reviewedPosts: [{ ...policy.reviewedPosts[0], sourceRepos }] };
    expect(getReviewedWritingEntries(changedPolicy)).toEqual([]);
    expect(await isReviewedPublicPost(post, changedPolicy, webcrypto)).toBe(false);
  }
});

test('unreviewed slugs cannot select a document and missing digest support fails closed', async () => {
  expect(getReviewedWritingEntry('unreviewed', policy)).toBeNull();
  expect(getReviewedWritingEntry(post.slug, policy).id).toBe(post.id);
  expect(await isReviewedPublicPost(post, policy, {})).toBe(false);
  expect(getReviewedWritingEntries({})).toEqual([]);
  expect(WRITING_PAGE_SIZE).toBe(12);
});
