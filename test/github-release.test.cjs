const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { publishGitHubRelease } = require('../scripts/github-release.cjs');

const manifest = { publisher: 'workspace-ssh-tools', name: 'remote-workspace-ssh', displayName: 'Remote Workspace SSH', version: '0.1.4' };
const bytes = Buffer.from('checked-package');
const context = { eventName: 'push', ref: 'refs/heads/main', sha: 'a'.repeat(40), repo: { owner: 'owner', repo: 'repo' } };
const checksum = 'sha256:' + crypto.createHash('sha256').update(bytes).digest('hex');
const missing = () => { throw Object.assign(new Error('missing'), { status: 404 }); };

function fixture(overrides = {}, referenceOverrides = {}) {
    const calls = [];
    const release = { id: 1, assets: [], draft: true, html_url: 'https://github.com/owner/repo/releases/tag/v0.1.4' };
    const github = { rest: { git: { getRef: async () => missing(), ...referenceOverrides }, repos: {
        getReleaseByTag: async () => missing(),
        getCommit: async () => { throw Object.assign(new Error('No commit found'), { status: 422 }); },
        createRelease: async data => { calls.push(['create', data]); return { data: release }; },
        uploadReleaseAsset: async data => { calls.push(['upload', data]); return { data: {} }; },
        updateRelease: async data => { calls.push(['publish', data]); return { data: { ...release, draft: false } }; },
        ...overrides,
    } } };
    const fetcher = async url => url.endsWith('.vsix')
        ? { ok: true, arrayBuffer: async () => bytes }
        : { ok: true, json: async () => ({ files: { download: 'https://open-vsx.org/package.vsix' } }) };
    return { github, context, manifest, bytes, fetcher, calls, release };
}

test('publishes the release only after uploading the checked artifact', async () => {
    const input = fixture();
    assert.equal(await publishGitHubRelease(input), input.release.html_url);
    assert.deepEqual(input.calls.map(call => call[0]), ['create', 'upload', 'publish']);
    assert.equal(input.calls[0][1].draft, true);
    assert.equal(input.calls[0][1].target_commitish, context.sha);
    assert.equal(input.calls[1][1].data, bytes);
    assert.equal(input.calls[2][1].make_latest, 'true');
});

test('a matching published release is preserved on rerun', async () => {
    const input = fixture({
        getReleaseByTag: async () => ({ data: { id: 1, assets: [{ name: 'remote-workspace-ssh-0.1.4.vsix', digest: checksum }], draft: false, html_url: 'release-url' } }),
    }, { getRef: async () => ({ data: { object: { type: 'commit', sha: context.sha } } }) });
    assert.equal(await publishGitHubRelease(input), 'release-url');
    assert.equal(input.calls.length, 0);
});

test('resumes an interrupted draft without uploading a matching asset again', async () => {
    const input = fixture({
        getReleaseByTag: async () => ({ data: { id: 1, assets: [{ name: 'remote-workspace-ssh-0.1.4.vsix', digest: checksum }], draft: true } }),
    }, { getRef: async () => ({ data: { object: { type: 'commit', sha: context.sha } } }) });
    await publishGitHubRelease(input);
    assert.deepEqual(input.calls.map(call => call[0]), ['publish']);
});

test('rejects another commit or conflicting package without overwriting either', async () => {
    await assert.rejects(publishGitHubRelease(fixture({}, { getRef: async () => ({ data: { object: { type: 'commit', sha: 'b'.repeat(40) } } }) })), /different commit/);
    await assert.rejects(publishGitHubRelease(fixture({ getReleaseByTag: async () => ({ data: { assets: [{ name: 'remote-workspace-ssh-0.1.4.vsix', digest: 'other' }] } }) })), /does not match/);
});

test('resolves annotated tags only after confirming the reference exists', async () => {
    const input = fixture({ getCommit: async () => ({ data: { sha: context.sha } }) }, {
        getRef: async () => ({ data: { object: { type: 'tag', sha: 'c'.repeat(40) } } }),
    });
    await publishGitHubRelease(input);
    assert.equal(input.calls[0][0], 'create');
});

test('requires a matching published Open VSX package', async () => {
    const input = fixture();
    await assert.rejects(publishGitHubRelease({ ...input, fetcher: async () => ({ status: 404 }) }), /must be published/);
    await assert.rejects(publishGitHubRelease({ ...input, bytes: Buffer.from('other') }), /does not match/);
    assert.equal(input.calls.length, 0);
});

test('fails closed for permission errors and pull request contexts', async () => {
    const input = fixture({ getReleaseByTag: async () => { throw Object.assign(new Error('Forbidden'), { status: 403 }); } });
    await assert.rejects(publishGitHubRelease(input), /Forbidden/);
    await assert.rejects(publishGitHubRelease({ ...input, context: { ...context, eventName: 'pull_request' } }), /push to main/);
    assert.equal(input.calls.length, 0);
});
