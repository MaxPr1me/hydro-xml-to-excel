import { createContext, useContext } from 'react';

export type Language = 'en' | 'fr';

type Copy = typeof en;

export const en = {
  organization: 'CanmetENERGY-Ottawa',
  toolName: 'LEEP’s SPARK Tool',
  subtitle: 'System for Peak Amperage from Real kWh',
  sparkLong: 'SPARK – Système pour la Pointe d’Ampérage à partir des Relevés en kWh',
  heroParagraph:
    'SPARK is a data-driven analysis tool developed by CanmetENERGY-Ottawa to support electrification retrofits in Canadian homes. Using historical interval meter data, SPARK calculates peak amperage and demonstrated demand so contractors can determine whether a main electrical panel actually requires an upgrade. By relying on real kWh consumption data rather than conservative assumptions, SPARK helps homeowners, utilities, and programs avoid unnecessary panel upgrades.',
  heroTagline: 'Real data. Real peaks. Smarter panel decisions.',
  languageToggle: 'Français',
  logoAlt: 'SPARK load profile logo',
  nav: { upload: 'Upload & validate', results: 'Results' },
  footer: {
    pwa: 'Installable PWA · Works offline after first load.',
    license: 'License',
    contact: 'Safety and support contact',
    contactValue: 'leep [at] nrcan-rncan [dot] gc [dot] ca'
  },
  home: {
    calloutLabel: 'Interval data workflow',
    calloutHeading: 'Keep electrification projects moving with real kWh data.',
    calloutParagraph:
      'Confirm whether an electrical panel has the headroom needed for electrification projects. Import CSV, XLSX, or Green Button XML data, align the columns, and unlock the demand chart plus calculator.',
    bulletPoints: [
      'Validate cadence and units before relying on the data.',
      'Pick Flexible mode for generic interval data or NS Power SMOC mode to auto-read timestamps and Max A columns.',
      'Plot a year of amps or kilowatt-hours to catch spikes and seasonal trends.',
      'Summarize diversified loads plus proposed appliances in one report.'
    ],
    summaryPrefix: 'Data OK!',
    summaryCoverageIntro: 'intervals covering',
    summaryPeakIntro: 'One-year peak demand hit',
    summaryPeakUnits: 'A.',
    noFile: 'No file handy?',
    jumpTitle: 'Jump straight to the calculator',
    jumpBody: 'Enter a verified peak kWh value and cadence to run the calculator without uploading a file.',
    manualToggle: 'Use a manual peak instead',
    manualToggleHelp: 'Check to reveal fields for a customer-provided peak reading.',
    peakInput: 'Peak interval energy (kWh)',
    cadenceInput: 'Interval cadence',
    voltageInput: 'Service voltage',
    manualButton: 'Use manual peak',
    manualError: 'Enter a positive number for the peak kWh value.',
    manualDisclaimer:
      'Disclaimer: This path never generates a graph. Include proof of the interval reading when submitting results.'
  },
  uploader: {
    uploadType: 'Upload CSV, XLSX, or Green Button XML files.',
    flexibleTitle: 'Flexible interval data',
    flexibleDescription: 'CSV, XLSX, or Green Button XML with configurable timestamp/value mapping.',
    smocTitle: 'NS Power SMOC data',
    smocDescription: 'Dedicated XLSX parser that reads Interval Period End Timestamp Local and Max A fields.',
    dragTitle: 'Drag and drop interval data',
    dragFlexible: 'CSV, XLSX, or Green Button XML files are accepted.',
    dragSmoc: 'NS Power SMOC XLSX files (first worksheet).',
    modePrefix: 'Mode:',
    browse: 'Browse files',
    parsing: 'Parsing…'
  },
  mapper: {
    title: 'Map your columns',
    subtitle: 'Choose the timestamp and measurement fields.',
    helpLabel: 'Help for column mapping',
    time: 'Time column',
    value: 'Value column',
    units: 'Units',
    voltage: 'System voltage',
    voltageHint: '(240 V recommended)',
    continue: 'Continue',
    cadenceNote: 'We check cadence (15, 30, or 60 minute) automatically.',
    closeHelp: 'Close help'
  },
  results: {
    unlock: 'Upload interval data or use the manual peak option to unlock the calculator.',
    noGraph: 'No interval data provided – graph not available.',
    noGraphBody: 'The customer-supplied peak value enables the calculator, but no demand profile image is generated.',
    smocBanner:
      'NS Power SMOC mode: intervals come from Interval Period End Timestamp Local, and amperage uses the maximum of Max A(a) and Max A(c).',
    manualBanner:
      'Strong disclaimer: No interval data was uploaded. Peak amperage is derived from user-entered kWh and is unverified.'
  },
  chart: {
    title: 'Demand profile',
    peakLine: 'One-year peak',
    percentile: '95th percentile',
    view: 'View',
    cadence: 'cadence',
    download: 'Download demand profile PNG',
    demandChart: 'Demand chart',
    coverage: 'Coverage',
    dataQuality: 'Data quality',
    intervals: 'intervals',
    unableExport: 'Unable to export the demand profile.',
    peakMarker: 'Peak'
  },
  calculator: {
    title: 'Panel calculator',
    manualIntro: 'Using a user-entered peak interval. Treat these results as provisional.',
    autoIntro: 'Starting from the one-year peak demand, apply adjustment factor and breaker loading.',
    helpLabel: 'Help for panel calculator',
    serviceSize: 'Service size',
    mainBreaker: 'Main breaker',
    breakerLoading: 'Breaker loading?',
    breakerLoadingInfoLabel: 'About breaker loading',
    breakerLoadingHelp:
      'Ontario and BC use 100% breaker loading for demonstrated load. Nova Scotia uses 80% breaker loading.',
    existingLoad: 'Existing load',
    proposedLoads: 'Proposed loads',
    adjustmentFactor: 'Adjustment factor',
    adjustmentFactorInfoLabel: 'About adjustment factor',
    adjustmentFactorHelp:
      'Ontario and BC use a 125% adjustment factor when using hourly (60-minute) kWh data.',
    diversifiedTotal: 'Diversified total',
    adjustedTo: 'adjusted to',
    addLoad: 'Add load',
    loadPlaceholder: 'Name',
    remove: 'Remove',
    availableMargin: 'Available margin',
    alwaysConfirm: 'Always confirm with local code (CEC/NEC) and utility rules.',
    effectiveCapacity: 'Effective main breaker capacity',
    entered: 'entered',
    afterAdjustment: 'after adjustment',
    additions: 'Proposed additions',
    statusOk: 'OK',
    statusUpgrade: 'Upgrade'
  },
  report: {
    title: 'One-page report',
    subtitle: 'Copy the highlights for your permit package.',
    download: 'Download report',
    coverage: 'Coverage',
    cadence: 'Cadence',
    peakAmps: 'Peak amps',
    verdict: 'Verdict',
    margin: 'margin',
    manualPeak: 'Manual peak (kWh)',
    manualCadence: 'Manual cadence',
    manualAmps: 'Manual amps',
    noLoads: 'No proposed loads were added to this scenario.',
    loadFallback: 'Load',
    toolDisclaimer: 'Screening tool only — always confirm against code and utility requirements.',
    manualDisclaimer: 'Manual entry disclaimer: No interval data was uploaded. Provide source kWh documentation.'
  },
  help: {
    mapper:
      'Pick the column that holds time or timestamp values and the column with your measurement (kWh, kW, or amps). Knowing which column is time and which is the reading lets us build the demand profile automatically.',
    panel:
      'This calculator shows your service and main breaker sizes and lets you test extra loads like heat pumps, EV chargers, or ranges. For heat pumps, enter the Minimum Circuit Ampacity (MCA) from the nameplate to see if the panel can handle new equipment without an upgrade.'
  }
};

