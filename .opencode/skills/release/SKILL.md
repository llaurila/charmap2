---
name: release
description: Prepare, verify, tag, and push Charmap2 releases with the correct version, changelog, and repo-specific checks.
---

## What I do

Use this skill when the user asks for a Charmap2 release, for example `release v0.1.2`.

This skill handles the full release flow for this repository:

- bump the app version everywhere it must stay in sync
- move `CHANGELOG.md` entries from `Unreleased` into a dated release section
- verify the release with lint, tests, and a production build
- create the release commit
- create the git tag
- push the release commit and tag

## Source Of Truth

- `package.json` is the source of truth for the app version
- `package-lock.json` must match `package.json`
- the runtime app version is injected from `package.json` through `vite.config.ts`
- the footer displays the runtime app version, so a version bump must keep the app metadata aligned

## Repo-Specific Release Rules

- tags use the format `vX.Y.Z`
- do not reuse an existing tag; check first
- release changes should land on `main`
- GitHub Pages deploys on push to `main`, not on tag push alone
- CI also runs on push to `main`
- before tagging, make sure the working tree is clean except for intentional release changes

## Required File Updates

For a release like `v0.1.2`:

1. Set `package.json` `version` to `0.1.2`
2. Set the root package version fields in `package-lock.json` to `0.1.2`
3. Update `CHANGELOG.md`
   - move all relevant items out of `## [Unreleased]`
   - create a new section `## [0.1.2] - YYYY-MM-DD`
   - keep unreleased notes empty or leave an empty `Unreleased` heading for future work

## Verification Steps

Run these commands before committing the release:

```bash
npm run lint
npm test
npm run build
```

If any command fails, fix the issue before continuing.

## Git Release Flow

After the files are updated and checks pass:

```bash
git status --short --branch
git tag --list
git add package.json package-lock.json CHANGELOG.md [any other release-touched files]
git commit -m "release v0.1.2"
git tag v0.1.2
git push origin main
git push origin v0.1.2
```

Adjust the version in the commit and tag names to match the requested release.

## Post-Release Checks

After pushing:

- verify CI passed
- verify the GitHub Pages deploy succeeded
- optionally create a GitHub Release from the tag with notes based on `CHANGELOG.md`

Use `gh` for GitHub follow-up tasks if the user asks.

## Guardrails

- never create or push a release tag without an explicit user request
- if the requested tag already exists, stop and tell the user
- if the branch is not `main`, tell the user and ask for direction before tagging/pushing
- if there are unrelated uncommitted changes, stop and ask before bundling them into a release commit
- do not use `git commit --amend` unless the user explicitly asks and it is safe
- do not force-push

## Release Checklist

- confirm target version
- update `package.json`
- update `package-lock.json`
- finalize `CHANGELOG.md`
- run lint, tests, and build
- commit the release
- tag the release
- push `main`
- push the tag
- verify CI and Pages
