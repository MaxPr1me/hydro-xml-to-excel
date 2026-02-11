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

SPARK keeps the same mission as the original Hydro XML to Excel utility viewer: upload CSV, XLSX, or Green Button XML interval data, map its columns, visualize the demand profile, and review a plain-language verdict that summarizes continuous vs. non-continuous loads. The React + Vite experience now uses GCWeb/WET page structure and Canada.ca plain-language content patterns while preserving every parser, mapper, and chart workflow that teams rely on.

_A bilingual UI will be added later._

## Features

- ⚡️ Drag-and-drop uploader that auto-detects CSV, XLSX, and Green Button XML files, mirrors the Green Button timezone/multiplier rules, and surfaces an amber warning when Excel uploads are truncated to ~100,000 rows for GitHub Pages performance.
- 🧵 XLSX parsing happens inside a dedicated Web Worker (`src/workers/excelParser.ts`) so large spreadsheets do not freeze the UI; the worker streams the first worksheet through SheetJS, enforces the row cap, and times out after 20 seconds if the browser never responds.
- ✅ Column mapper that validates cadence (15/30/60-minute), enforces a one-year window, and normalizes kWh/kW/Amps to amps using a 240 V
  recommended default.
- 📈 Plotly.js interactive demand chart with amps/kWh toggles, one-year coverage stats, and exportable PNG images that mirror the on-screen view.
- 🧮 Plain-language panel calculator that anchors to the absolute one-year max (×1.25), differentiates continuous vs. non-continuous loads, and lets you stack what-if scenarios.
- 🧾 Manual entry path that converts a user-supplied peak kWh reading into amps so crews can run the calculator even when no file is available; the UI clearly flags these runs as unverified and disables the graph.
- 📄 Download-ready PDF summary that embeds the demand profile chart (or a placeholder when no graph exists), highlights the verdict, and lists proposed loads in a permit-friendly layout.
- 🌐 Header language toggle (EN/FR route + state wiring). French routes are enabled now and can receive translated strings later.
- 🔀 Mode toggle for generic Flexible interval data vs. NS Power SMOC XLSX exports; the SMOC path reads "Interval Period End Timestamp Local" and uses the higher of Max A(a)/Max A(c) per interval.

## Uploading interval data

- **CSV uploads must stay plain text.** The uploader expects standard comma-separated text (UTF-8 or ASCII). Zipped CSVs, binary Excel exports, or files that were renamed from `.xlsx` to `.csv` will fail because the parser streams the file line-by-line.
- **XLSX files are parsed in a worker with SheetJS.** Dragging an Excel workbook keeps you offline while the worker reads the first worksheet with a clear header row. The parser scans for timestamp headers (it no longer assumes the first column holds dates) and keeps extra columns intact. For GitHub Pages responsiveness, only the first ~100,000 data rows are processed and the uploader surfaces a truncation warning when that limit is reached. Renaming a CSV to `.xlsx` does not gain any formatting support.
- **Green Button XML follows the official spec.** The parser keeps the timezone offset, multiplier, and quality flags intact so the mapper receives the raw values your utility provided.

### Choosing a mode

- **Flexible interval data** accepts CSV, XLSX, and Green Button XML. Timestamp headers are detected by name, and cadence is inferred from the first several dozen valid rows.
- **NS Power SMOC data** expects the Interval Period End Timestamp Local column and Max A(a)/Max A(c) fields on the first worksheet of an XLSX export. Amperage is derived from the highest phase per interval; malformed timestamps or missing Max A columns raise immediate errors.


## UI standards

- Page chrome, skip links, landmarks, forms, and validation messaging align with WET-BOEW + GCWeb patterns.
- Content follows the [Canada.ca Content Style Guide](https://design.canada.ca/style-guide/): task-based headings, short instructions, and plain language.
- EN/FR toggle changes route and persisted locale state; current strings remain English until translation is completed.

## Tech stack

- [Vite](https://vitejs.dev/) + [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [WET-BOEW GCWeb](https://github.com/wet-boew/wet-boew) theme assets for Canada.ca page chrome and behaviour
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
2. **Clone your fork.** In a terminal run `git clone <your-fork-url>` and then `cd <your-repo-name>`.
3. **Install Node.js 18+ if needed.** Download it from [nodejs.org](https://nodejs.org/) and rerun the previous step once
   `node -v` works.
4. **Install dependencies.** Run `cd panel-checker && npm install`. This grabs React, Vite, Plotly, etc.
5. **Create a production build.** Still inside `panel-checker`, run `npm run build`. The command performs a strict type-check and
   outputs the static site under `panel-checker/dist`. Vite now uses a relative `base: './'`, the router derives its `basename`
   from the browser URL, and `public/404.html` rewrites deep links back to `index.html` at runtime. Together this keeps EN/FR
   routes working on GitHub Pages project sites (`/<repo-name>/en`, `/<repo-name>/fr`) without hard-coded repo names when you fork
   or rename the project.
6. **Verify the build folder.** Run `ls dist` (while still inside `panel-checker`). You should see `index.html`, `404.html`,
   `assets/`, and a `manifest.webmanifest`. If the folder is missing, rerun step 5 and fix any red error text.
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
11. **Test the site.** Visit the published URL in a new browser tab. Upload a CSV/XML/XLSX interval file or use the manual peak
    entry path to confirm that the chart (when data exists), calculator, and PDF report all load.
12. **Repeat after changes.** Every push to your repository's default branch reruns the workflow. If you make a major UI or build
    change, ensure the README and this runbook stay accurate (see `AGENTS.md`).

## Preview the GitHub Pages path locally

GitHub Pages hosts this Vite build under a `/repo-name/` subpath (the name of your fork). Because the app emits relative URLs you
can mimic that subpath locally before pushing:

```bash
cd panel-checker
npm install
npm run build
npm run preview
```

Then visit `http://localhost:4173/<repo-name>/` (replace `<repo-name>` with your repository name if you forked the project).
The preview server falls back to `index.html` for deep links, so browsing to that prefixed URL mirrors GitHub Pages and confirms
that icons, the manifest, and bundled JavaScript load from relative paths.

If you publish under a custom domain or keep a non-`main` default branch, set `VITE_REPO_URL=https://github.com/<owner>/<repo>`
and `VITE_DEFAULT_BRANCH=<branch-name>` before running `npm run build`. The in-app license link uses those values to point at
the correct repository and branch when it cannot infer them from a `*.github.io/<repo>/` host.

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

LEEP's SPARK Tool is provided under the NRCan End-User License Agreement reproduced in [`LICENSE`](LICENSE). The agreement is tailored for SPARK and replaces the prior Master Planning and Decision Application references.
