# LEEP’s SPARK Tool – System for Peak Amperage from Real kWh

```
                 /\
                /  \        _
               /    \      / \ 
----\/\-------/------\----/---\---------
         \    /        \/     \ 
          \  /                 *
           \/
        SPARK
 SYSTEM FOR PEAK AMPERAGE
      FROM REAL kWh
```

SPARK is a data-driven analysis tool developed by CanmetENERGY-Ottawa to support electrification retrofits in Canadian homes. Using historical interval meter data, SPARK calculates peak amperage and demonstrated demand so contractors can determine whether a main electrical panel actually requires an upgrade. By relying on real kWh consumption data rather than conservative assumptions, SPARK helps homeowners, utilities, and programs avoid unnecessary panel upgrades.

SPARK keeps the same mission as the original Hydro XML to Excel utility viewer: upload CSV, XLSX, or Green Button XML interval data, map its columns, visualize the demand profile, and review a plain-language verdict that summarizes continuous vs. non-continuous loads. The React + Vite experience now reflects the updated branding while preserving every parser, mapper, and chart workflow that teams rely on.

_A bilingual UI will be added later._

## Features

- ⚡️ Drag-and-drop uploader that auto-detects CSV, XLSX, and Green Button XML files, converts spreadsheets to CSV for faster parsing, and mirrors the Green Button timezone/multiplier rules with sample data for each format.
- 🧵 XLSX parsing happens inside a dedicated Web Worker (`src/workers/excelParser.ts`) so large spreadsheets do not freeze the UI; the worker shares the `src/lib/parse.ts` helpers and times out after 20 seconds if the browser never responds.
- ✅ Column mapper that validates cadence (15/30/60-minute), enforces a one-year window, and normalizes kWh/kW/Amps to amps using a 240 V
  recommended default.
- 📈 Plotly.js interactive demand chart with amps/kWh toggles, one-year coverage stats, and exportable images.
- 🧮 Plain-language panel calculator that anchors to the absolute one-year max (×1.25), differentiates continuous vs. non-continuous loads, and lets you stack what-if scenarios.
- 📄 Download-ready summary that now lists the proposed what-if loads plus an installable offline PWA shell.
- 🌐 English/French copy, large tap targets, and tablet-friendly layout for field use.

## Uploading interval data

- **CSV uploads must stay plain text.** The uploader expects standard comma-separated text (UTF-8 or ASCII). Zipped CSVs, binary Excel exports, or files that were renamed from `.xlsx` to `.csv` will fail because the parser streams the file line-by-line.
- **XLSX files are parsed in a worker.** Dragging an Excel workbook keeps you offline—the Web Worker inflates the ZIP, walks the worksheets, and streams the first sheet into the shared parsing helpers. Renaming a CSV to `.xlsx` does not gain any formatting support; the worker will surface an error as soon as it tries to unzip the fake workbook.
- **Green Button XML follows the official spec.** The parser keeps the timezone offset, multiplier, and quality flags intact so the mapper receives the raw values your utility provided.

## Troubleshooting Excel uploads

- The uploader first streams XLSX bytes through the in-browser ZIP/worksheet parser in `src/lib/parse.ts`. This keeps everything
  offline and preserves timezone or shared-string metadata.
- Some browsers occasionally block ZIP inflation APIs or strip workbook metadata. When that happens you can enable the
  **Auto-convert Excel if parsing fails** toggle underneath the uploader. After the first error the worker lazily converts the
  first worksheet to CSV text and retries with the CSV parser.
- Conversion flattens formulas, formats, and dates, so the UI surfaces an amber warning whenever the fallback is used. Only the
  first worksheet is converted, formula cells are evaluated once (no relative references), and Excel number formats may round the
  exported text. Check your timestamps/values after the retry and, if possible, upload a clean CSV export from the original tool
  once the issue is resolved.

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
   outputs the static site under `panel-checker/dist`. Vite now uses a relative `base: './'` and the router derives its `basename`
   from the browser URL, so the generated `index.html`, manifests, and runtime navigation adapt to whatever `/repo-name/` path
   GitHub Pages assigns—no manual edits are needed when you fork or rename the project.
6. **Verify the build folder.** Run `ls dist` (while still inside `panel-checker`). You should see `index.html`, `assets/`, and a
   `manifest.webmanifest`. If the folder is missing, rerun step 5 and fix any red error text.
7. **Commit your work.** From the repo root, run `git add panel-checker && git commit -m "Build panel-checker"` and push it with
   `git push` so GitHub has the latest code. You do **not** need to commit the `dist/` folder because the workflow below rebuilds
   it for you.
8. **Enable GitHub Pages.** In your fork, open **Settings → Pages**. Under **Build and deployment**, choose **Source: GitHub
   Actions**. Save.
9. **Review the workflow.** GitHub automatically picks up `.github/workflows/deploy-panel-checker.yml`, installs Node 20, runs
   `npm ci && npm run build` inside `panel-checker/`, and uploads `panel-checker/dist` as the artifact GitHub Pages serves.
10. **Watch the deployment.** Go to the **Actions** tab, open the "Deploy panel-checker to Pages" workflow run, and wait for the
    green check marks. The **deploy** job shows the published URL (usually
    `https://<your-username>.github.io/<repo-name>/`).
11. **Test the site.** Visit the published URL in a new browser tab. Use the "Try sample data" option if you do not have a CSV
    handy and confirm that the chart, calculator, and report tabs load.
12. **Repeat after changes.** Every push to `main` reruns the workflow. If you make a major UI or build change, ensure the README
    and this runbook stay accurate (see `AGENTS.md`).

## Preview the GitHub Pages path locally

GitHub Pages hosts this Vite build under a `/hydro-xml-to-excel/` subpath (or the name of your fork). Because the app emits
relative URLs you can mimic that subpath locally before pushing:

```bash
cd panel-checker
npm install
npm run build
npm run preview
```

Then visit `http://localhost:4173/hydro-xml-to-excel/` (replace `hydro-xml-to-excel` with your repository name if you forked the
project). The preview server falls back to `index.html` for deep links, so browsing to that prefixed URL mirrors GitHub Pages and
confirms that icons, the manifest, and bundled JavaScript load from relative paths.

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

## License

LEEP’s SPARK Tool is distributed under NRCan’s LEEP SPARK Tool End-User Licence Agreement. See the `LICENSE` file in this repository or review the official agreement at https://hvac-tool-outil-cvca.nrcan-rncan.gc.ca/license for the full terms.
