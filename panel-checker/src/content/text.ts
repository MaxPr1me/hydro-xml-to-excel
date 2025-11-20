// TODO: Add French version later – SPARK (Système pour la pointe d’ampérage selon les relevés en kWh)
export const textEn = {
  organization: 'CanmetENERGY-Ottawa',
  toolName: 'LEEP’s SPARK Tool',
  subtitle: 'System for Peak Amperage from Real kWh',
  heroParagraph:
    'SPARK is a data-driven analysis tool developed by CanmetENERGY-Ottawa to support electrification retrofits in Canadian homes. Using historical interval meter data, SPARK calculates peak amperage and demonstrated demand so contractors can determine whether a main electrical panel actually requires an upgrade. By relying on real kWh consumption data rather than conservative assumptions, SPARK helps homeowners, utilities, and programs avoid unnecessary panel upgrades.',
  heroTagline: 'Real data. Real peaks. Smarter panel decisions.',
  nav: {
    upload: 'Upload & validate',
    results: 'Results'
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
      'Summarize diversified loads plus what-if appliances in one report.'
    ],
    summaryPrefix: 'Data OK!',
    summaryCoverageIntro: 'intervals covering',
    summaryPeakIntro: 'One-year peak demand hit',
    summaryPeakUnits: 'A.'
  },
  footer: {
    pwa: 'Installable PWA · Works offline after first load.',
    bilingual: 'Bilingual UI coming soon.',
    license:
      "License: NRCan End-User License Agreement for LEEP's SPARK Tool (System for Peak Amperage from Real kWh)."
  },
  help: {
    mapper:
      'Pick the column that holds time or timestamp values and the column with your measurement (kWh, kW, or amps). Knowing which column is time and which is the reading lets us build the demand profile automatically.',
    panel:
      'This calculator shows your service and main breaker sizes and lets you test extra loads like heat pumps, EV chargers, or ranges. Use the nameplate data for amperage (Rated Current, Rated Load Amps/RLA, or Input Current) to see if the panel can handle new equipment without an upgrade.'
  }
} as const;
