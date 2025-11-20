const SHEETJS_URL = 'https://cdn.sheetjs.com/xlsx-0.20.2/package/xlsx.mjs';

export interface SheetDataModule {
  read: (
    data: ArrayBuffer,
    options?: {
      type: 'array';
      cellDates?: boolean;
    }
  ) => Workbook;
  utils: {
    sheet_to_json: <T = unknown>(sheet: Worksheet, options: SheetToJsonOptions) => T[];
    sheet_to_csv: (sheet: Worksheet) => string;
  };
  SSF: {
    parse_date_code: (value: number) => ExcelDate | null;
  };
}

export interface Workbook {
  SheetNames: string[];
  Sheets: Record<string, Worksheet>;
}

export type Worksheet = Record<string, unknown>;

export interface SheetToJsonOptions {
  header: 1;
  raw: boolean;
  defval?: unknown;
  blankrows?: boolean;
}

export interface ExcelDate {
  y?: number;
  m?: number;
  d?: number;
  H?: number;
  M?: number;
  S?: number;
}

let cachedModule: Promise<SheetDataModule> | null = null;

export async function loadXlsx(): Promise<SheetDataModule> {
  if (!cachedModule) {
    cachedModule = import(/* @vite-ignore */ SHEETJS_URL).then((mod) => {
      const resolved = (mod as { default?: SheetDataModule }).default ?? (mod as SheetDataModule);
      if (!resolved || typeof resolved.read !== 'function') {
        throw new Error('SheetJS library failed to load.');
      }
      return resolved;
    });
  }
  return cachedModule;
}
