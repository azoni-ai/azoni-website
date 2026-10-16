// Shared publication boundary. Public repository metadata alone is insufficient:
// the exact repository must also be approved as independent, publishable work.
const policy = require('../../../src/data/publicWritingPolicy.json');
const SOURCE_POLICY = 'independent-public-v1';

function isApprovedRepository(fullName) {
  return typeof fullName === 'string' && policy.publicRepositoryFullNames.includes(fullName);
}

function isApprovedWritingRepository(fullName) {
  return typeof fullName === 'string' && Array.isArray(policy.writingRepositoryFullNames) &&
    policy.writingRepositoryFullNames.includes(fullName);
}

function getRepositoryFullName(repo) {
  if (typeof repo?.owner?.login !== 'string' || typeof repo?.name !== 'string') return null;
  const fullName = `${repo.owner.login}/${repo.name}`;
  if (repo.nameWithOwner && repo.nameWithOwner !== fullName) return null;
  return fullName;
}

function isPublicIndependentRepository(repo) {
  return repo?.isPrivate === false &&
    (!repo.visibility || repo.visibility === 'PUBLIC') &&
    isApprovedRepository(getRepositoryFullName(repo));
}

function selectPublicRepositories(repos) {
  return (Array.isArray(repos) ? repos : []).filter(isPublicIndependentRepository);
}

function selectWritingRepositories(repos) {
  return selectPublicRepositories(repos).filter(repo => isApprovedWritingRepository(getRepositoryFullName(repo)));
}

function assertPublicCommitSources(commitsByRepo) {
  const sources = Object.entries(commitsByRepo || {});
  if (!sources.length || sources.some(([key, repo]) =>
    !isApprovedWritingRepository(key) || repo?.repoFullName !== key || repo.isPrivate !== false ||
    !Array.isArray(repo.commits) || repo.commits.length === 0
  )) throw new Error('Blog source policy requires approved public repositories only');
  return sources.map(([fullName]) => fullName).sort();
}

function hasPublicSourceProof(post) {
  return post?.sourcePolicy === SOURCE_POLICY && Array.isArray(post.sourceRepos) &&
    post.sourceRepos.length > 0 && post.sourceRepos.every(isApprovedWritingRepository) &&
    new Set(post.sourceRepos).size === post.sourceRepos.length;
}

module.exports = {
  SOURCE_POLICY, isApprovedRepository, isApprovedWritingRepository, getRepositoryFullName,
  isPublicIndependentRepository, selectPublicRepositories,
  selectWritingRepositories, assertPublicCommitSources, hasPublicSourceProof,
};
