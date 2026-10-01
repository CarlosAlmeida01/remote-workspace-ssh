const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const semver = require('semver');

const registry = 'https://open-vsx.org/api';

function validateManifest(manifest) {
    if (manifest.publisher !== 'workspace-ssh-tools' || manifest.name !== 'remote-workspace-ssh') {
        throw new Error('Unexpected extension identifier.');
    }
    if (semver.valid(manifest.version) !== manifest.version || semver.prerelease(manifest.version)) {
        throw new Error('Use a stable semantic version in package.json.');
    }
}

function requireNewVersion(manifest, published) {
    validateManifest(manifest);
    if (published && !semver.gt(manifest.version, published.version)) {
        throw new Error(`Increase package.json and package-lock.json above ${published.version} before merging.`);
    }
}

async function getMetadata(manifest, version = '', fetcher = fetch) {
    const response = await fetcher(`${registry}/${manifest.publisher}/${manifest.name}${version ? '/' + version : ''}`, {
        signal: AbortSignal.timeout(45000),
    });
    if (response.status === 404) { return null; }
    if (!response.ok) { throw new Error(`Registry lookup failed (HTTP ${response.status}).`); }
    return response.json();
}

function digest(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}

async function publish(manifest, bytes, token, options = {}) {
    validateManifest(manifest);
    if (!token) { throw new Error('OVSX_PAT is required.'); }
    const fetcher = options.fetcher || fetch;
    const wait = options.wait || (ms => new Promise(resolve => setTimeout(resolve, ms)));
    const existing = await getMetadata(manifest, manifest.version, fetcher);
    if (existing) {
        return { version: manifest.version, alreadyPublished: true };
    }
    const latest = await getMetadata(manifest, '', fetcher);
    requireNewVersion(manifest, latest);
    const response = await fetcher(`${registry}/-/publish?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: bytes,
        signal: AbortSignal.timeout(60000),
    });
    if (!response.ok) { throw new Error(`Registry publication failed (HTTP ${response.status}).`); }
    const result = await response.json();
    if (result.error) { throw new Error('The registry rejected the extension package.'); }
    for (let attempt = 0; attempt < 20; attempt++) {
        const metadata = await getMetadata(manifest, manifest.version, fetcher);
        if (metadata?.files?.download) {
            const address = new URL(metadata.files.download);
            if (address.protocol !== 'https:' || address.hostname !== 'open-vsx.org') {
                throw new Error('Unexpected registry download address.');
            }
            const download = await fetcher(address.href, { signal: AbortSignal.timeout(60000) });
            if (!download.ok) { throw new Error(`Package download failed (HTTP ${download.status}).`); }
            const publishedBytes = Buffer.from(await download.arrayBuffer());
            if (digest(bytes) !== digest(publishedBytes)) { throw new Error('Published package checksum does not match.'); }
            return { version: manifest.version, alreadyPublished: false, sha256: digest(bytes) };
        }
        await wait(15000);
    }
    throw new Error('Publication was accepted, but registry processing did not finish in time.');
}

async function main() {
    const root = path.resolve(__dirname, '..');
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
    validateManifest(manifest);
    if (lock.version !== manifest.version || lock.packages[''].version !== manifest.version) {
        throw new Error('package.json and package-lock.json versions must match.');
    }
    const mode = process.argv[2];
    if (mode === 'check') {
        if (process.env.GITHUB_EVENT_NAME === 'pull_request') {
            let baseRef = 'main';
            if (process.env.GITHUB_EVENT_PATH) {
                const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
                baseRef = event.pull_request?.base?.sha;
                if (!/^[a-f0-9]{40}$/.test(baseRef || '')) { throw new Error('Invalid pull request base commit.'); }
            }
            const baseManifest = JSON.parse(execFileSync('git', ['show', `${baseRef}:package.json`], { cwd: root, encoding: 'utf8' }));
            requireNewVersion(manifest, baseManifest);
            requireNewVersion(manifest, await getMetadata(manifest));
        }
        console.log(`Release version checked: ${manifest.version}`);
    } else if (mode === 'publish') {
        const bytes = fs.readFileSync(path.join(root, `${manifest.name}-${manifest.version}.vsix`));
        const result = await publish(manifest, bytes, process.env.OVSX_PAT);
        console.log(result.alreadyPublished ? `Version ${result.version} is already published; no upload needed.` : `Published and verified version ${result.version} (${result.sha256}).`);
    } else {
        throw new Error('Use check or publish.');
    }
}

module.exports = { validateManifest, requireNewVersion, getMetadata, publish };
if (require.main === module) {
    main().catch(error => {
        const token = process.env.OVSX_PAT;
        let message = error.message;
        if (token) { message = message.replaceAll(token, '[redacted]').replaceAll(encodeURIComponent(token), '[redacted]'); }
        console.error(message);
        process.exitCode = 1;
    });
}
