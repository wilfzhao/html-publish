---
name: publish-html-prototype
description: Publish, deploy, push, update, or inspect a static HTML prototype in HTML Publish and return its preview URL. Use for requests to send the current HTML, Vite, React, Vue, or other statically built prototype to a named or already linked prototype project, create a new prototype version, check a deployment, or configure the current repository for HTML Publish. Do not create a new remote project unless the user explicitly asks.
---

# Publish HTML Prototype

Use the `html-publish` CLI for all server operations. Do not recreate its API calls with `curl`.

## Workflow

1. Confirm the current directory is the prototype workspace. In a monorepo, locate the directory containing the prototype HTML or its static build configuration; do not bind a platform/backend root. Dynamic server output such as `.next` is not a deployable static artifact unless the project explicitly exports static HTML.
2. Run `html-publish inspect` from that prototype workspace.
3. If no project is linked, or the linked project differs from the user's explicit target, ask for the target only when it is unclear. Run `html-publish link --project "<id, slug, or exact name>"`. The CLI selects a saved project credential or opens browser authorization automatically. Tell the user to choose the requested project and click Allow, then keep waiting for the same CLI process. Never ask for a token or tell the user to run `html-publish login`.
4. Review the detected output directory, entry file, file count, and build command. Correct `.html-publish.json` when detection is wrong.
5. Run `html-publish deploy --note "<concise change summary>"`. When the user provides a version, pass it with `--version "<version>"` (for example `--version "v0.2.0"`). Let the CLI execute the configured build command. Use `--skip-build` only when the user explicitly wants to publish existing output.
6. On success, report the project, version, preview URL, and version URL emitted by the CLI.
7. On failure, preserve the CLI error code and message. Fix local build or configuration errors when safe, then retry with the same `--idempotency-key` if the first request may have reached the server. If an older CLI returns `No accessible project matched`, update the CLI and rerun `link`; do not redirect the user to manual login.

## Configuration

Store non-secret project binding in `.html-publish.json`. Let the browser authorization flow store credentials in the CLI credential store; never write tokens into project files.

Use these commands as needed:

```bash
html-publish projects "project name"
html-publish link --project "project slug"
html-publish inspect
html-publish deploy --note "change summary"
html-publish deploy --version "v0.2.0" --note "change summary"
html-publish status DEPLOYMENT_ID
```

If `html-publish` is unavailable while working inside the HTML Publish source repository, invoke `node packages/html-publish-cli/bin/html-publish.mjs` with the same arguments. Otherwise stop and tell the user the CLI must be installed.
