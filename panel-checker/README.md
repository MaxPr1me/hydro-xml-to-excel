# Panel Checker

Panel Checker helps electricians, energy advisors, and DER installers decide if an electrical panel has enough headroom for an added
load. Upload CSV, XLSX, or Green Button XML interval data, map its columns, visualize the demand profile, and read a plain-
language verdict that summarizes continuous vs. non-continuous loads. This React + Vite experience replaces the original
"Hydro XML to Excel" Gradio demo while keeping the same goal: turn raw utility interval data into a confident go/no-go answer.

## Features

- ⚡️ Drag-and-drop uploader that auto-detects CSV, XLSX, and Green Button XML files with sample data for each format.
- ✅ Column mapper that validates cadence (15/30/60-minute), enforces a one-year window, and normalizes kWh/kW/Amps to amps using a 120 V default.
- 📈 Plotly.js interactive demand chart with amps/kWh toggles, one-year coverage stats, and exportable images.
- 🧮 Plain-language panel calculator that anchors to the absolute one-year max (×1.25), differentiates continuous vs. non-continuous loads, and lets you stack what-if scenarios.
- 📄 Download-ready summary plus an installable offline PWA shell.
- 🌐 English/French copy, large tap targets, and tablet-friendly layout for field use.

## Tech stack

- [Vite](https://vitejs.dev/) + [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/) utility styling
- [Papa Parse](https://www.papaparse.com/) for CSV ingestion
- [Zod](https://github.com/colinhacks/zod) runtime validation
- [Plotly](https://plotly.com/javascript/) charts
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) for offline installs

## Local development

```bash
cd panel-checker
npm install
npm run dev
```

The development server prints a local URL plus a network URL so you can test on another device. Press `Ctrl+C` to stop it.

## Build for GitHub Pages (step-by-step)

These steps assume you are comfortable cloning a repo but want very explicit directions for enabling GitHub Pages. Follow them in
order; check off each step before moving on.

1. **Fork the repo on GitHub.** Click the Fork button on the top-right of the repository page so you have your own copy.
2. **Clone your fork.** In a terminal run `git clone <your-fork-url>` and then `cd hydro-xml-to-excel`.
3. **Install Node.js 18+ if needed.** Download it from [nodejs.org](https://nodejs.org/) and rerun the previous step once
   `node -v` works.
4. **Install dependencies.** Run `cd panel-checker && npm install`. This grabs React, Vite, Plotly, etc.
5. **Create a production build.** Still inside `panel-checker`, run `npm run build`. The command performs a strict type-check and
   outputs the static site under `panel-checker/dist`.
6. **Verify the build folder.** Run `ls dist` (while still inside `panel-checker`). You should see `index.html`, `assets/`, and a
   `manifest.webmanifest`. If the folder is missing, rerun step 5 and fix any red error text.
7. **Commit your work.** From the repo root, run `git add panel-checker && git commit -m "Build panel-checker"` and push it with
   `git push` so GitHub has the latest code. You do **not** need to commit the `dist/` folder because the workflow below rebuilds
   it for you.
8. **Enable GitHub Pages.** In your fork, open **Settings → Pages**. Under **Build and deployment**, choose **Source: GitHub
   Actions**. Save.
9. **Review the workflow.** GitHub automatically picks up `.github/workflows/deploy-panel-checker.yml`, installs Node 20, runs
   `npm ci`, builds the site, and uploads `panel-checker/dist` as the artifact GitHub Pages serves.
10. **Watch the deployment.** Go to the **Actions** tab, open the "Deploy Panel Checker to Pages" workflow run, and wait for the
    green check marks. The **deploy** job shows the published URL (usually
    `https://<your-username>.github.io/<repo-name>/`).
11. **Test the site.** Visit the published URL in a new browser tab. Use the "Try sample data" option if you do not have a CSV
    handy and confirm that the chart, calculator, and report tabs load.
12. **Repeat after changes.** Every push to `main` reruns the workflow. If you make a major UI or build change, ensure the README
    and this runbook stay accurate (see `AGENTS.md`).

## Repository layout

```
panel-checker/          # React + Vite app and build scripts
├── public/             # Static assets, manifest, icons, sample CSV
├── src/                # Components, pages, lib helpers
├── types/              # Extra .d.ts shims for tooling
├── package.json        # npm scripts and dependencies
└── vite.config.ts      # PWA-enabled build config
```

The legacy Python app (`app.py` + `requirements.txt`) has been removed from this branch so that the focus stays on the static web
app that runs on GitHub Pages.
