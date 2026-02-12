import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { CsvPreview, UploadMode } from '../types';
import {
  detectFileFormat,
  parseCsv,
  parseExcel,
  parseGreenButtonXml,
  parseNsPowerSmocRows,
  mapRecords,
  resolveKnownXmlMapping,
  type MappingResult
} from '../lib/parse';
import type { ExcelWorkerResponse } from '../workers/excelParser';
import { trackAnalysisError, trackFileUpload } from '../analytics';
import { useI18n } from '../content/i18n';

interface Props {
  mode: UploadMode;
  onModeChange: (mode: UploadMode) => void;
  onPreview: (preview: CsvPreview) => void;
  onParsedData: (result: MappingResult) => void;
}

export default function Uploader({ mode, onModeChange, onPreview, onParsedData }: Props) {
  const { copy, translateError } = useI18n();
  const modes: Array<{ id: UploadMode; title: string; description: string }> = [
    { id: 'flexible', title: copy.uploader.flexibleTitle, description: copy.uploader.flexibleDescription },
    { id: 'ns-power-smoc', title: copy.uploader.smocTitle, description: copy.uploader.smocDescription }
  ];

  const inputRef = useRef<HTMLInputElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const jobIdRef = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [performanceWarning, setPerformanceWarning] = useState<string | null>(null);

  const toAnalyticsMode = (value: UploadMode) => (value === 'flexible' ? 'flex' : 'ns_power');
  const toFileType = (format: ReturnType<typeof detectFileFormat>): 'csv' | 'xlsx' | 'xml' => (format === 'excel' ? 'xlsx' : format ?? 'csv');

  const resolveUploadErrorCode = (message: string) => {
    const lowered = message.toLowerCase();
    if (lowered.includes('timed out')) return 'EXCEL_TIMEOUT';
    if (lowered.includes('100,000') || lowered.includes('100000')) return 'TOO_MANY_ROWS';
    if (lowered.includes('timestep') || lowered.includes('cadence')) return 'UNSUPPORTED_CADENCE';
    if (lowered.includes('year of data') || lowered.includes('coverage')) return 'INSUFFICIENT_COVERAGE';
    if (lowered.includes('invalid xml')) return 'INVALID_XML';
    return 'PARSE_FAILURE';
  };

  useEffect(() => () => workerRef.current?.terminate(), []);

  const ensureWorker = useCallback(() => {
    if (workerRef.current) return workerRef.current;
    if (typeof Worker === 'undefined') return null;
    try {
      workerRef.current = new Worker(new URL('../workers/excelParser.ts', import.meta.url), { type: 'module' });
    } catch (err) {
      console.error('Failed to start Excel worker', err);
      workerRef.current = null;
    }
    return workerRef.current;
  }, []);

  const readFileBuffer = useCallback((file: File) => new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read the file.'));
    reader.readAsArrayBuffer(file);
  }), []);

  const parseExcelOffThread = useCallback(async (buffer: ArrayBuffer): Promise<{ preview: CsvPreview; warning?: string }> => {
    const worker = ensureWorker();
    if (!worker) {
      const result = await parseExcel(buffer);
      return { preview: result.preview, warning: result.warning };
    }
    jobIdRef.current += 1;
    const jobId = jobIdRef.current;
    return new Promise<{ preview: CsvPreview; warning?: string }>((resolve, reject) => {
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
        if (event.data?.jobId !== jobId) return;
        cleanup();
        if (event.data.type === 'success') resolve({ preview: event.data.preview, warning: event.data.warning });
        else reject(new Error(event.data.message));
      };
      const handleError = (event: ErrorEvent) => {
        cleanup();
        reject(new Error(event.message || 'Excel worker crashed.'));
      };
      worker.addEventListener('message', handleMessage as EventListener);
      worker.addEventListener('error', handleError as EventListener);
      worker.postMessage({ jobId, buffer });
    });
  }, [ensureWorker]);

  const handleFiles = useCallback(async (file: File) => {
    setError(null);
    setIsLoading(true);
    setStatusMessage(null);
    setPerformanceWarning(null);
    try {
      const format = detectFileFormat(file.name, file.type ?? '');
      if (!format) {
        const message = 'Upload CSV, XLSX, or Green Button XML files.';
        trackAnalysisError({ stage: 'upload', errorCode: 'UNSUPPORTED_EXTENSION' });
        setError(translateError(message));
        return;
      }
      if (mode === 'ns-power-smoc' && format !== 'excel') {
        const message = 'NS Power SMOC uploads must be Excel workbooks (.xlsx).';
        trackAnalysisError({ stage: 'upload', errorCode: 'INVALID_MODE_FILETYPE' });
        setError(translateError(message));
        return;
      }
      trackFileUpload({ fileType: toFileType(format), isSample: false, approxSizeKb: Math.round(file.size / 1024), mode: toAnalyticsMode(mode) });
      if (format === 'excel') {
        setStatusMessage(mode === 'ns-power-smoc' ? 'Parsing NS Power SMOC Excel data…' : 'Parsing Excel data…');
        const result = await parseExcelOffThread(await readFileBuffer(file));
        setPerformanceWarning(result.warning ?? null);
        if (mode === 'ns-power-smoc') onParsedData(parseNsPowerSmocRows(result.preview.columns, result.preview.rows));
        else onPreview(result.preview);
      } else if (format === 'csv') {
        onPreview(parseCsv(await file.text()));
      } else {
        setStatusMessage('Parsing XML data…');
        const preview = parseGreenButtonXml(await file.text());
        const mapping = resolveKnownXmlMapping(preview);
        if (mapping) {
          try {
            const mapped = mapRecords(preview, mapping);
            setStatusMessage('Recognized XML format — skipping manual mapping.');
            onParsedData(mapped);
          } catch (err) {
            setError(translateError((err as Error).message || 'We could not auto-map the XML file. Map the columns manually to continue.'));
            onPreview(preview);
          }
        } else {
          setError(translateError('XML parsed, but we could not detect the timestamp and kWh fields. Map them manually to continue.'));
          onPreview(preview);
        }
      }
    } catch (err) {
      const message = (err as Error).message || 'Unable to parse the file.';
      setError(translateError(message));
      trackAnalysisError({ stage: 'upload', errorCode: resolveUploadErrorCode(message) });
    } finally {
      setStatusMessage(null);
      setIsLoading(false);
    }
  }, [mode, onParsedData, onPreview, parseExcelOffThread, readFileBuffer, translateError]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {modes.map((option) => (
          <button key={option.id} type="button" onClick={() => onModeChange(option.id)} className={`flex-1 min-w-[180px] rounded-2xl border px-4 py-3 text-left shadow-sm transition ${mode === option.id ? 'border-brand-600 bg-brand-50 text-brand-900' : 'border-slate-200 bg-white text-slate-800 hover:border-brand-300'}`}>
            <p className="text-sm font-semibold">{option.title}</p>
            <p className="text-xs text-slate-600">{option.description}</p>
          </button>
        ))}
      </div>

      <label htmlFor="file" className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-brand-500 bg-white/80 px-6 py-12 text-center text-brand-900 shadow-sm hover:bg-brand-50" onDragOver={(event) => event.preventDefault()} onDrop={async (event) => {event.preventDefault(); const file = event.dataTransfer.files?.[0]; if (file) await handleFiles(file);}}>
        <ArrowUpTrayIcon className="h-10 w-10 text-brand-500" />
        <div>
          <p className="text-lg font-semibold">{copy.uploader.dragTitle}</p>
          <p className="text-sm text-slate-500">{mode === 'ns-power-smoc' ? copy.uploader.dragSmoc : copy.uploader.dragFlexible}</p>
        </div>
        <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">{copy.uploader.modePrefix} {mode === 'ns-power-smoc' ? copy.uploader.smocTitle : copy.uploader.flexibleTitle}</span>
        <button type="button" className="rounded-full bg-accent-400 px-5 py-2 text-sm font-semibold text-brand-900 shadow" onClick={() => inputRef.current?.click()} disabled={isLoading}>
          {isLoading ? copy.uploader.parsing : copy.uploader.browse}
        </button>
        <input id="file" ref={inputRef} type="file" accept=".csv,.xls,.xlsx,.xml,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/xml" className="sr-only" onChange={async (event) => {const file = event.target.files?.[0]; if (file) {await handleFiles(file); event.target.value='';}}} />
      </label>

      <div className="space-y-1">
        {statusMessage && <p className="text-sm text-brand-700">{translateError(statusMessage)}</p>}
        {performanceWarning && <p className="text-sm text-amber-600">{translateError(performanceWarning)}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
