# Agent instructions

Scope: entire repository.

- Treat `panel-checker/` as the only runtime surface. Do not revive the old Python/Gradio code without a very strong reason.
- Keep the root `README.md` (mirrored to `panel-checker/README.md`) as the source of truth for features, tech stack, and deployment
  steps. Update it whenever UX, build commands, or deployment requirements change.
- When the GitHub Pages workflow, npm scripts, or directory layout change, update `.github/workflows/*.yml`, this file, and the
  README together so instructions never drift.
- Prefer TypeScript sources; do not commit build outputs (`dist/`, `tsconfig*.tsbuildinfo`).

## Self-update policy

After every major change to build tooling, hosting, or folder structure, append a bullet to the change log below describing what
changed and why. This keeps future agents oriented.

## Change log

- 2024-05-16 – Panel Checker promoted to the repo root, Python artifacts removed, GitHub Pages workflow + docs added.
- 2025-11-16 – Multi-format (CSV/XLSX/XML) ingestion plus one-year normalization added to the Panel Checker uploader.
- 2025-11-18 – Locked Vite's base to `./` so GitHub Pages serves relative assets, updated README runbook + preview steps.
- 2025-11-19 – GitHub Pages workflow now runs `npm ci && npm run build` in one step and README runbook mirrors the combined command.
