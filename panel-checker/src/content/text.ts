export type Locale = 'en' | 'fr';

const shared = {
  toolName: 'SPARK panel assessment tool',
  subtitle: 'System for Peak Amperage from Real kWh',
  whatThisToolDoes:
    'Use one year of interval data to estimate peak amperage and screen whether a panel upgrade is likely required.',
  beforeYouStart: [
    'Gather at least one year of interval data in CSV, XLSX, or Green Button XML format.',
    'Confirm the data uses a consistent 15, 30, or 60 minute interval.',
    'Have service and breaker ratings ready before using the panel check step.'
  ],
  nav: {
    upload: 'Upload data',
    results: 'Results'
  },
  progress: ['Upload data', 'Map columns', 'Results', 'Panel check', 'Download report'],
  home: {
    heading: 'Upload and prepare interval data',
    intro:
      'Choose a data mode, upload your file, and review validation messages before continuing to results.',
    summaryPrefix: 'Data ready:',
    summaryCoverageIntro: 'intervals from',
    summaryPeakIntro: 'Peak demand:',
    summaryPeakUnits: 'A',
    manualHeading: 'Use a manual peak when no interval file is available',
    manualDescription:
      'This option keeps calculator behaviour the same, but marks results as user-supplied data and does not produce a demand chart.'
  },
  mapper: {
    heading: 'Map your columns',
    intro: 'Choose which columns contain timestamps and energy or demand values.'
  },
  help: {
    panel:
      'This calculator shows service and breaker limits and lets you test new appliance loads without changing core SPARK calculations.'
  },
  footer: {
    license:
      "NRCan End-User License Agreement for LEEP's SPARK Tool (System for Peak Amperage from Real kWh)."
  },
  language: {
    switchLabel: 'Language selection',
    en: 'English',
    fr: 'Français'
  }
} as const;

export const textByLocale: Record<Locale, typeof shared> = {
  en: shared,
  fr: shared
};

export const textEn = textByLocale.en;
