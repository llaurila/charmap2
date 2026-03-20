# Contributing

Thanks for your interest in Charmap2.

## Before you start

- Read `README.md` for project goals and local development commands.
- Read `SPECS.md` before proposing changes that would alter product scope or core behavior.
- For substantial changes, open an issue or discussion first so the direction is clear before implementation work starts.

## Local setup

```bash
npm install
npm run dev
```

Other useful commands:

```bash
npm test
npm run build
npm run vendor:unicode
npm run generate:unicode
```

## Development notes

- The app is a static Vite + React + TypeScript project.
- Unicode source files are vendored under `vendor/unicode/17.0.0/`.
- Generated runtime assets are written under `public/unicode/17.0.0/`.
- Search and detail behavior should stay aligned with `SPECS.md` unless the spec is intentionally being revised.

## Pull requests

Please try to keep pull requests focused and reviewable.

- Explain the user-facing problem being solved.
- Mention any spec changes explicitly.
- Include tests when logic changes are introduced.
- Run `npm test` and `npm run build` before submitting.

## Generated files

This repository currently commits generated Unicode JSON assets so the app can run without an extra data-generation step after checkout. If you change the ingestion pipeline or vendored Unicode inputs, include the corresponding generated output changes in the same pull request.

If we later change the source-of-truth policy for generated artifacts, this document should be updated accordingly.

## Code of conduct

By participating in this project, you agree to follow `CODE_OF_CONDUCT.md`.
