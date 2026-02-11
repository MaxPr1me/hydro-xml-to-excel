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
- All future UI work must align with WET-BOEW and the Canada.ca Content Style Guide:
  - https://github.com/wet-boew/wet-boew
  - https://design.canada.ca/style-guide/
- UI do/don't rules for contributors:
  - Do use GCWeb/WET patterns and semantic landmarks (header, main, footer, skip links).
  - Do keep forms accessible: explicit labels, hint text, keyboard support, focus management, and error summaries that link to fields.
  - Do keep headings task-based and plain-language per Canada.ca style guidance.
  - Don't introduce UI frameworks or CSS resets that conflict with WET/GCWeb behaviour.
  - Don't change parsing/calculation/export logic without explicit approval in the task scope.

## Self-update policy

After every major change to build tooling, hosting, or folder structure, append a bullet to the change log below describing what
changed and why. This keeps future agents oriented.

## Change log

- 2024-05-16 – Panel Checker promoted to the repo root, Python artifacts removed, GitHub Pages workflow + docs added.
- 2025-11-16 – Multi-format (CSV/XLSX/XML) ingestion plus one-year normalization added to the Panel Checker uploader.
- 2025-11-18 – Locked Vite's base to `./` so GitHub Pages serves relative assets, updated README runbook + preview steps.
- 2025-11-19 – GitHub Pages workflow now runs `npm ci && npm run build` in one step and README runbook mirrors the combined command.
- 2025-11-20 – Vite base switched to `./`, BrowserRouter basename now resolves at runtime, and docs updated so forks deploy to GitHub Pages without manual path edits.
- 2025-11-21 – GitHub Pages workflow now targets the repo's default branch and app metadata uses relative URLs for forks.
- 2025-11-22 – Added fork-friendly coding policy to keep branches, URLs, and org names dynamic.
- 2026-02-11 – Refreshed SPA UI shell to GCWeb/WET patterns, added EN/FR route toggle wiring, and documented Canada.ca content/accessibility rules to keep future UI updates compliant.
- 2026-02-11 – Added a GitHub Pages `404.html` SPA fallback + index deep-link restoration so `/en` and `/fr` routes resolve to `index.html` on forks without hard-coded repo paths.

## Tasks

- 2025-11-23 – Harden interval parsing: decouple timestamp detection from column position, infer cadence from larger samples, and surface clear errors when cadence exceeds 60 minutes or rows are irregular.
- 2025-11-23 – Remove Excel auto-conversion fallback from the UI, worker, and helpers so only the primary CSV/XLSX/XML parsers run.
- 2025-11-23 – Add upload mode toggle for flexible data vs. NS Power SMOC files, implement a dedicated SMOC parser that derives amperage across phases, and route the chosen mode through the analyzer.
- 2025-11-23 – Update copy, documentation, and tests to cover the new modes, NS Power assumptions, and the refreshed parsing rules.
