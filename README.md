# Remote Workspace SSH

Open a remote workspace over SSH from a compatible VS Code based editor. This distribution fixes Windows proxy command paths, normalizes setup scripts for Linux, and adds connection links with destination confirmation.

**Extension ID:** `workspace-ssh-tools.remote-workspace-ssh`

**License:** MIT

**Source:** [GitHub](https://github.com/CarlosAlmeida01/remote-workspace-ssh)

**Install:** [Open VSX](https://open-vsx.org/extension/workspace-ssh-tools/remote-workspace-ssh)

## What is different?

Based on [Open Remote - SSH 0.3.1](https://github.com/jeanp413/open-remote-ssh/tree/v0.3.1). The original already supports Windows-to-Linux SSH. The changes here address specific connection problems:

- Preserve Windows backslashes in `ProxyCommand`, including paths with spaces and UNC paths.
- Keep the original POSIX command escaping behavior.
- Convert CRLF to LF before sending setup scripts to Linux.
- Open a configured SSH alias and remote folder through a connection link, with confirmation.
- Use independent command and host-view identifiers.

The extension is not exclusive to Kiro or Coder. The tested workflow is **Kiro on Windows connecting to a Linux Coder workspace**. Other editors must provide the remote resolver APIs; their runtime compatibility has not been verified in this release.

## Install and connect in Kiro

1. Search for `@id:workspace-ssh-tools.remote-workspace-ssh` in Extensions and install **Remote Workspace SSH**.
2. Enable the required proposed APIs. Close Kiro and launch it once with:

   ```powershell
   kiro --enable-proposed-api workspace-ssh-tools.remote-workspace-ssh
   ```

   For normal launches, run **Preferences: Configure Runtime Arguments**, add the following property to the existing JSON object, and restart Kiro. Preserve any existing entries and other settings:

   ```json
   "enable-proposed-api": ["workspace-ssh-tools.remote-workspace-ssh"]
   ```

   Registry installation alone does not enable these APIs (`resolvers` and `contribViewsRemote`).
3. Configure a host alias in your local SSH configuration. When using Coder, install and authenticate its CLI and generate the SSH configuration for your workspace.
4. Run **Remote-SSH: Connect to Host...**, choose the host, and open your remote project folder.

Use one SSH resolver per editor profile. Disable or uninstall competing SSH providers, including earlier publications of this distribution, before switching. Shared `remote.SSH.*` settings remain compatible.

### Connection links

After configuring an SSH alias named `my-workspace`, this example opens a Linux project folder:

```text
kiro://workspace-ssh-tools.remote-workspace-ssh/connect?host=my-workspace&folder=%2Fhome%2Fcoder%2Fprojects
```

The link accepts only `host` and `folder`. The extension asks for confirmation; credentials and commands cannot be supplied in the link. The standard Coder Remote button may not recognize this extension ID. Use the command palette or a connection link in that case.

## Build from source

Requires Node.js 22 and Git. For the Git dependency, configure HTTPS transport for the install in your current process:

**PowerShell**

```powershell
$env:GIT_CONFIG_COUNT = '1'
$env:GIT_CONFIG_KEY_0 = 'url.https://github.com/.insteadOf'
$env:GIT_CONFIG_VALUE_0 = 'ssh://git@github.com/'
```

**Linux / macOS**

```sh
export GIT_CONFIG_COUNT=1
export GIT_CONFIG_KEY_0=url.https://github.com/.insteadOf
export GIT_CONFIG_VALUE_0=ssh://git@github.com/
```

Then run:

```sh
npm ci --ignore-scripts
npm run update:dts
npm run lint:release
npm run test:release
npm run test:local
npm run package
```

Packaging builds the production bundle. `test:local` covers proxy paths, script line endings, and connection parameter validation. The inherited integration tests require Docker fixtures and are separate from these checks. Editor declarations are downloaded by `update:dts`; the SSH dependency is locked to a specific upstream commit.

## Contributions and access

The source is public: anyone can read it, fork it, or propose a pull request. Only the owner and explicitly authorized collaborators have direct write access. The maintainer decides which changes are merged. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Releases

Changes to `main` must come through a pull request and pass the `verify` check. Carlos Almeida is the code owner and reviews contributions. Only his account has a review exception for merges through pull requests; the mandatory tests and PR requirement still apply to that account.

Each pull request must increase the extension version. Before committing, run:

```sh
npm version patch --no-git-tag-version --ignore-scripts
```

Use `minor` or `major` when appropriate, and describe the change in `CHANGELOG.md`. This updates both `package.json` and `package-lock.json`. The pipeline rejects versions that have already been published or are older than the registry version.

After merge, GitHub Actions runs the checks and builds the VSIX without publication credentials. A separate job publishes that checked artifact using `OVSX_PAT`, stored in the `open-vsx` environment. That environment permits only the `main` branch; working branches and pull requests cannot access its secret. Publication waits for registry processing and verifies the downloaded package checksum. Rerunning an already published version does not upload it again.

After Open VSX verification, the publication job creates a GitHub Release with the version tag, release notes, and the checked VSIX as an attachment. It publishes the release after uploading the asset. Reruns resume matching drafts and reject conflicting tags or artifacts. Only the main publication job has repository write permission, using the workflow's temporary GitHub token.

For a release problem, revert through a pull request and publish a higher version. Published versions cannot be overwritten. If registry processing or release creation was interrupted, rerun the failed workflow before making another release.

## Security and privacy

Use your configured SSH authentication. Never include credentials in links, logs, or distribution files. This distribution adds no telemetry or custom backend. Remote editor server downloads use the services configured by the editor. Project applications, templates, container images, and application data are not installed or changed by these modifications.

## License and credits

The original MIT license and warranty disclaimer are preserved in [LICENSE.txt](LICENSE.txt). [THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt) includes dependency licenses and credits.

Based on the public Open Remote - SSH source by Jean Pierre (`jeanp413`), with modifications by Carlos Almeida. The Windows path changes relate to [upstream issue 309](https://github.com/jeanp413/open-remote-ssh/issues/309). This is an independent distribution, not an official product of Coder, Kiro, AWS, or TOTVS. Product names and trademarks belong to their owners. The internal corporate VSIX is not redistributed.
