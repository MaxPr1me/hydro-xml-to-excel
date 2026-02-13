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
- 2026-02-13 – Added static bilingual SEO architecture (meta/JSON-LD/canonical+hrelang), hidden crawlable FAQ copy, and root robots/sitemap guidance for GitHub Pages + Search Console.

## Tasks

- 2025-11-23 – Harden interval parsing: decouple timestamp detection from column position, infer cadence from larger samples, and surface clear errors when cadence exceeds 60 minutes or rows are irregular.
- 2025-11-23 – Remove Excel auto-conversion fallback from the UI, worker, and helpers so only the primary CSV/XLSX/XML parsers run.
- 2025-11-23 – Add upload mode toggle for flexible data vs. NS Power SMOC files, implement a dedicated SMOC parser that derives amperage across phases, and route the chosen mode through the analyzer.
- 2025-11-23 – Update copy, documentation, and tests to cover the new modes, NS Power assumptions, and the refreshed parsing rules.

## SEO architecture / Architecture SEO

- EN: SEO metadata is applied client-side in `panel-checker/src/lib/seo.ts` and re-applied when language or route changes via `App.tsx`. Keep this logic static-host friendly (no server dependencies) and preserve tool behavior.
- FR: Les métadonnées SEO sont appliquées côté client dans `panel-checker/src/lib/seo.ts` et réappliquées quand la langue ou la route change via `App.tsx`. Garder cette logique compatible avec l’hébergement statique (sans dépendance serveur) et préserver le comportement de l’outil.

- EN: Hidden crawlable bilingual SEO content (overview + FAQ) lives in `panel-checker/index.html` inside `.seo-hidden`; it must remain non-visual and must not alter layout, styling, or existing visible copy.
- FR: Le contenu SEO bilingue explorables (présentation + FAQ) se trouve dans `panel-checker/index.html` dans `.seo-hidden`; il doit rester non visuel et ne pas modifier la mise en page, le style ni le texte visible existant.

### Bilingual metadata strategy / Stratégie bilingue des métadonnées

- EN: Maintain equivalent EN-CA and FR-CA metadata for title, description, Open Graph, Twitter, JSON-LD, canonical, and hreflang tags.
- FR: Maintenir des métadonnées équivalentes en anglais canadien et en français canadien pour le titre, la description, Open Graph, Twitter, JSON-LD, les balises canoniques et hreflang.

- EN: Any SEO copy updates must be made in both languages in the same change.
- FR: Toute mise à jour du texte SEO doit être effectuée dans les deux langues dans la même modification.

### Canonicalization strategy / Stratégie de canonicalisation

- EN: Current strategy keeps query-language URLs (`?lang=en`, `?lang=fr`) and normalizes canonical + hreflang tags to those two URLs to avoid duplicate indexing of base vs query variants.
- FR: La stratégie actuelle conserve les URL avec paramètre de langue (`?lang=en`, `?lang=fr`) et normalise les balises canonique + hreflang vers ces deux URL pour éviter l’indexation en double des variantes base vs paramètre.

- EN: Keep query-param links backward compatible; do not introduce redirects that risk breaking GitHub Pages SPA routing.
- FR: Garder la compatibilité des liens avec paramètres de requête; ne pas introduire de redirections pouvant briser le routage SPA sur GitHub Pages.

### Robots + sitemap / Robots + plan du site

- EN: `panel-checker/public/robots.txt` and `panel-checker/public/sitemap.xml` are published at the site root by Vite.
- FR: `panel-checker/public/robots.txt` et `panel-checker/public/sitemap.xml` sont publiés à la racine du site par Vite.

- EN: Replace `https://YOUR_GITHUB_PAGES_HOST/YOUR_REPO/` placeholders in `sitemap.xml` with your deployed Pages URL before production indexing.
- FR: Remplacer les espaces réservés `https://YOUR_GITHUB_PAGES_HOST/YOUR_REPO/` dans `sitemap.xml` par l’URL Pages déployée avant l’indexation en production.

### Search Console + validation / Search Console + validation

- EN: Insert the Google Search Console token in the `google-site-verification` meta tag (in `index.html`; runtime mirror in `seo.ts`). Use a URL-prefix property for the deployed Pages URL and submit `/sitemap.xml`.
- FR: Insérer le jeton Google Search Console dans la balise meta `google-site-verification` (dans `index.html`; miroir d’exécution dans `seo.ts`). Utiliser une propriété de préfixe d’URL pour l’URL Pages déployée et soumettre `/sitemap.xml`.

- EN: Query performance reports are available in Search Console under Performance → Search results; monitor EN/FR queries and pages separately.
- FR: Les rapports de performance des requêtes sont disponibles dans Search Console sous Performance → Résultats de recherche; suivre séparément les requêtes et pages EN/FR.

### Local SEO verification / Vérification SEO locale

- EN:
  1. Run `cd panel-checker && npm install && npm run dev`.
  2. Visit `/?lang=en` and `/?lang=fr`.
  3. In DevTools Elements, verify title/description/OG/Twitter/canonical/hreflang/JSON-LD change with language toggle.
  4. Open `/robots.txt` and `/sitemap.xml` from the same dev host.
  5. Run Lighthouse SEO audits for both language URLs.
- FR:
  1. Exécuter `cd panel-checker && npm install && npm run dev`.
  2. Ouvrir `/?lang=en` et `/?lang=fr`.
  3. Dans DevTools Elements, vérifier que title/description/OG/Twitter/canonical/hreflang/JSON-LD changent avec le changement de langue.
  4. Ouvrir `/robots.txt` et `/sitemap.xml` sur le même hôte de développement.
  5. Exécuter les audits SEO Lighthouse pour les deux URL de langue.

### Safe SEO edits / Modifications SEO sécuritaires

- EN: Only edit SEO text in `seo.ts` and hidden SEO blocks in `index.html`; never alter existing visible UI copy for SEO tasks.
- FR: Modifier le texte SEO uniquement dans `seo.ts` et les blocs SEO masqués dans `index.html`; ne jamais modifier le texte UI visible existant pour des tâches SEO.

- EN: Do not touch parsing/calculation logic (`src/lib/*`, workers, calculator math) unless explicitly required by a separate task.
- FR: Ne pas toucher la logique d’analyse/calcul (`src/lib/*`, workers, math du calculateur) sauf exigence explicite d’une tâche distincte.
