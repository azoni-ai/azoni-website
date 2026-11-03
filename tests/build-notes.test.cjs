const test = require('node:test');
const assert = require('node:assert/strict');
const notes = require('../netlify/functions/lib/build-notes');

const DATE = '2026-11-01';
const TERMS = notes.parsePrivateTerms('Acme Corp,\nsecret-take-home');
const oid = (seed) => seed.repeat(40).slice(0, 40);

const commitNode = (message, seed, overrides = {}) => ({
  message, oid: oid(seed), committedDate: `${DATE}T10:00:00Z`, additions: 10, deletions: 2,
  author: { user: { login: 'azoni' } }, ...overrides,
});
const repoNode = (fullName, nodes, overrides = {}) => {
  const [owner, name] = fullName.split('/');
  return { name, nameWithOwner: fullName, owner: { login: owner }, isPrivate: false, defaultBranchRef: { target: { history: { nodes } } }, ...overrides };
};

const fetched = () => notes.collectCommits([
  repoNode('azoni/fab-stats', [
    commitNode('Add season filters to the player page', 'a1'),
    commitNode('Fix mobile layout on My Decks\n\nThe table overflowed at 390px wide.', 'b2'),
  ]),
  repoNode('azoni/rowing-tracker', [commitNode('Show meters per rower', 'c3')]),
], { login: 'azoni', privateTerms: TERMS }).commitsByRepo;

const modelNote = (overrides = {}, commitsByRepo = fetched()) => notes.assembleNote({
  title: 'FaB Stats: season filters and a mobile layout fix',
  excerpt: 'Adds season filters to FaB Stats and shows meters per rower in Row Crew.',
  sections: [
    { repo: 'azoni/fab-stats', summary: 'Adds season filters to the player page. The My Decks table no longer overflows at 390px wide.' },
    { repo: 'azoni/rowing-tracker', summary: 'Shows meters per rower.' },
  ],
  tags: ['react', 'Data'],
  generator: 'model',
  ...overrides,
}, commitsByRepo, DATE);

const check = (note, commitsByRepo = fetched(), privateTerms = TERMS) => notes.validateBuildNote(note, { commitsByRepo, privateTerms });

test('commit collection keeps only public allowlisted repositories and the owner\'s own commits', () => {
  const { commitsByRepo, withheld } = notes.collectCommits([
    repoNode('azoni/fab-stats', [
      commitNode('Add a feature', 'a1'),
      commitNode('Merge pull request #4 from azoni/feature-branch', 'd4'),
      commitNode('Prepare the Acme Corp take-home', 'e5'),
      commitNode('Someone else', 'f6', { author: { user: { login: 'other' } } }),
      commitNode('Short oid', 'a1', { oid: 'abc1234' }),
    ]),
    repoNode('azoni/benchonly', [commitNode('Private work', 'a1')], { isPrivate: true }),
    repoNode('azoni/unknown-client-work', [commitNode('Unknown work', 'a1')]),
    repoNode('azoni-ai/azoni-website', [commitNode('Public but not a writing source', 'a1')]),
  ], { login: 'azoni', privateTerms: TERMS });
  assert.deepEqual(Object.keys(commitsByRepo), ['azoni/fab-stats']);
  assert.deepEqual(commitsByRepo['azoni/fab-stats'].commits.map((commit) => commit.message), ['Add a feature']);
  assert.equal(withheld, 1);
  const [commit] = commitsByRepo['azoni/fab-stats'].commits;
  assert.equal(commit.url, `https://github.com/azoni/fab-stats/commit/${oid('a1')}`);
  assert.equal(commit.sha, oid('a1').slice(0, 7));
});