export const fr: Copy = {
  ...en,
  toolName: 'Outil SPARK du LEEP',
  subtitle: 'Système pour la Pointe d’Ampérage à partir des Relevés en kWh',
  heroParagraph:
    'SPARK est un outil d’analyse fondé sur les données, développé par CanmetÉNERGIE-Ottawa pour appuyer les rénovations d’électrification dans les habitations canadiennes. À partir de données historiques de compteur à intervalles, SPARK calcule la pointe d’ampérage et la demande démontrée afin que les entrepreneurs puissent déterminer si un panneau électrique principal doit réellement être mis à niveau. En s’appuyant sur des données de consommation réelles en kWh plutôt que sur des hypothèses prudentes, SPARK aide les propriétaires, les services publics et les programmes à éviter des mises à niveau de panneau inutiles.',
  heroTagline: 'Données réelles. Pointes réelles. Décisions plus éclairées pour les panneaux.',
  languageToggle: 'English',
  logoAlt: 'Logo du profil de charge SPARK',
  nav: { upload: 'Téléverser et valider', results: 'Résultats' },
  footer: {
    pwa: 'Application Web installable · Fonctionne hors ligne après le premier chargement.',
    license: 'Licence',
    contact: 'Contact sécurité et soutien',
    contactValue: 'leep [at] nrcan-rncan [dot] gc [dot] ca'
  },
  home: {
    ...en.home,
    calloutLabel: 'Flux de travail des données intervalle',
    calloutHeading: 'Faites avancer les projets d’électrification avec des données kWh réelles.',
    calloutParagraph:
      'Confirmez si un panneau électrique dispose de la capacité nécessaire pour des projets d’électrification. Importez des données CSV, XLSX ou XML Green Button, associez les colonnes et activez le graphique de demande ainsi que le calculateur.',
    bulletPoints: [
      'Validez la cadence et les unités avant d’utiliser les données.',
      'Choisissez le mode Flexible pour les données d’intervalle génériques ou le mode NS Power SMOC afin de lire automatiquement les horodatages et les colonnes Max A.',
      'Tracez une année d’ampères ou de kWh pour repérer les pointes et tendances saisonnières.',
      'Résumez les charges diversifiées et les appareils proposés dans un seul rapport.'
    ],
    summaryPrefix: 'Données valides!',
    summaryCoverageIntro: 'intervalles couvrant',
    summaryPeakIntro: 'La pointe annuelle atteint',
    noFile: 'Aucun fichier sous la main?',
    jumpTitle: 'Accéder directement au calculateur',
    jumpBody: 'Entrez une valeur kWh de pointe vérifiée et la cadence pour utiliser le calculateur sans fichier.',
    manualToggle: 'Utiliser plutôt une pointe manuelle',
    manualToggleHelp: 'Cochez pour afficher les champs de pointe fournie par le client.',
    cadenceInput: 'Cadence d’intervalle',
    voltageInput: 'Tension de service',
    manualButton: 'Utiliser la pointe manuelle',
    manualError: 'Entrez une valeur kWh de pointe positive.',
    manualDisclaimer:
      'Avis : ce parcours ne génère jamais de graphique. Joignez la preuve de la lecture intervalle lors de la soumission.'
  },
  uploader: {
    flexibleTitle: 'Données intervalle flexibles',
    flexibleDescription: 'CSV, XLSX ou XML Green Button avec mappage configurable horodatage/valeur.',
    smocTitle: 'Données SMOC de NS Power',
    smocDescription: 'Analyseur XLSX dédié lisant Interval Period End Timestamp Local et les champs Max A.',
    dragTitle: 'Glissez-déposez les données intervalle',
    dragFlexible: 'Les fichiers CSV, XLSX ou XML Green Button sont acceptés.',
    dragSmoc: 'Fichiers XLSX SMOC de NS Power (première feuille).',
    modePrefix: 'Mode :',
    uploadType: 'Téléversez des fichiers CSV, XLSX ou XML Green Button.',
    browse: 'Parcourir les fichiers',
    parsing: 'Analyse…'
  },
  mapper: {
    ...en.mapper,
    title: 'Associer vos colonnes',
    subtitle: 'Choisissez les champs horodatage et mesure.',
    helpLabel: 'Aide pour l’association des colonnes',
    time: 'Colonne temporelle',
    value: 'Colonne de valeur',
    voltage: 'Tension du système',
    voltageHint: '(240 V recommandé)',
    continue: 'Continuer',
    cadenceNote: 'Nous vérifions automatiquement la cadence (15, 30 ou 60 minutes).',
    closeHelp: 'Fermer l’aide'
  },
  results: {
    unlock: 'Téléversez des données intervalle ou utilisez l’option de pointe manuelle pour activer le calculateur.',
    noGraph: 'Aucune donnée intervalle fournie – graphique non disponible.',
    noGraphBody: 'La valeur de pointe fournie par le client active le calculateur, mais aucune image de profil ne sera générée.',
    smocBanner:
      'Mode SMOC de NS Power : les intervalles proviennent de Interval Period End Timestamp Local et l’ampérage utilise le maximum de Max A(a) et Max A(c).',
    manualBanner:
      'Avertissement important : aucune donnée intervalle n’a été téléversée. L’ampérage de pointe provient d’un kWh saisi par l’utilisateur et n’est pas vérifié.'
  },
  chart: {
    ...en.chart,
    title: 'Profil de demande',
    peakLine: 'Pointe annuelle',
    percentile: '95e centile',
    view: 'Vue',
    cadence: 'cadence',
    download: 'Télécharger le PNG du profil de demande',
    demandChart: 'Graphique de demande',
    coverage: 'Couverture',
    dataQuality: 'Qualité des données',
    intervals: 'intervalles',
    unableExport: 'Impossible d’exporter le profil de demande.',
    peakMarker: 'Pointe'
  },
  calculator: {
    ...en.calculator,
    title: 'Calculateur de panneau',
    manualIntro: 'Pointe intervalle saisie par l’utilisateur. Traitez ces résultats comme provisoires.',
    autoIntro: 'À partir de la pointe annuelle, appliquez un facteur d’ajustement et le chargement du disjoncteur.',
    helpLabel: 'Aide pour le calculateur de panneau',
    serviceSize: 'Taille du service',
    mainBreaker: 'Disjoncteur principal',
    breakerLoading: 'Chargement du disjoncteur?',
    breakerLoadingInfoLabel: 'À propos du chargement du disjoncteur',
    breakerLoadingHelp:
      'L’Ontario et la Colombie-Britannique utilisent un chargement du disjoncteur de 100 % pour la charge démontrée. La Nouvelle-Écosse utilise un chargement du disjoncteur de 80 %.',
    existingLoad: 'Charge existante',
    proposedLoads: 'Charges proposées',
    adjustmentFactor: 'Facteur d’ajustement',
    adjustmentFactorInfoLabel: 'À propos du facteur d’ajustement',
    adjustmentFactorHelp:
      'L’Ontario et la Colombie-Britannique utilisent un facteur d’ajustement de 125 % avec des données horaires (60 minutes) en kWh.',
    addLoad: 'Ajouter une charge',
    remove: 'Retirer',
    availableMargin: 'Marge disponible',
    alwaysConfirm: 'Confirmez toujours avec les exigences du code local (CEC/NEC) et du service public.',
    effectiveCapacity: 'Capacité effective du disjoncteur principal',
    entered: 'saisie',
    afterAdjustment: 'après ajustement',
    additions: 'Ajouts proposés',
    statusUpgrade: 'Mise à niveau requise'
  },
  report: {
    ...en.report,
    title: 'Rapport d’une page',
    subtitle: 'Copiez les points saillants pour votre dossier de permis.',
    download: 'Télécharger le rapport',
    peakAmps: 'Ampères de pointe',
    verdict: 'Conclusion',
    margin: 'marge',
    manualPeak: 'Pointe manuelle (kWh)',
    manualCadence: 'Cadence manuelle',
    manualAmps: 'Ampères manuels',
    noLoads: 'Aucune charge proposée n’a été ajoutée à ce scénario.',
    loadFallback: 'Charge',
    toolDisclaimer: 'Outil de présélection seulement — validez toujours selon le code et les exigences du service public.',
    manualDisclaimer: 'Avis de saisie manuelle : aucune donnée intervalle n’a été téléversée. Fournissez la preuve de la lecture kWh.'
  },
  help: {
    mapper:
      'Choisissez la colonne qui contient l’heure ou les horodatages, ainsi que la colonne de mesure (kWh, kW ou ampères). En identifiant correctement la colonne de temps et la colonne de lecture, SPARK peut générer automatiquement le profil de demande.',
    panel:
      'Ce calculateur présente les calibres de service et de disjoncteur principal, puis vous permet de tester des charges supplémentaires comme les thermopompes, les bornes de recharge de VE ou les cuisinières. Pour les thermopompes, entrez l’intensité minimale du circuit (MCA) indiquée sur la plaque signalétique afin de vérifier si le panneau peut accepter le nouvel équipement sans mise à niveau.'
  }
};

export const translations = { en, fr };

export interface I18nContextValue {
  lang: Language;
  copy: Copy;
  toggleLanguage: () => void;
  formatDate: (date: Date) => string;
  translateError: (message: string) => string;
}

export const I18nContext = createContext<I18nContextValue | null>(null);

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nContext provider.');
  }
  return context;
}

const errorMap: Record<string, keyof Copy['home'] | string> = {
  'enter a positive number for the peak kwh value.': 'manualError',
  'unable to export the demand profile.': 'chart.unableExport',
  'upload csv, xlsx, or green button xml files.': 'uploader.uploadType',
};

export function localizeError(message: string, lang: Language) {
  const key = errorMap[message.toLowerCase().trim()];
  if (!key) return message;
  const copy = translations[lang] as Record<string, unknown>;
  const resolved = key.split('.').reduce<unknown>((current, part) => (current as Record<string, unknown>)?.[part], copy);
  return typeof resolved === 'string' ? resolved : message;
}
