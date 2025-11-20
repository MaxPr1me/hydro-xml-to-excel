import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpTrayIcon /* , DocumentArrowDownIcon */ } from '@heroicons/react/24/outline';
import { CsvPreview } from '../types';
import { detectFileFormat, parseCsv, parseExcel, parseGreenButtonXml, type FileFormat } from '../lib/parse';
import { excelBufferToCsv } from '../lib/convert';
import type { ExcelWorkerResponse } from '../workers/excelParser';

interface Props {
  onPreview: (preview: CsvPreview) => void;
}

/*
 * Try Sample data downloads are temporarily disabled on the front page to encourage verified data uploads.
 * Keeping the file manifest for future reference:
 * const SAMPLE_FILES: Record<FileFormat, string> = {
 *   csv: 'sample-15min.csv',
 *   excel: 'NSP interval data.xlsx',
 *   xml: 'NSPI_Electric_15_Minutes_01-01-2024_12-31-2024.XML'
 * };
 */

export default function Uploader({ onPreview }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const jobIdRef = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [allowExcelConversion, setAllowExcelConversion] = useState(false);
  const [conversionNotice, setConversionNotice] = useState<string | null>(null);
  const [performanceWarning, setPerformanceWarning] = useState<string | null>(null);

  useEffect(() => () => workerRef.current?.terminate(), []);

  const ensureWorker = useCallback(() => {
    if (workerRef.current) {
      return workerRef.current;
    }
    if (typeof Worker === 'undefined') {
      return null;
    }
    try {
      workerRef.current = new Worker(new URL('../workers/excelParser.ts', import.meta.url), {
        type: 'module'
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to start Excel worker', err);
      workerRef.current = null;
    }
    return workerRef.current;
  }, []);

  const readFileBuffer = useCallback((file: File) => {
    return new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error ?? new Error('Unable to read the file.'));
      reader.readAsArrayBuffer(file);
    });
  }, []);

  const parseExcelOffThread = useCallback(
    async (
      buffer: ArrayBuffer,
      allowConversion: boolean
    ): Promise<{ preview: CsvPreview; usedConversion: boolean; warning?: string }> => {
      const worker = ensureWorker();
      if (!worker) {
        try {
          const result = await parseExcel(buffer);
          return { preview: result.preview, warning: result.warning, usedConversion: false };
        } catch (error) {
          if (!allowConversion) {
            throw error;
          }
          try {
            const csvText = await excelBufferToCsv(buffer);
            const preview = parseCsv(csvText);
            return { preview, usedConversion: true };
          } catch (conversionError) {
            const originalMessage = (error as Error)?.message ?? 'Excel parsing failed.';
            const conversionMessage =
              (conversionError as Error)?.message ?? 'Excel conversion fallback also failed.';
            throw new Error(`${originalMessage} ${conversionMessage}`);
          }
        }
      }
      jobIdRef.current += 1;
      const jobId = jobIdRef.current;
      return new Promise<{ preview: CsvPreview; usedConversion: boolean; warning?: string }>((resolve, reject) => {
        const timeoutId = window.setTimeout(() => {
          cleanup();
          reject(new Error('Excel parsing timed out. Try again or use a smaller file.'));
        }, 20_000);

        const cleanup = () => {
          worker.removeEventListener('message', handleMessage as EventListener);
          worker.removeEventListener('error', handleError as EventListener);
          window.clearTimeout(timeoutId);
        };

        const handleMessage = (event: MessageEvent<ExcelWorkerResponse>) => {
          if (event.data?.jobId !== jobId) {
            return;
          }
          cleanup();
          if (event.data.type === 'success') {
            resolve({
              preview: event.data.preview,
              usedConversion: event.data.usedConversion,
              warning: event.data.warning
            });
          } else {
            reject(new Error(event.data.message));
          }
        };

        const handleError = (event: ErrorEvent) => {
          cleanup();
          reject(new Error(event.message || 'Excel worker crashed.'));
        };

        worker.addEventListener('message', handleMessage as EventListener);
        worker.addEventListener('error', handleError as EventListener);
        worker.postMessage({ jobId, buffer, allowConversion }, [buffer]);
      });
    },
    [ensureWorker]
  );

  const handleFiles = useCallback(
    async (file: File) => {
      setError(null);
      setStatusMessage(null);
      setIsLoading(true);
      setConversionNotice(null);
      setPerformanceWarning(null);
      try {
        const format = detectFileFormat(file.name, file.type ?? '');
        if (!format) {
          throw new Error('Upload CSV, XLSX, or Green Button XML files.');
        }
        let preview: CsvPreview;
        if (format === 'excel') {
          setStatusMessage('Parsing Excel data…');
          const result = await parseExcelOffThread(await readFileBuffer(file), allowExcelConversion);
          preview = result.preview;
          setConversionNotice(
            result.usedConversion
              ? 'Excel fallback converted the first worksheet to CSV. Dates and formulas were flattened.'
              : null
          );
          setPerformanceWarning(result.warning ?? null);
        } else if (format === 'csv') {
          preview = parseCsv(await file.text());
          setConversionNotice(null);
          setPerformanceWarning(null);
        } else {
          preview = parseGreenButtonXml(await file.text());
          setConversionNotice(null);
          setPerformanceWarning(null);
        }
        onPreview(preview);
      } catch (err) {
        setError((err as Error).message || 'Unable to parse the file.');
      } finally {
        setStatusMessage(null);
        setIsLoading(false);
      }
    },
    [allowExcelConversion, onPreview, parseExcelOffThread, readFileBuffer]
  );

  const onDrop = useCallback(
    async (event: React.DragEvent<HTMLLabelElement>) => {
      event.preventDefault();
      const file = event.dataTransfer.files?.[0];
      if (file) {
        await handleFiles(file);
      }
    },
    [handleFiles]
  );

  const onChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        await handleFiles(file);
        event.target.value = '';
      }
    },
    [handleFiles]
  );

  /*
   * Legacy Try Sample handler left intact for future reactivation.
   * const loadSample = useCallback(async (format: FileFormat) => { ... }, []);
   */

  return (
    <div className="space-y-4">
      <label
        htmlFor="file"
        className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-brand-500 bg-white/80 px-6 py-12 text-center text-brand-900 shadow-sm hover:bg-brand-50"
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
      >
        <ArrowUpTrayIcon className="h-10 w-10 text-brand-500" />
        <div>
          <p className="text-lg font-semibold">Drag and drop interval data</p>
          <p className="text-sm text-slate-500">CSV, XLSX, or Green Button XML files are all accepted.</p>
        </div>
        <button
          type="button"
          className="rounded-full bg-accent-400 px-5 py-2 text-sm font-semibold text-brand-900 shadow"
          onClick={() => inputRef.current?.click()}
          disabled={isLoading}
        >
          {isLoading ? 'Parsing…' : 'Browse files'}
        </button>
        <input
          id="file"
          ref={inputRef}
          type="file"
          accept=".csv,.xls,.xlsx,.xml,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/xml"
          className="sr-only"
          onChange={onChange}
        />
      </label>

      <div className="space-y-1">
        {statusMessage && <p className="text-sm text-brand-700">{statusMessage}</p>}
        {conversionNotice && <p className="text-sm text-amber-600">{conversionNotice}</p>}
        {performanceWarning && <p className="text-sm text-amber-600">{performanceWarning}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3">
        <label className="flex items-start gap-3 text-sm text-slate-600">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            checked={allowExcelConversion}
            onChange={(event) => setAllowExcelConversion(event.target.checked)}
          />
          <span>
            <span className="font-semibold text-brand-800">Auto-convert Excel if parsing fails</span>
            <span className="mt-1 block text-xs text-slate-500">
              Uses only the first worksheet and flattens formulas/dates into CSV for troubleshooting.
            </span>
          </span>
        </label>
      </div>
    </div>
  );
}