test('a factual note built from the fetched commits passes the gate', () => {
  const note = modelNote();
  const result = check(note);
  assert.deepEqual(result, { ok: true, reasons: [] });
  assert.match(note.slug, /^2026-11-01-fab-stats-season-filters/);
  assert.deepEqual(note.sourceRepos, ['azoni/fab-stats', 'azoni/rowing-tracker']);
  assert.deepEqual(note.tags, ['react', 'data', 'build-notes']);
  assert.match(note.content, /## FaB Stats/);
  assert.ok(note.content.includes(`(https://github.com/azoni/fab-stats/commit/${oid('b2')})`));
  assert.match(note.content, /Repository: \[azoni\/rowing-tracker\]\(https:\/\/github\.com\/azoni\/rowing-tracker\)/);
  assert.equal(note.commits.length, 3);
});

test('the template note (no model) passes the gate and repeats commit text verbatim', () => {
  const commitsByRepo = fetched();
  const note = notes.assembleNote(notes.templateDraft(commitsByRepo, DATE), commitsByRepo, DATE);
  assert.equal(note.title, 'FaB Stats, Row Crew: 3 changes');
  assert.equal(note.excerpt, '3 commits to FaB Stats and Row Crew on November 1, 2026.');
  assert.deepEqual(check(note), { ok: true, reasons: [] });
});

test('fails closed without a configured private-term list', () => {
  assert.deepEqual(check(modelNote(), fetched(), []).reasons, ['BLOG_PRIVATE_TERMS is not configured']);
  assert.deepEqual(notes.parsePrivateTerms(undefined), []);
  assert.deepEqual(notes.parsePrivateTerms(' , x ,\n'), []);
});

test('private terms are caught in any spelling and never echoed in the reason', () => {
  for (const title of ['FaB Stats: work for ACME corp', 'FaB Stats: acme-corp import', 'FaB Stats: Secret Take Home fixes']) {
    const result = check(modelNote({ title }));
    assert.equal(result.ok, false);
    assert.ok(result.reasons.some((reason) => /^contains private term #\d$/.test(reason)), result.reasons.join());
    assert.doesNotMatch(result.reasons.join(), /acme|secret/i);
  }
  assert.equal(check(modelNote({ tags: ['acme-corp'] })).ok, false);
  // Whole words only: "acmes" or "pacme corp" are not "acme corp".
  assert.equal(notes.findPrivateTerm(['pacme corporation'], TERMS), -1);
});

test('repositories must be allowlisted and fetched', () => {
  const commitsByRepo = fetched();
  assert.ok(check({ ...modelNote(), sourceRepos: ['azoni/fab-stats', 'azoni/secret-repo'] }).reasons.includes('source repositories are not all allowlisted and fetched'));
  assert.ok(check(modelNote({ excerpt: 'Adds season filters, shared with azoni/secret-repo for testing.' })).reasons.includes('names a repository outside the fetched allowlist'));
  assert.ok(check(modelNote({ sections: [{ repo: 'azoni/secret-repo', summary: 'Something private.' }] })).reasons.includes('a summary names a repository that has no fetched commits'));
  const outside = { ...commitsByRepo, 'azoni/secret-repo': { ...commitsByRepo['azoni/fab-stats'], repoFullName: 'azoni/secret-repo', repoUrl: 'https://github.com/azoni/secret-repo' } };
  assert.ok(check(modelNote({}, commitsByRepo), outside).reasons.includes('fetched data includes a repository outside the allowlist'));
});

test('every cited commit link or SHA must be in the fetched data', () => {
  const note = modelNote();
  const fakeLink = { ...note, content: `${note.content}\n\n- [abc1234](https://github.com/azoni/fab-stats/commit/abc1234abc1234abc1234abc1234abc1234abcd) Invented` };
  assert.ok(check(fakeLink).reasons.includes('links to GitHub content that is not in the fetched data'));
  assert.ok(check(modelNote({ excerpt: 'Fixes the bug introduced in 9f8e7d6 last week.' })).reasons.includes('cites a commit that is not in the fetched data'));
  const outsideLink = { ...note, content: `${note.content}\n\nSee [the docs](https://example.com/docs).` };
  assert.ok(check(outsideLink).reasons.includes('contains a link that is not a fetched commit or repository'));
  assert.ok(check({ ...note, content: '## FaB Stats\n\nNo commit links here at all, only a summary of the change.' }).reasons.includes('cites no fetched commit'));
});

test('prose stays a neutral changelog: no first person, pronouns, invented numbers, code, quotes or narrative', () => {
  const reasonsFor = (overrides) => check(modelNote(overrides)).reasons;
  assert.ok(reasonsFor({ excerpt: 'I finally fixed the mobile layout that had been bugging me.' }).includes('uses first-person narrative'));
  assert.ok(reasonsFor({ excerpt: 'We added season filters to FaB Stats this morning.' }).includes('uses first-person narrative'));
  assert.ok(reasonsFor({ excerpt: 'Alex added season filters, and he fixed the table.' }).includes('refers to a person with a gendered pronoun'));
  assert.ok(reasonsFor({ excerpt: 'Season filters cut page load time by 40 percent for players.' }).includes('states a number that is not in the commit data'));
  assert.ok(reasonsFor({ sections: [{ repo: 'azoni/fab-stats', summary: 'Adds filters:\n```js\nconst season = 1;\n```' }] }).includes('contains code'));
  assert.ok(reasonsFor({ sections: [{ repo: 'azoni/fab-stats', summary: '> Players asked for this for months.' }] }).includes('contains a quotation'));
  assert.ok(reasonsFor({ excerpt: 'Season filters arrive after a few hiccups, with more coming soon.' }).includes('contains narrative, feelings, plans or hype'));
  assert.ok(reasonsFor({ excerpt: 'A seamless new way to filter seasons in FaB Stats.' }).includes('contains narrative, feelings, plans or hype'));
  assert.ok(reasonsFor({ excerpt: 'Season filters, see https://github.com/azoni/fab-stats for details.' }).includes('summary text contains a link'));
  // Numbers and phrases taken from the commits are fine ("390px", "My Decks").
  assert.deepEqual(check(modelNote()).reasons, []);
});

test('lengths, slug and tags are bounded', () => {
  assert.ok(check(modelNote({ title: 'Fix' })).reasons.includes('title length is out of range'));
  assert.ok(check(modelNote({ excerpt: 'Short.' })).reasons.includes('excerpt length is out of range'));
  assert.ok(check(modelNote({ sections: [{ repo: 'azoni/fab-stats', summary: 'Adds season filters. '.repeat(40) }] })).reasons.includes('a summary is too long'));
  assert.ok(check({ ...modelNote(), slug: '../../etc' }).reasons.includes('slug is malformed'));
  assert.ok(check({ ...modelNote(), tags: ['Not A Tag!'] }).reasons.includes('tags are malformed'));
  assert.equal(notes.cleanTags(['a', 'b', 'c', 'd', 'e', 'f']).length, notes.LIMITS.tags);
});

test('serving accepts only published policy-version-2 notes from allowlisted repositories', () => {
  const post = { published: true, policyVersion: 2, slug: '2026-11-01-fab-stats-season-filters', sourceRepos: ['azoni/fab-stats'] };
  assert.equal(notes.isCompliantPost(post), true);
  assert.equal(notes.isCompliantPost({ ...post, published: false }), false);
  assert.equal(notes.isCompliantPost({ ...post, policyVersion: undefined }), false);
  assert.equal(notes.isCompliantPost({ ...post, sourceRepos: ['azoni/fab-stats', 'azoni/secret-repo'] }), false);
  assert.equal(notes.isCompliantPost({ ...post, slug: 'not-a-note' }), false);
});
