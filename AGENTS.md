# Agent instructions

Scope: entire repository.

- Treat `panel-checker/` as the only runtime surface. Do not revive the old Python/Gradio code without a very strong reason.
- Keep the root `README.md` (mirrored to `panel-checker/README.md`) as the source of truth for features, tech stack, and deployment
  steps. Update it whenever UX, build commands, or deployment requirements change.
- When the GitHub Pages workflow, npm scripts, or directory layout change, update `.github/workflows/*.yml`, this file, and the
  README together so instructions never drift.
- Prefer TypeScript sources; do not commit build outputs (`dist/`, `tsconfig*.tsbuildinfo`).
- Keep URLs, workflow triggers, and metadata fork-friendly: prefer relative links, resolve branches via the repo default, and avoid
  hard-coding org/user names or site hosts.


- Any task that changes UI copy, labels, tooltips, validation/errors, or documentation must be completed in both Canadian English and Canadian French.

### Bilingual contributor checklist

- Add or modify i18n keys in both English and French locales.
- Verify the language toggle updates the full UI without resetting state.
- Search for untranslated hardcoded strings before committing.
- Confirm no analysis, parsing, or calculation logic changed.

## Self-update policy

After every major change to build tooling, hosting, or folder structure, append a bullet to the change log below describing what
changed and why. This keeps future agents oriented.

## Change log

- 2026-02-12 – Added bilingual (EN-CA/FR-CA) UI policy and checklist to enforce copy parity and protect immutable calculation logic.
- 2024-05-16 – Panel Checker promoted to the repo root, Python artifacts removed, GitHub Pages workflow + docs added.
- 2025-11-16 – Multi-format (CSV/XLSX/XML) ingestion plus one-year normalization added to the Panel Checker uploader.
- 2025-11-18 – Locked Vite's base to `./` so GitHub Pages serves relative assets, updated README runbook + preview steps.
- 2025-11-19 – GitHub Pages workflow now runs `npm ci && npm run build` in one step and README runbook mirrors the combined command.
- 2025-11-20 – Vite base switched to `./`, BrowserRouter basename now resolves at runtime, and docs updated so forks deploy to GitHub Pages without manual path edits.
- 2025-11-21 – GitHub Pages workflow now targets the repo's default branch and app metadata uses relative URLs for forks.
- 2025-11-22 – Added fork-friendly coding policy to keep branches, URLs, and org names dynamic.

## Tasks

- 2025-11-23 – Harden interval parsing: decouple timestamp detection from column position, infer cadence from larger samples, and surface clear errors when cadence exceeds 60 minutes or rows are irregular.
- 2025-11-23 – Remove Excel auto-conversion fallback from the UI, worker, and helpers so only the primary CSV/XLSX/XML parsers run.
- 2025-11-23 – Add upload mode toggle for flexible data vs. NS Power SMOC files, implement a dedicated SMOC parser that derives amperage across phases, and route the chosen mode through the analyzer.
- 2025-11-23 – Update copy, documentation, and tests to cover the new modes, NS Power assumptions, and the refreshed parsing rules.
