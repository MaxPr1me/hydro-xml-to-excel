/// <reference lib="webworker" />
import { parseExcel } from '../lib/parse';
import type { CsvPreview } from '../types';

export interface ExcelWorkerRequest {
  jobId: number;
  buffer: ArrayBuffer;
}

export type ExcelWorkerSuccess = {
  jobId: number;
  type: 'success';
  preview: CsvPreview;
};

export type ExcelWorkerError = {
  jobId: number;
  type: 'error';
  message: string;
};

export type ExcelWorkerResponse = ExcelWorkerSuccess | ExcelWorkerError;

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = async (event: MessageEvent<ExcelWorkerRequest>) => {
  const { jobId, buffer } = event.data;
  try {
    const preview = await parseExcel(buffer);
    const payload: ExcelWorkerSuccess = { jobId, type: 'success', preview };
    ctx.postMessage(payload);
  } catch (error) {
    const payload: ExcelWorkerError = {
      jobId,
      type: 'error',
      message: (error as Error)?.message ?? 'Unable to parse the Excel file.'
    };
    ctx.postMessage(payload);
  }
};
