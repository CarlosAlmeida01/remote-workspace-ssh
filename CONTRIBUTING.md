# Contributing

Report reproducible problems through GitHub Issues. Include the editor version, client and server operating systems, and redacted connection logs. Never include credentials or private host details.

To propose a change, fork the repository, create a branch, and open a pull request. Explain the problem, the change, and how you tested it. Discuss larger changes in an issue first. Follow the build instructions in the README and run the release checks, `npm run test:local`, and `npm run package` before submitting.

Public access does not grant write access. Authorized collaborators can push working branches. Direct commits to `main` are blocked for everyone. Pull requests must pass verification, and contributions require review from Carlos Almeida. Only his account can use the review exception through a pull request; it does not bypass verification or allow direct pushes.

Every pull request must increment the package version and update the changelog. Merging to `main` automatically publishes the checked package to Open VSX. Pull request workflows have no publication token, and pull requests do not publish packages before merge.

Keep discussions respectful and focused on the work. Preserve existing copyright notices and include the source and license of any new dependency. Contributions are distributed under this project's MIT license.
