# Changelog

## 0.1.3

- Create GitHub Releases automatically after verified Open VSX publication.
- Attach the checked VSIX and reject conflicting release tags or packages.

## 0.1.2

- Restrict publication credentials to the main branch deployment environment.
- Publish the checked VSIX from a separate job.

## 0.1.1

- Publish new versions automatically after merge to main.
- Validate release versions and verify the published package checksum.

## 0.1.0

- Publish as `workspace-ssh-tools.remote-workspace-ssh` with a public source repository.
- Preserve Windows paths in SSH proxy commands and normalize Linux setup scripts.
- Add connection links with destination confirmation.
- Use independent command and host-view identifiers.
- Include focused tests and third-party license notices.

Based on Open Remote - SSH 0.3.1. Original license terms are preserved in `LICENSE.txt`.
