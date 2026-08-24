# Version management

`package.json` is the only version number that is edited by people. The sidebar, CLI package, Docker image metadata, and deployment manifest derive their versions from it.

## During development

Run:

```bash
npm run version:info
```

The local UI refreshes this information every five seconds and when the browser regains focus:

- `0.1.7-dev+b073e18` — committed development state.
- `0.1.7-dev+b073e18.dirty` — local files differ from the commit.
- `0.1.7` — clean commit tagged `v0.1.7`, or a release container.

Build a local development image with an unambiguous commit-based tag:

```bash
npm run image:build:dev
```

This produces a tag such as `harbor.dgmed.cn/sjwj/html-publish:dev-b073e18` and adds OCI version, revision, and build-time labels.

## Prepare and publish a release

Choose the next semantic version and synchronize all derived files with one command:

```bash
npm run version:set -- 0.1.8
npm run build
git add package.json package-lock.json packages/html-publish-cli/package.json deploy/kuboard.yaml
git commit -m "release: v0.1.8"
git tag v0.1.8
git push origin main
git push origin v0.1.8
npm run image:release
```

`image:release` refuses to publish unless the working tree is clean and the current commit has the matching `v<version>` tag. It pushes both immutable `v0.1.8` and moving `latest` tags.

Use semantic versioning:

- Patch (`0.1.8`): fixes without intentional compatibility changes.
- Minor (`0.2.0`): backward-compatible features.
- Major (`1.0.0`): breaking behavior or contracts.
