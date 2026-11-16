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

_The UI supports Canadian English and Canadian French with an in-header language toggle._

## Features

- ⚡️ Drag-and-drop uploader that auto-detects CSV, XLSX, and Green Button XML files, mirrors the Green Button timezone/multiplier rules, and surfaces an amber warning when Excel uploads are truncated to ~100,000 rows for GitHub Pages performance.
- 🧵 XLSX parsing happens inside a dedicated Web Worker (`src/workers/excelParser.ts`) so large spreadsheets do not freeze the UI; the worker reads the first worksheet with the bundled SheetJS library, enforces the row cap, and is stopped after 60 seconds if it never responds so the next upload starts fresh.
- FR : L’analyse XLSX s’effectue dans un Web Worker dédié (`src/workers/excelParser.ts`) afin que les grands classeurs ne bloquent pas l’interface; le worker lit la première feuille avec la bibliothèque SheetJS intégrée, respecte la limite de lignes et est arrêté après 60 secondes sans réponse afin que le téléversement suivant puisse commencer.
- ✅ Column mapper that validates cadence (15/30/60-minute), enforces a one-year window, and normalizes kWh/kW/Amps to amps using a 240 V
  recommended default.
- 📈 Plotly.js interactive demand chart with amps/kWh toggles, one-year coverage stats, and exportable JPG images that mirror the on-screen view.
- FR : Graphique de demande interactif Plotly.js avec bascule ampères/kWh, statistiques sur une année et exportation d’images JPG correspondant à l’affichage.
- 🧮 Plain-language panel calculator that anchors to the absolute one-year max (×1.25), differentiates continuous vs. non-continuous loads, and lets you stack what-if scenarios.
- 🧾 Manual entry path that converts a user-supplied peak kWh reading into amps so crews can run the calculator even when no file is available; the UI clearly flags these runs as unverified and disables the graph.
- 📄 Download-ready PDF summary that embeds the demand profile chart (or a placeholder when no graph exists), highlights the verdict, and lists proposed loads in a permit-friendly layout; sections that do not fit on one page continue onto additional pages.
- FR : Résumé PDF prêt à télécharger qui intègre le graphique de demande (ou un espace réservé sans graphique), met en évidence la conclusion et présente les charges proposées dans une mise en page adaptée aux permis; les sections qui ne tiennent pas sur une page se poursuivent sur les pages suivantes.
- 🌐 English/French copy (including validation errors, chart controls, and JPG/PDF exports), large tap targets, and tablet-friendly layout for field use.
- 🛟 If a page fails to render, a bilingual error panel with a reload button replaces the blank screen, and browsers that block local storage (for example strict privacy modes) still load the app; the language choice is simply not remembered.
- FR : Si une page ne s’affiche pas, un panneau d’erreur bilingue avec un bouton de rechargement remplace l’écran vide. L’application se charge aussi dans les navigateurs qui bloquent le stockage local (par exemple, en mode de confidentialité strict); le choix de langue n’est alors pas mémorisé.
- 🔗 Footer license link resolves dynamically for forks (it points to `blob/HEAD/LICENSE`, which follows the repository's default branch, with a relative LICENSE fallback), and the safety contact uses anti-scrape formatting.
- FR : Le lien de licence du pied de page s’adapte aux forks (il pointe vers `blob/HEAD/LICENSE`, qui suit la branche par défaut du dépôt, avec un chemin relatif `LICENSE` en solution de repli); les coordonnées de soutien sont formatées pour limiter le moissonnage automatisé.
- 🔀 Mode toggle for generic Flexible interval data vs. NS Power SMOC XLSX exports; the SMOC path reads "Interval Period End Timestamp Local" and uses the higher of Max A(a)/Max A(c) per interval.

## Uploading interval data

- **CSV uploads must stay plain text.** The uploader expects standard comma-separated text (UTF-8 or ASCII). Zipped CSVs, binary Excel exports, or files that were renamed from `.xlsx` to `.csv` will fail because the parser streams the file line-by-line.
- **XLSX files are parsed in a worker with SheetJS.** SheetJS is bundled with the app and precached by the service worker, so workbooks are read without contacting a third-party CDN and keep working offline after the first load. The worker reads the first worksheet with a clear header row. The parser scans for timestamp headers (it no longer assumes the first column holds dates) and keeps extra columns intact. For GitHub Pages responsiveness, only the first ~100,000 data rows are processed and the uploader surfaces a truncation warning when that limit is reached. Renaming a CSV to `.xlsx` does not gain any formatting support.
- **Les fichiers XLSX sont analysés dans un worker avec SheetJS.** SheetJS est intégré à l’application et mis en cache à l’avance par le service worker; les classeurs sont donc lus sans contacter un CDN tiers et restent accessibles hors ligne après le premier chargement. Le worker lit la première feuille avec une ligne d’en-tête claire. L’analyseur repère les en-têtes d’horodatage (il ne suppose plus que la première colonne contient les dates) et conserve les colonnes supplémentaires. Pour assurer la réactivité sur GitHub Pages, seules les quelque 100 000 premières lignes de données sont traitées et l’interface signale toute troncature. Renommer un CSV en `.xlsx` n’ajoute aucune prise en charge du formatage.
- **Green Button XML follows the official spec.** The parser keeps the timezone offset, multiplier, and quality flags intact so the mapper receives the raw values your utility provided. When a file holds several readings (for example energy delivered to and received from the grid), the parser follows the file's links to the delivered (consumption) stream and prefers the finest interval. Interval start times are read as true UTC instants, as the specification requires, and shown in your browser's time zone. Some utilities export local clock time labelled as UTC; their charts appear shifted by the UTC offset (about 4–5 hours in Eastern and Atlantic Canada), although the readings themselves are unchanged.
- **Les fichiers XML Green Button suivent la spécification officielle.** L’analyseur conserve le décalage horaire, le multiplicateur et les indicateurs de qualité afin que le mappeur reçoive les valeurs brutes du service public. Si un fichier contient plusieurs séries de relevés (par exemple, l’énergie livrée au réseau et celle reçue), l’analyseur suit les liens du fichier vers la série livrée (consommation) et privilégie l’intervalle le plus fin. Les heures de début d’intervalle sont lues comme de véritables instants UTC, conformément à la spécification, puis affichées dans le fuseau horaire du navigateur. Certains services publics exportent l’heure locale en l’étiquetant UTC; leurs graphiques peuvent donc être décalés de l’équivalent UTC (environ 4 à 5 heures dans l’Est et le Canada atlantique), sans que les relevés changent.

### Choosing a mode

- **Flexible interval data** accepts CSV, XLSX, and Green Button XML. Timestamp headers are detected by name, and cadence is inferred from the first several dozen valid rows. The value column defaults to an energy or demand header in English or French (for example `Usage (KWH)`, `Net Consumption (kWh)`, or `Consommation`) instead of account, meter, or ID columns; you can still change it in the mapper.
- **Les données d’intervalle flexibles** acceptent les fichiers CSV, XLSX et XML Green Button. Les en-têtes d’horodatage sont détectés par leur nom et la cadence est déduite des premières dizaines de lignes valides. La colonne de valeur privilégie par défaut un en-tête d’énergie ou de demande en anglais ou en français (par exemple `Usage (KWH)`, `Net Consumption (kWh)` ou `Consommation`) plutôt qu’une colonne de compte, de compteur ou d’identifiant; vous pouvez toujours la modifier dans le mappeur.
- **NS Power SMOC data** expects the Interval Period End Timestamp Local column and Max A(a)/Max A(c) fields on the first worksheet of an XLSX export. Amperage is derived from the highest phase per interval; malformed timestamps or missing Max A columns raise immediate errors.

## Tech stack

- [Vite](https://vitejs.dev/) + [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/) utility styling
- [Papa Parse](https://www.papaparse.com/) for CSV ingestion
- [SheetJS Community Edition](https://sheetjs.com/) for XLSX ingestion, installed from the pinned `cdn.sheetjs.com` tarball listed in `package.json` (so `npm install` needs access to that host)
- [SheetJS Community Edition](https://sheetjs.com/) pour l’importation XLSX, installé à partir de l’archive `cdn.sheetjs.com` épinglée dans `package.json` (donc `npm install` doit pouvoir accéder à cet hôte)
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

If you publish under a custom domain, set `VITE_REPO_URL=https://github.com/<owner>/<repo>` before running `npm run build`.
The footer License/Licence link is fork-safe: it uses `VITE_REPO_URL` when set, otherwise derives `owner/repo` from
`*.github.io/<repo>/` (or reads the `repository` field in `package.json` once its `OWNER/REPO` placeholder is replaced), then
links to `<repo-url>/blob/HEAD/LICENSE`. GitHub resolves `HEAD` to the repository's default branch, so no branch setting is
needed. When no repository can be resolved (for example on `localhost`), the link falls back to a relative `LICENSE` path.
- FR : Si vous publiez sur un domaine personnalisé, définissez `VITE_REPO_URL=https://github.com/<owner>/<repo>` avant d’exécuter `npm run build`. Le lien Licence du pied de page utilise `VITE_REPO_URL` lorsqu’il est défini; sinon, il déduit `owner/repo` de `*.github.io/<repo>/` (ou lit le champ `repository` de `package.json` une fois l’espace réservé `OWNER/REPO` remplacé), puis pointe vers `<url-du-dépôt>/blob/HEAD/LICENSE`. GitHub résout `HEAD` vers la branche par défaut; aucune variable de branche n’est nécessaire. Si le dépôt ne peut pas être déterminé (par exemple sur `localhost`), le lien utilise le chemin relatif `LICENSE`.

## Content Security Policy / Politique de sécurité du contenu

- EN: `npm run build` adds a Content-Security-Policy `<meta>` tag to `dist/index.html` through a small plugin in `panel-checker/vite.config.ts` (keep `vite.config.js` identical). Inline scripts are allowed by SHA-256 hashes calculated during the build, so editing them in `index.html` needs no manual hash update.
- FR : `npm run build` ajoute une balise `<meta>` Content-Security-Policy à `dist/index.html` au moyen d’un petit module d’extension dans `panel-checker/vite.config.ts` (garder `vite.config.js` identique). Les scripts intégrés sont autorisés par des empreintes SHA-256 calculées pendant la compilation; les modifier dans `index.html` n’exige donc aucune mise à jour manuelle d’empreinte.
- EN: The policy only allows the app’s own files plus Google Analytics 4 (`googletagmanager.com`, `google-analytics.com`, `analytics.google.com`). If you add a third-party script, font, image, or API host, or turn on Google Signals or advertising features, add its origin to the policy or the browser will block it.
- FR : La politique n’autorise que les fichiers de l’application et Google Analytics 4 (`googletagmanager.com`, `google-analytics.com`, `analytics.google.com`). Si vous ajoutez un script, une police, une image ou une API de tiers, ou si vous activez Google Signals ou les fonctions publicitaires, ajoutez son origine à la politique, sinon le navigateur la bloquera.
- EN: The development server (`npm run dev`) does not apply the policy; test with `npm run build` then `npm run preview` and watch the browser console for Content Security Policy errors. GitHub Pages cannot send HTTP headers, so protections that only work as headers (such as `frame-ancestors`) are not available.
- FR : Le serveur de développement (`npm run dev`) n’applique pas la politique; testez avec `npm run build` puis `npm run preview` et surveillez la console du navigateur pour repérer les erreurs Content Security Policy. GitHub Pages ne peut pas envoyer d’en-têtes HTTP; les protections qui fonctionnent seulement comme en-têtes (comme `frame-ancestors`) ne sont donc pas disponibles.


## Static SEO notes / Notes SEO statiques

- EN: SEO metadata (title/description/Open Graph/Twitter/JSON-LD/canonical/hreflang) is language-aware and updated client-side for `?lang=en` and `?lang=fr`.
- FR: Les métadonnées SEO (title/description/Open Graph/Twitter/JSON-LD/canonical/hreflang) sont adaptées à la langue et mises à jour côté client pour `?lang=en` et `?lang=fr`.

- EN: The hidden overview and FAQ include complete English and French copy. Metadata uses localized tool names and the same organization name as the UI: CanmetENERGY-Ottawa in English and CanmetÉNERGIE-Ottawa in French.
- FR: La présentation et la foire aux questions masquées comprennent les textes complets en anglais et en français. Les métadonnées utilisent les noms traduits de l’outil et le même nom d’organisation que l’interface : CanmetENERGY-Ottawa en anglais et CanmetÉNERGIE-Ottawa en français.

- EN: Root crawl files live in `panel-checker/public/robots.txt` and `panel-checker/public/sitemap.xml`.
- FR: Les fichiers d’exploration à la racine se trouvent dans `panel-checker/public/robots.txt` et `panel-checker/public/sitemap.xml`.

- EN: Before production indexing, replace `https://YOUR_GITHUB_PAGES_HOST/YOUR_REPO/` placeholders in `sitemap.xml` with your deployed Pages URL, then submit `/sitemap.xml` in Google Search Console.
- FR: Avant l’indexation en production, remplacez les espaces réservés `https://YOUR_GITHUB_PAGES_HOST/YOUR_REPO/` dans `sitemap.xml` par l’URL Pages déployée, puis soumettez `/sitemap.xml` dans Google Search Console.

- EN: Add your Search Console token to `<meta name="google-site-verification" ...>` in `panel-checker/index.html` (and keep the mirrored runtime value in `panel-checker/src/lib/seo.ts`).
- FR: Ajoutez votre jeton Search Console à `<meta name="google-site-verification" ...>` dans `panel-checker/index.html` (et gardez la valeur miroir côté exécution dans `panel-checker/src/lib/seo.ts`).

## Contributor decision-making / Prise de décision des contributeurs

- EN: Never make assumptions. When more than one reasonable path exists, seek feedback before choosing. Any shortcut or assumption must be explicitly noted after approval (see `AGENTS.md`).
- FR : Ne jamais faire de suppositions. Lorsqu’il existe plus d’une option raisonnable, obtenir une rétroaction avant de choisir. Tout raccourci ou toute supposition doit être signalé explicitement après l’approbation (voir `AGENTS.md`).
- EN: Keep code dynamic (relative URLs, runtime/build-time repo, branch, and host detection). This codebase is forked and updated downstream at https://canmet-energy.github.io/leep-spark-tool/ and must work there unchanged (see `AGENTS.md`).
- FR : Garder le code dynamique (URL relatives, détection du dépôt, de la branche et de l’hôte à la compilation ou à l’exécution). Ce code est dérivé et mis à jour en aval à https://canmet-energy.github.io/leep-spark-tool/ et doit y fonctionner sans changement (voir `AGENTS.md`).
## Mobile install (PWA) / Installation mobile (PWA)

- EN: The web app manifest is generated by `vite-plugin-pwa` from `panel-checker/vite.config.ts` (keep `vite.config.js` in sync; Vite loads it first). Do not add a static `manifest.json` or a second `<link rel="manifest">` in `index.html`. Android needs the PNG icons (`icon-192.png`, `icon-512.png`, `icon-maskable-512.png`) and iOS uses `apple-touch-icon.png`, all in `panel-checker/public/`.
- FR : Le manifeste de l’application Web est généré par `vite-plugin-pwa` à partir de `panel-checker/vite.config.ts` (garder `vite.config.js` synchronisé; Vite le charge en premier). Ne pas ajouter de `manifest.json` statique ni de second `<link rel="manifest">` dans `index.html`. Android exige les icônes PNG (`icon-192.png`, `icon-512.png`, `icon-maskable-512.png`) et iOS utilise `apple-touch-icon.png`, tous dans `panel-checker/public/`.

## Repository layout

```
panel-checker/          # React + Vite app and build scripts
├── public/             # Static assets, PNG/SVG icons, robots + sitemap
├── src/                # Components, pages, lib helpers
├── types/              # Extra .d.ts shims for tooling
├── package.json        # npm scripts and dependencies
└── vite.config.ts      # PWA-enabled build config
```

The legacy Python app (`app.py` + `requirements.txt`) has been removed from this branch so that the focus stays on the static web
app that runs on GitHub Pages.

## License

LEEP's SPARK Tool is provided under the NRCan End-User License Agreement reproduced in [`LICENSE`](LICENSE). The agreement is tailored for SPARK and replaces the prior Master Planning and Decision Application references.
