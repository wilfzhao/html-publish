---
name: publish-html-prototype
description: Publish, deploy, push, update, or inspect a static HTML prototype in HTML Publish and return its preview URL. Use for requests to send the current HTML, Vite, React, Vue, or other statically built prototype to a named or already linked prototype project, create a new prototype version, check a deployment, or configure the current repository for HTML Publish. Do not create a new remote project unless the user explicitly asks.
---

# Publish HTML Prototype

Use the `html-publish` CLI for all server operations. Do not recreate its API calls with `curl`.

## Workflow

1. Confirm the current directory is the prototype workspace. In a monorepo, locate the directory containing the prototype HTML or its static build configuration; do not bind a platform/backend root. Dynamic server output such as `.next` is not a deployable static artifact unless the project explicitly exports static HTML.
2. Run `html-publish inspect` from that prototype workspace.
3. If no project is linked, ask for the target project only when it is not clear from the request. Then run `html-publish link --project "<id, slug, or exact name>"`.
4. If authentication is missing, ask the user to create a project deploy token in HTML Publish. Have the user run `html-publish login`; never request that they paste a token into chat or commit it to the repository.
5. Review the detected output directory, entry file, file count, and build command. Correct `.html-publish.json` when detection is wrong.
6. Run `html-publish deploy --note "<concise change summary>"`. Let the CLI execute the configured build command. Use `--skip-build` only when the user explicitly wants to publish existing output.
7. On success, report the project, version, preview URL, and version URL emitted by the CLI.
8. On failure, preserve the CLI error code and message. Fix local build or configuration errors when safe, then retry with the same `--idempotency-key` if the first request may have reached the server.

## Configuration

Store non-secret project binding in `.html-publish.json`. Keep credentials in the CLI credential store or `HTML_PUBLISH_TOKEN`; never write tokens into project files.

Use these commands as needed:

```bash
html-publish projects "project name"
html-publish link --project "project slug"
html-publish inspect
html-publish deploy --note "change summary"
html-publish status DEPLOYMENT_ID
```

If `html-publish` is unavailable while working inside the HTML Publish source repository, invoke `node packages/html-publish-cli/bin/html-publish.mjs` with the same arguments. Otherwise stop and tell the user the CLI must be installed.
