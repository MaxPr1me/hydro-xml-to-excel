/// <reference lib="webworker" />
import { excelBufferToCsv } from '../lib/convert';
import { parseCsv, parseExcel, type ExcelParseResult } from '../lib/parse';
import type { CsvPreview } from '../types';

export interface ExcelWorkerRequest {
  jobId: number;
  buffer: ArrayBuffer;
  allowConversion: boolean;
}

export type ExcelWorkerSuccess = {
  jobId: number;
  type: 'success';
  preview: CsvPreview;
  warning?: string;
  usedConversion: boolean;
};

export type ExcelWorkerError = {
  jobId: number;
  type: 'error';
  message: string;
};

export type ExcelWorkerResponse = ExcelWorkerSuccess | ExcelWorkerError;

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = async (event: MessageEvent<ExcelWorkerRequest>) => {
  const { jobId, buffer, allowConversion } = event.data;
  try {
    const { preview, warning }: ExcelParseResult = await parseExcel(buffer);
    const payload: ExcelWorkerSuccess = { jobId, type: 'success', preview, warning, usedConversion: false };
    ctx.postMessage(payload);
  } catch (error) {
    if (allowConversion) {
      try {
        const csvText = await excelBufferToCsv(buffer);
        const preview = parseCsv(csvText);
        const payload: ExcelWorkerSuccess = {
          jobId,
          type: 'success',
          preview,
          warning: undefined,
          usedConversion: true
        };
        ctx.postMessage(payload);
        return;
      } catch (conversionError) {
        const payload: ExcelWorkerError = {
          jobId,
          type: 'error',
          message:
            (conversionError as Error)?.message ?? 'Excel conversion fallback could not parse the file.'
        };
        ctx.postMessage(payload);
        return;
      }
    }
    const payload: ExcelWorkerError = {
      jobId,
      type: 'error',
      message: (error as Error)?.message ?? 'Unable to parse the Excel file.'
    };
    ctx.postMessage(payload);
  }
};
