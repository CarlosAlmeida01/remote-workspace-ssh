const crypto = require('node:crypto');
const { validateManifest, getMetadata } = require('./release.cjs');

const digest = bytes => `sha256:${crypto.createHash('sha256').update(bytes).digest('hex')}`;

async function publishGitHubRelease({ github, context, manifest, bytes, fetcher = fetch }) {
    validateManifest(manifest);
    if (context.ref !== 'refs/heads/main' || context.eventName !== 'push') {
        throw new Error('GitHub releases are only created after a push to main.');
    }
    const metadata = await getMetadata(manifest, manifest.version, fetcher);
    const downloadUrl = new URL(metadata?.files?.download || 'https://invalid.example');
    if (downloadUrl.protocol !== 'https:' || downloadUrl.hostname !== 'open-vsx.org') {
        throw new Error('The extension must be published to Open VSX before creating a GitHub release.');
    }
    const download = await fetcher(downloadUrl.href, { signal: AbortSignal.timeout(60000) });
    if (!download.ok || digest(Buffer.from(await download.arrayBuffer())) !== digest(bytes)) {
        throw new Error('Open VSX package does not match the checked artifact.');
    }

    const repo = context.repo;
    const tag = `v${manifest.version}`;
    const name = `${manifest.name}-${manifest.version}.vsix`;
    let release;
    try {
        release = (await github.rest.repos.getReleaseByTag({ ...repo, tag })).data;
    } catch (error) {
        if (error.status !== 404) { throw error; }
    }
    if (release?.prerelease) {
        throw new Error('The existing release is not a stable release.');
    }
    let taggedCommit;
    try {
        taggedCommit = (await github.rest.repos.getCommit({ ...repo, ref: tag })).data.sha;
    } catch (error) {
        if (error.status !== 404) { throw error; }
    }
    if (taggedCommit && taggedCommit !== context.sha) {
        throw new Error('The release tag points to a different commit.');
    }
    if (!release) {
        release = (await github.rest.repos.createRelease({
            ...repo, tag_name: tag, target_commitish: context.sha,
            name: `${manifest.displayName} ${manifest.version}`,
            body: `Published and verified on [Open VSX](https://open-vsx.org/extension/${manifest.publisher}/${manifest.name}).\n\nThe attached VSIX is the artifact verified by this workflow.`,
            generate_release_notes: true, draft: true, prerelease: false,
        })).data;
    }
    const asset = release.assets.find(item => item.name === name);
    if (asset) {
        if (asset.digest !== digest(bytes)) {
            throw new Error('The existing release asset does not match the checked artifact.');
        }
    } else {
        await github.rest.repos.uploadReleaseAsset({
            ...repo, release_id: release.id, name, data: bytes,
            headers: { 'content-type': 'application/octet-stream', 'content-length': bytes.length },
        });
    }
    if (release.draft) {
        release = (await github.rest.repos.updateRelease({
            ...repo, release_id: release.id, draft: false, make_latest: 'true',
        })).data;
    }
    return release.html_url;
}

module.exports = { publishGitHubRelease };
