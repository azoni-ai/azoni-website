import {
  BUILD_NOTES_ENDPOINT, BUILD_NOTE_SLUG, WRITING_PAGE_SIZE, fetchBuildNote, fetchBuildNotes,
  formatNoteDate, isRetiredPostSlug, noteLabel, noteProducts, repositoryProject,
} from './publicWriting';
import policy from '../data/publicWritingPolicy.json';

const reply = (data, status = 200) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(data) });

test('the two persona posts are retired, with their records kept', () => {
  expect(policy.reviewedPosts).toBeUndefined();
  expect(policy.retiredPosts.map((entry) => entry.id)).toEqual(['ZQwQx3mocObrXYwEDc8K', 'cZZQPxzyoUXRKbolvU8u']);
  for (const entry of policy.retiredPosts) {
    expect(entry.contentSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(entry.redirectTo).toBe('/blog');
    expect(isRetiredPostSlug(entry.slug)).toBe(true);
  }
  expect(isRetiredPostSlug('2026-11-01-fab-stats-season-filters')).toBe(false);
});

test('every writing repository maps to a product page', () => {
  for (const repo of policy.writingRepositoryFullNames) {
    expect(repositoryProject(repo)).toEqual({ title: expect.any(String), path: expect.stringMatching(/^\/projects\/[a-z0-9-]+$/) });
  }
  expect(repositoryProject('azoni/unknown')).toBeNull();
  expect(noteProducts({ sourceRepos: ['azoni/azoni-mcp', 'azoni/azoni-moltbook-agent', 'azoni/unknown'] })).toEqual(['azoni.ai agent platform', 'azoni/unknown']);
});

test('the label says whether a language model wrote the note', () => {
  expect(noteLabel({ generator: 'model' })).toBe('Automated · summary written by a language model');
  expect(noteLabel({ generator: 'template' })).toBe('Automated · commit list');
  expect(noteLabel({})).toBe('Automated');
});

test('dates come from the commit date, in UTC', () => {
  expect(formatNoteDate({ commitDate: '2026-11-01', publishedAt: '2026-11-01T17:00:00.000Z' })).toBe('November 1, 2026');
  expect(formatNoteDate({ publishedAt: '2026-10-30T17:00:00.000Z' })).toBe('October 30, 2026');
  expect(formatNoteDate({})).toBe('');
});

test('the list and single-note reads go through the blog-posts function', async () => {
  const fetchList = jest.fn(() => reply({ posts: [{ slug: '2026-11-01-a' }] }));
  expect(await fetchBuildNotes(fetchList)).toEqual([{ slug: '2026-11-01-a' }]);
  expect(fetchList).toHaveBeenCalledWith(BUILD_NOTES_ENDPOINT);
  await expect(fetchBuildNotes(() => reply({}, 503))).rejects.toThrow('503');

  const fetchOne = jest.fn(() => reply({ post: { slug: '2026-11-01-a' } }));
  expect(await fetchBuildNote('2026-11-01-a', fetchOne)).toEqual({ slug: '2026-11-01-a' });
  expect(fetchOne).toHaveBeenCalledWith(`${BUILD_NOTES_ENDPOINT}?slug=2026-11-01-a`);
  expect(await fetchBuildNote('2026-11-01-a', () => reply({ error: 'Not found' }, 404))).toBeNull();
  await expect(fetchBuildNote('2026-11-01-a', () => reply({}, 500))).rejects.toThrow('500');
});

test('a malformed slug never reaches the network', async () => {
  const fetchOne = jest.fn();
  expect(await fetchBuildNote('../admin', fetchOne)).toBeNull();
  expect(await fetchBuildNote(undefined, fetchOne)).toBeNull();
  expect(fetchOne).not.toHaveBeenCalled();
  expect(BUILD_NOTE_SLUG.test('2026-11-01-fab-stats-season-filters')).toBe(true);
  expect(WRITING_PAGE_SIZE).toBe(12);
});
