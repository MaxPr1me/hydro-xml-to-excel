import { createContext, useContext } from 'react';

export type Language = 'en' | 'fr';

type Copy = typeof en;

export const en = {
  locale: 'en-CA',
  colon: ': ',
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
  units: { amps: 'Amps' },
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
    peakPlaceholder: 'e.g. 3.25',
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
    columnFallback: (index: string) => `Column ${index}`,
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
    cadenceBadge: (minutes: number) => `${minutes}-minute cadence`,
    cadenceValue: (minutes: number) => `${minutes} minute`,
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
    capacityDetail: (effectiveAmps: string, limitingAmps: number, percent: number) =>
      `${effectiveAmps} A (capped by ${limitingAmps} A service/breaker) at ${percent}%.`,
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
    cadenceData: (minutes: number) => `${minutes}-minute data`,
    manualCadenceValue: (minutes: number) => `${minutes}-minute`,
    notAvailable: 'n/a',
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
  },
  // English values must match the source messages in src/lib, workers, and components exactly;
  // localizeError() uses them to look up the translation.
  messages: {
    smocExcelOnly: 'NS Power SMOC uploads must be Excel workbooks (.xlsx).',
    parsingSmoc: 'Parsing NS Power SMOC Excel data…',
    parsingExcel: 'Parsing Excel data…',
    parsingXml: 'Parsing XML data…',
    xmlRecognized: 'Recognized XML format — skipping manual mapping.',
    xmlAutoMapFailed: 'We could not auto-map the XML file. Map the columns manually to continue.',
    xmlFieldsNotDetected:
      'XML parsed, but we could not detect the timestamp and kWh fields. Map them manually to continue.',
    unableParseFile: 'Unable to parse the file.',
    unableReadFile: 'Unable to read the file.',
    excelTimeout: 'Excel parsing timed out. Try again or use a smaller file.',
    excelWorkerCrashed: 'Excel worker crashed.',
    unableParseExcel: 'Unable to parse the Excel file.',
    sheetJsFailed: 'SheetJS library failed to load.',
    noHeaders: 'No headers detected. Add column names to the first row.',
    noWorksheets: 'Workbook did not contain any worksheets.',
    worksheetUnreadable: 'Worksheet data could not be read.',
    worksheetEmpty: 'Worksheet is empty.',
    firstRowHeaders: 'The first row must include headers.',
    noTimestampColumn:
      'Could not find a timestamp column. Label the time field clearly (e.g., "Timestamp"), or ensure one column contains parseable dates.',
    noUsableRows: 'No usable rows were found in the first worksheet.',
    noValidXml: 'No valid data found in the XML file.',
    notEnoughData: 'Not enough data for analysis. At least one year of data is required.',
    noUsableSmocRows:
      'No usable NS Power SMOC rows were found. Confirm that timestamp and Max A columns contain valid data.',
    noIntervalEndColumn: 'Could not find an "Interval Period End Timestamp" column.',
    noMaxAColumns: 'Expected Max A(a) or Max A(c) columns to derive amperage.',
    smocGaps:
      'Detected gaps larger than the expected cadence in the NS Power SMOC data. Fill or explain missing intervals before retrying.',
    needRowsForCadence: 'Need at least a few rows with valid timestamps to understand the cadence.',
    cadenceUncomputable: 'Unable to compute cadence from the first rows. Check for duplicate or missing timestamps.',
    irregularIntervals:
      'Intervals appear irregular within the first few dozen rows. Check for missing readings or gaps.',
    noRowsAfterParse: 'No rows remained after parsing.',
    needContinuousYear: 'Upload at least one continuous year of interval data.',
    noRecentData: 'No recent data points were found in the last year.',
    needRecent12Months: 'We need data covering the most recent 12 months to proceed.',
    invalidXml: 'Uploaded file contains invalid XML.',
    verdictOk: 'Demand appears to be within the main breaker allowance.',
    verdictServiceUpgrade: 'Service size increase required to match the main breaker rating.',
    verdictExceeds: 'Calculated load exceeds the effective main breaker capacity; consider an upgrade.',
    unableRenderChart: 'Unable to render chart image.',
    unablePrepareCanvas: 'Unable to prepare the export canvas.',
    rowLimit: (rows: string) =>
      `Only the first ${rows} rows were processed to keep the browser responsive on GitHub Pages.`,
    timestepOverHour: (minutes: string) => `Data timestep is larger than 1 hour: ${minutes} minutes.`,
    timestepOver60: (minutes: string) => `Data timestep is larger than 60 minutes: ${minutes} minutes.`,
    unexpectedCadence: (expected: string, detected: string) =>
      `We expected ${expected}-minute data; detected ${detected}-minute cadence.`
  }
};

