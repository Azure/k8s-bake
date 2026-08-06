# Changelog

## [4.1.1] - 2026-08-06

### Fixed

- #289 [Write baked manifest into the workspace](https://github.com/Azure/k8s-bake/pull/289)

### Security

- #290 [Bump undici from 6.27.0 to 6.28.0](https://github.com/Azure/k8s-bake/pull/290)
- #288 [Bump github/codeql-action and Azure/action-release-workflows in /.github/workflows](https://github.com/Azure/k8s-bake/pull/288)
- #287 [Bump @types/node from 26.1.1 to 26.1.2 and prettier from 3.9.5 to 3.9.6](https://github.com/Azure/k8s-bake/pull/287)
- #285 [Bump actions/checkout, actions/setup-node, and github/codeql-action in /.github/workflows](https://github.com/Azure/k8s-bake/pull/285)
- #283 [Bump @types/node, prettier, typescript from 6.0.2 to 7.0.2, and vitest](https://github.com/Azure/k8s-bake/pull/283)
- #278 [Bump @types/node from 26.0.0 to 26.0.1 and prettier from 3.8.4 to 3.9.3](https://github.com/Azure/k8s-bake/pull/278)
- #277 [Bump actions/checkout from 6.0.3 to 7.0.0 in /.github/workflows](https://github.com/Azure/k8s-bake/pull/277)
- #276 [Bump semver from 7.8.4 to 7.8.5 and @types/node from 25.9.3 to 26.0.0](https://github.com/Azure/k8s-bake/pull/276)

## [4.1.0] - 2026-06-17

### Changed

- #257 [Switch to current k8s download URLs](https://github.com/Azure/k8s-bake/pull/257)
- #267 [Remove deprecated release workflow and pin actions to SHA](https://github.com/Azure/k8s-bake/pull/267)

### Fixed

- #270 [Use chmod 755 instead of 777 for downloaded helm binary and folder](https://github.com/Azure/k8s-bake/pull/270)

### Security

- #273 [Bump esbuild from 0.28.0 to 0.28.1](https://github.com/Azure/k8s-bake/pull/273)
- #268 [Bump vitest from 4.1.7 to 4.1.8](https://github.com/Azure/k8s-bake/pull/268)
- #263 [Bump @types/node from 25.6.2 to 25.9.0](https://github.com/Azure/k8s-bake/pull/263)
- Version bumps

## [4.0.0] - 2026-04-17

### Changed

- #252 [Migrate project to ESM with esbuild and vitest](https://github.com/Azure/k8s-bake/pull/252)
- #243 [Update Node.js runtime from node20 to node24](https://github.com/Azure/k8s-bake/pull/243)
- #225 [Fix Helm cached tool path](https://github.com/Azure/k8s-bake/pull/225)

### Security

- #250 [Bump handlebars from 4.7.8 to 4.7.9](https://github.com/Azure/k8s-bake/pull/250)
- #248 [Bump picomatch](https://github.com/Azure/k8s-bake/pull/248)
- #245 [Bump undici from 6.23.0 to 6.24.1](https://github.com/Azure/k8s-bake/pull/245)
- #240 [Bump minimatch](https://github.com/Azure/k8s-bake/pull/240)
- #237 [Bump undici and @actions/http-client](https://github.com/Azure/k8s-bake/pull/237)
- Version bumps

## [3.0.4] - 2025-12-11

- #221 [Updated default versions for kompose/helm/kubectl](https://github.com/Azure/k8s-bake/pull/221)
- #218 [Added semver range support for helm-version input with ^3.0.0 default](https://github.com/Azure/k8s-bake/pull/218)
- #211 [Added helm version check to support v4+](https://github.com/Azure/k8s-bake/pull/211)
- Version bumps

## [3.0.3] - 2025-12-01

### Updated

- Version Bumps

## [3.0.2] - 2025-08-06

### Changed

- #168 A[dding a check for cached version](https://github.com/Azure/k8s-bake/pull/168)
- #163 [Add husky pre-commit hook.](https://github.com/Azure/k8s-bake/pull/163)
- #160 [Fix the --no-bin-links break.](https://github.com/Azure/k8s-bake/pull/160)
- #151 [Fix/jest type test](https://github.com/Azure/k8s-bake/pull/151)
- #128 [Security: remove updated action and fix prettier](https://github.com/Azure/k8s-bake/pull/128)
- #127 [Add code quality Analysis and pin SHA for GH](https://github.com/Azure/k8s-bake/pull/127)

## [3.0.1] - 2024-09-06

### Changed

- #102 Upgrade dev dependencies
- #101 Add dependabot

## [3.0.0] - 2024-3-7

### Changed

- Upgrade to node 20 as node 16 is deprecated

### Added

- Update release process to use Azure release workflows
