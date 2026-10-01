const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { validateManifest, requireNewVersion, getMetadata, publish } = require('../scripts/release.cjs');

const manifest = { publisher: 'workspace-ssh-tools', name: 'remote-workspace-ssh', version: '0.1.1' };
const json = body => ({ ok: true, status: 200, json: async () => body });
const missing = { ok: false, status: 404 };

test('rejects unchanged, older, prerelease, and unexpected package identities', () => {
    for (const version of ['0.1.0', '0.0.9']) {
        assert.throws(() => requireNewVersion({ ...manifest, version }, { version: '0.1.0' }), /Increase/);
    }
    assert.throws(() => validateManifest({ ...manifest, version: '0.1.1-beta.1' }), /stable/);
    assert.throws(() => validateManifest({ ...manifest, publisher: 'another-publisher' }), /identifier/);
    assert.doesNotThrow(() => requireNewVersion(manifest, { version: '0.1.0' }));
});

test('registry outages fail version validation instead of treating the version as missing', async () => {
    await assert.rejects(getMetadata(manifest, '', async () => ({ ok: false, status: 503 })), /503/);
});

test('a version already in the pull request base fails even if the registry is behind', () => {
    assert.doesNotThrow(() => requireNewVersion(manifest, { version: '0.1.0' }));
    assert.throws(() => requireNewVersion(manifest, { version: '0.1.1' }), /Increase/);
});

test('missing credentials fail before any registry request', async () => {
    await assert.rejects(publish(manifest, Buffer.from('package'), '', {
        fetcher: () => { throw new Error('Must not request'); },
    }), /OVSX_PAT/);
});

test('rerunning an existing version does not upload it again', async () => {
    let requests = 0;
    const result = await publish(manifest, Buffer.from('package'), 'test-token', {
        fetcher: async () => { requests++; return json({ version: manifest.version }); },
    });
    assert.equal(result.alreadyPublished, true);
    assert.equal(requests, 1);
});

test('publication waits for processing and verifies the downloaded package', async () => {
    const bytes = Buffer.from('verified-package');
    const replies = [missing, json({ version: '0.1.0' }), json({ success: 'accepted' }), missing,
        json({ files: { download: 'https://open-vsx.org/api/package.vsix' } }),
        { ok: true, arrayBuffer: async () => bytes }];
    let requests = 0;
    let waits = 0;
    const result = await publish(manifest, bytes, 'private-test-token', {
        fetcher: async (url, options) => {
            if (requests === 2) {
                assert.equal(options.method, 'POST');
                assert.equal(options.body, bytes);
                assert.equal(new URL(url).searchParams.get('token'), 'private-test-token');
            }
            requests++;
            return replies.shift();
        },
        wait: async () => { waits++; },
    });
    assert.equal(result.alreadyPublished, false);
    assert.equal(result.sha256, crypto.createHash('sha256').update(bytes).digest('hex'));
    assert.equal(waits, 1);
    assert.equal(requests, 6);
});

test('failed uploads do not report success or expose the token', async () => {
    const replies = [missing, json({ version: '0.1.0' }), { ok: false, status: 401 }];
    await assert.rejects(publish(manifest, Buffer.from('package'), 'private-test-token', {
        fetcher: async () => replies.shift(),
    }), error => error.message.includes('401') && !error.message.includes('private-test-token'));
});

test('a different downloaded package fails verification', async () => {
    const replies = [missing, json({ version: '0.1.0' }), json({ success: 'accepted' }),
        json({ files: { download: 'https://open-vsx.org/api/package.vsix' } }),
        { ok: true, arrayBuffer: async () => Buffer.from('different') }];
    await assert.rejects(publish(manifest, Buffer.from('package'), 'test-token', {
        fetcher: async () => replies.shift(),
    }), /checksum/);
});