export const fr: Copy = {
  locale: 'fr-CA',
  colon: ' : ',
  organization: 'CanmetÉNERGIE-Ottawa',
  toolName: 'Outil SPARK du LEEP',
  subtitle: 'Système pour la Pointe d’Ampérage à partir des Relevés en kWh',
  sparkLong: 'SPARK – Système pour la Pointe d’Ampérage à partir des Relevés en kWh',
  heroParagraph:
    'SPARK est un outil d’analyse fondé sur les données, développé par CanmetÉNERGIE-Ottawa pour appuyer les rénovations d’électrification dans les habitations canadiennes. À partir de données historiques de compteur à intervalles, SPARK calcule la pointe d’ampérage et la demande démontrée afin que les entrepreneurs puissent déterminer si un panneau électrique principal doit réellement être mis à niveau. En s’appuyant sur des données de consommation réelles en kWh plutôt que sur des hypothèses prudentes, SPARK aide les propriétaires, les services publics et les programmes à éviter des mises à niveau de panneau inutiles.',
  heroTagline: 'Données réelles. Pointes réelles. Décisions plus éclairées pour les panneaux.',
  languageToggle: 'English',
  logoAlt: 'Logo du profil de charge SPARK',
  nav: { upload: 'Téléverser et valider', results: 'Résultats' },
  units: { amps: 'Ampères' },
  footer: {
    pwa: 'Application Web installable · Fonctionne hors ligne après le premier chargement.',
    license: 'Licence',
    contact: 'Contact sécurité et soutien',
    contactValue: 'leep [at] nrcan-rncan [dot] gc [dot] ca'
  },
  home: {
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
    summaryPeakUnits: 'A.',
    noFile: 'Aucun fichier sous la main?',
    jumpTitle: 'Accéder directement au calculateur',
    jumpBody: 'Entrez une valeur kWh de pointe vérifiée et la cadence pour utiliser le calculateur sans fichier.',
    manualToggle: 'Utiliser plutôt une pointe manuelle',
    manualToggleHelp: 'Cochez pour afficher les champs de pointe fournie par le client.',
    peakInput: 'Énergie de pointe de l’intervalle (kWh)',
    peakPlaceholder: 'ex. 3.25',
    cadenceInput: 'Cadence d’intervalle',
    voltageInput: 'Tension de service',
    manualButton: 'Utiliser la pointe manuelle',
    manualError: 'Entrez une valeur kWh de pointe positive.',
    manualDisclaimer:
      'Avis : ce parcours ne génère jamais de graphique. Joignez la preuve de la lecture intervalle lors de la soumission.'
  },
  uploader: {
    uploadType: 'Téléversez des fichiers CSV, XLSX ou XML Green Button.',
    flexibleTitle: 'Données intervalle flexibles',
    flexibleDescription: 'CSV, XLSX ou XML Green Button avec mappage configurable horodatage/valeur.',
    smocTitle: 'Données SMOC de NS Power',
    smocDescription: 'Analyseur XLSX dédié lisant Interval Period End Timestamp Local et les champs Max A.',
    dragTitle: 'Glissez-déposez les données intervalle',
    dragFlexible: 'Les fichiers CSV, XLSX ou XML Green Button sont acceptés.',
    dragSmoc: 'Fichiers XLSX SMOC de NS Power (première feuille).',
    modePrefix: 'Mode :',
    browse: 'Parcourir les fichiers',
    parsing: 'Analyse…'
  },
  mapper: {
    title: 'Associer vos colonnes',
    subtitle: 'Choisissez les champs horodatage et mesure.',
    helpLabel: 'Aide pour l’association des colonnes',
    time: 'Colonne temporelle',
    value: 'Colonne de valeur',
    units: 'Unités',
    voltage: 'Tension du système',
    voltageHint: '(240 V recommandé)',
    continue: 'Continuer',
    cadenceNote: 'Nous vérifions automatiquement la cadence (15, 30 ou 60 minutes).',
    columnFallback: (index: string) => `Colonne ${index}`,
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
    title: 'Profil de demande',
    peakLine: 'Pointe annuelle',
    percentile: '95e centile',
    view: 'Vue',
    cadenceBadge: (minutes: number) => `Cadence de ${minutes} minutes`,
    cadenceValue: (minutes: number) => `${minutes} minutes`,
    download: 'Télécharger le PNG du profil de demande',
    demandChart: 'Graphique de demande',
    coverage: 'Couverture',
    dataQuality: 'Qualité des données',
    intervals: 'intervalles',
    unableExport: 'Impossible d’exporter le profil de demande.',
    peakMarker: 'Pointe'
  },
  calculator: {
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
    diversifiedTotal: 'Total diversifié',
    adjustedTo: 'ajusté à',
    addLoad: 'Ajouter une charge',
    loadPlaceholder: 'Nom',
    remove: 'Retirer',
    availableMargin: 'Marge disponible',
    alwaysConfirm: 'Confirmez toujours avec les exigences du code local (CEC/NEC) et du service public.',
    effectiveCapacity: 'Capacité effective du disjoncteur principal',
    capacityDetail: (effectiveAmps: string, limitingAmps: number, percent: number) =>
      `${effectiveAmps} A (plafonnée par le service/disjoncteur de ${limitingAmps} A) à ${percent} %.`,
    entered: 'saisie',
    afterAdjustment: 'après ajustement',
    additions: 'Ajouts proposés',
    statusOk: 'OK',
    statusUpgrade: 'Mise à niveau requise'
  },
  report: {
    title: 'Rapport d’une page',
    subtitle: 'Copiez les points saillants pour votre dossier de permis.',
    download: 'Télécharger le rapport',
    coverage: 'Couverture',
    cadence: 'Cadence',
    cadenceData: (minutes: number) => `Données aux ${minutes} minutes`,
    manualCadenceValue: (minutes: number) => `${minutes} minutes`,
    notAvailable: 's.o.',
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
  },
  messages: {
    smocExcelOnly: 'Les téléversements SMOC de NS Power doivent être des classeurs Excel (.xlsx).',
    parsingSmoc: 'Analyse des données Excel SMOC de NS Power…',
    parsingExcel: 'Analyse des données Excel…',
    parsingXml: 'Analyse des données XML…',
    xmlRecognized: 'Format XML reconnu — association manuelle non requise.',
    xmlAutoMapFailed:
      'Impossible d’associer automatiquement le fichier XML. Associez les colonnes manuellement pour continuer.',
    xmlFieldsNotDetected:
      'Le fichier XML a été analysé, mais les champs d’horodatage et de kWh n’ont pas été détectés. Associez-les manuellement pour continuer.',
    unableParseFile: 'Impossible d’analyser le fichier.',
    unableReadFile: 'Impossible de lire le fichier.',
    excelTimeout: 'L’analyse du fichier Excel a expiré. Réessayez ou utilisez un fichier plus petit.',
    excelWorkerCrashed: 'Le processus d’analyse Excel s’est arrêté de façon inattendue.',
    unableParseExcel: 'Impossible d’analyser le fichier Excel.',
    sheetJsFailed: 'Échec du chargement de la bibliothèque SheetJS.',
    noHeaders: 'Aucun en-tête détecté. Ajoutez des noms de colonnes à la première ligne.',
    noWorksheets: 'Le classeur ne contient aucune feuille de calcul.',
    worksheetUnreadable: 'Les données de la feuille de calcul n’ont pas pu être lues.',
    worksheetEmpty: 'La feuille de calcul est vide.',
    firstRowHeaders: 'La première ligne doit contenir des en-têtes.',
    noTimestampColumn:
      'Aucune colonne d’horodatage trouvée. Nommez clairement le champ de temps (p. ex. « Timestamp ») ou assurez-vous qu’une colonne contient des dates lisibles.',
    noUsableRows: 'Aucune ligne utilisable n’a été trouvée dans la première feuille de calcul.',
    noValidXml: 'Aucune donnée valide trouvée dans le fichier XML.',
    notEnoughData: 'Données insuffisantes pour l’analyse. Au moins une année de données est requise.',
    noUsableSmocRows:
      'Aucune ligne SMOC de NS Power utilisable n’a été trouvée. Vérifiez que les colonnes d’horodatage et Max A contiennent des données valides.',
    noIntervalEndColumn: 'Colonne « Interval Period End Timestamp » introuvable.',
    noMaxAColumns: 'Les colonnes Max A(a) ou Max A(c) sont requises pour calculer l’ampérage.',
    smocGaps:
      'Des écarts plus grands que la cadence prévue ont été détectés dans les données SMOC de NS Power. Comblez ou justifiez les intervalles manquants avant de réessayer.',
    needRowsForCadence: 'Quelques lignes avec des horodatages valides sont nécessaires pour déterminer la cadence.',
    cadenceUncomputable:
      'Impossible de calculer la cadence à partir des premières lignes. Vérifiez s’il y a des horodatages en double ou manquants.',
    irregularIntervals:
      'Les intervalles semblent irréguliers dans les premières dizaines de lignes. Vérifiez s’il manque des relevés ou s’il y a des écarts.',
    noRowsAfterParse: 'Aucune ligne ne reste après l’analyse.',
    needContinuousYear: 'Téléversez au moins une année continue de données intervalle.',
    noRecentData: 'Aucune donnée récente n’a été trouvée pour la dernière année.',
    needRecent12Months: 'Des données couvrant les 12 derniers mois sont nécessaires pour continuer.',
    invalidXml: 'Le fichier téléversé contient du XML non valide.',
    verdictOk: 'La demande semble respecter la capacité permise du disjoncteur principal.',
    verdictServiceUpgrade:
      'Une augmentation de la taille du service est requise pour correspondre au calibre du disjoncteur principal.',
    verdictExceeds:
      'La charge calculée dépasse la capacité effective du disjoncteur principal; envisagez une mise à niveau.',
    unableRenderChart: 'Impossible de générer l’image du graphique.',
    unablePrepareCanvas: 'Impossible de préparer le canevas d’exportation.',
    rowLimit: (rows: string) =>
      `Seules les ${rows} premières lignes ont été traitées afin que le navigateur reste réactif sur GitHub Pages.`,
    timestepOverHour: (minutes: string) => `Le pas de temps des données dépasse 1 heure : ${minutes} minutes.`,
    timestepOver60: (minutes: string) => `Le pas de temps des données dépasse 60 minutes : ${minutes} minutes.`,
    unexpectedCadence: (expected: string, detected: string) =>
      `Données aux ${expected} minutes attendues; cadence de ${detected} minutes détectée.`
  }
};

