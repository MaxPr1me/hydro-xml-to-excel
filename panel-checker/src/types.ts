export type IntervalUnit = 'kWh' | 'kW' | 'Amps';
export type UploadMode = 'flexible' | 'ns-power-smoc';

export interface IntervalDatum {
  timestamp: Date;
  value: number; // original measurement
  unit: IntervalUnit;
  amps: number; // derived amps
  voltage: number;
  intervalMinutes: number;
}

export type AnalysisSource = 'none' | 'file' | 'manual';

export interface ManualPeakEstimate {
  kwh: number;
  intervalMinutes: number;
  voltage: 120 | 208 | 240;
  amps: number;
}

export interface AnalysisState {
  source: AnalysisSource;
  data: IntervalDatum[];
  manualPeak?: ManualPeakEstimate | null;
  mode?: UploadMode;
}

export interface CsvPreview {
  columns: string[];
  rows: Record<string, string | undefined>[];
}

export interface ColumnMapping {
  timeColumn: string;
  valueColumn: string;
  unit: IntervalUnit;
  voltage: 120 | 208 | 240;
}

export interface DemandStats {
  cadenceMinutes: number;
  maxAmps: number;
  percentile95: number;
  start: Date;
  end: Date;
}

export interface LoadEntry {
  id: string;
  name: string;
  amps: number;
  continuous: boolean;
}

export interface PanelInputs {
  serviceRating: number;
  mainBreaker: number;
  busRating: number;
  voltage: 120 | 208 | 240;
  existingLoads: LoadEntry[];
  newLoads: LoadEntry[];
}

export interface PanelVerdict {
  diversifiedLoad: number;
  availableMargin: number;
  status: 'OK' | 'Review' | 'Upgrade';
  message: string;
  proposedLoads: Array<Pick<LoadEntry, 'name' | 'amps' | 'continuous'>>;
}
