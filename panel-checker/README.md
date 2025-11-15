# Panel Checker

Panel Checker is a single-page progressive web application that helps electricians, energy advisors, and DER installers
screen whether an electrical panel has capacity for an additional load. The experience was designed for GitHub Pages so
a free static deployment is all that is required—no HuggingFace hosting.

## Features

- ⚡️ Drag-and-drop CSV uploader with a “try sample data” path.
- ✅ Column mapper that validates cadence (15/30/60-minute) and converts kWh/kW/Amps to a normalized amps trace.
- 📈 Plotly.js interactive demand chart with quick window toggle and export controls.
- 🧮 Plain-language panel calculator that handles continuous vs. non-continuous loads, plus a what-if list for new
  appliances.
- 📄 Downloadable one-page text summary and an installable offline-ready PWA shell.
- 🌐 Copy written with bilingual (EN/FR) tone and large, accessible controls sized for field tablets.

## Tech stack

- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) bootstrapped with Vite.
- [Tailwind CSS](https://tailwindcss.com/) for utility-first styling.
- [Papa Parse](https://www.papaparse.com/) for forgiving CSV ingestion.
- [Zod](https://github.com/colinhacks/zod) for runtime validation and human-friendly error strings.
- [Plotly](https://plotly.com/javascript/) for the demand chart.
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) for the installable experience.

## Getting started

```bash
cd panel-checker
npm install
npm run dev
```

To ship to GitHub Pages, enable Pages on the repository and point it to the `dist` folder produced by `npm run build`.
`vite.config.ts` already ships with a minimal PWA manifest and service worker registration for offline installs.

## Project layout

```
panel-checker/
├── public/           # manifest, icons, sample CSV
├── src/
│   ├── components/   # uploader, mapper, chart, calculator, report
│   ├── lib/          # parsing, unit math, calculator helpers
│   ├── pages/        # upload/validate + results views
│   ├── App.tsx       # tab navigation + routing-lite
│   └── styles.css    # Tailwind entrypoint
├── tailwind.config.ts
├── vite.config.ts
└── package.json
```

## Roadmap-friendly hooks

- The parsing utilities were written so Green Button XML data can be slotted in by converting it to the `CsvPreview`
  shape before hitting the mapper.
- Additional locales can swap the copy by wrapping `App` with a translation provider—UI labels are centralized.
- PDF export can be added by piping the `ReportCard` data through a headless print library.