export const translations = { en, fr };

export function buildSnapshotLabels(copy: Copy) {
  return {
    title: copy.chart.title,
    oneYearPeak: copy.chart.peakLine,
    percentile95: copy.chart.percentile,
    viewing: copy.chart.view,
    highlights: copy.report.title,
    coverage: copy.chart.coverage,
    coverageMissing: copy.results.noGraph,
    cadence: copy.report.cadence,
    cadenceMissing: copy.report.notAvailable,
    dataQuality: copy.chart.dataQuality,
    intervals: copy.chart.intervals,
    amps: copy.units.amps,
    formatCadence: copy.report.cadenceData,
    locale: copy.locale,
    colon: copy.colon
  };
}

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

type MessageKey = keyof Copy['messages'];

const normalize = (message: string) => message.toLowerCase().trim();

const errorMap: Record<string, string> = {
  [normalize(en.home.manualError)]: 'home.manualError',
  [normalize(en.chart.unableExport)]: 'chart.unableExport',
  [normalize(en.uploader.uploadType)]: 'uploader.uploadType'
};
(Object.keys(en.messages) as MessageKey[]).forEach((key) => {
  const value = en.messages[key];
  if (typeof value === 'string') {
    errorMap[normalize(value)] = `messages.${key}`;
  }
});

const patternMessages: Array<{ pattern: RegExp; render: (copy: Copy, groups: string[]) => string }> = [
  {
    pattern: /^Only the first (.+) rows were processed to keep the browser responsive on GitHub Pages\.$/,
    render: (copy, [rows]) => copy.messages.rowLimit(rows)
  },
  {
    pattern: /^Data timestep is larger than 1 hour: (.+) minutes\.$/,
    render: (copy, [minutes]) => copy.messages.timestepOverHour(minutes)
  },
  {
    pattern: /^Data timestep is larger than 60 minutes: (.+) minutes\.$/,
    render: (copy, [minutes]) => copy.messages.timestepOver60(minutes)
  },
  {
    pattern: /^We expected (.+)-minute data; detected (.+)-minute cadence\.$/,
    render: (copy, [expected, detected]) => copy.messages.unexpectedCadence(expected, detected)
  }
];

export function localizeError(message: string, lang: Language) {
  const copy = translations[lang];
  const trimmed = message.trim();
  const key = errorMap[normalize(trimmed)];
  if (key) {
    const resolved = key
      .split('.')
      .reduce<unknown>((current, part) => (current as Record<string, unknown>)?.[part], copy);
    return typeof resolved === 'string' ? resolved : message;
  }
  for (const { pattern, render } of patternMessages) {
    const match = trimmed.match(pattern);
    if (match) {
      return render(copy, match.slice(1));
    }
  }
  return message;
}

// Maps an auto-generated default label (e.g. a load name) to the active language, leaving user-typed names untouched.
export function relabelDefault(label: string, lang: Language) {
  const defaults: Array<(copy: Copy) => string> = [
    (copy) => copy.chart.peakLine,
    (copy) => copy.report.manualPeak,
    (copy) => copy.calculator.proposedLoads,
    (copy) => copy.report.loadFallback
  ];
  for (const pick of defaults) {
    if (pick(en) === label || pick(fr) === label) {
      return pick(translations[lang]);
    }
  }
  return label;
}
