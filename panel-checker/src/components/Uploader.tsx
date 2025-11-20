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

interface Props {
  mode: UploadMode;
  onModeChange: (mode: UploadMode) => void;
  onPreview: (preview: CsvPreview) => void;
  onParsedData: (result: MappingResult) => void;
}

const modes: Array<{ id: UploadMode; title: string; description: string }> = [
  {
    id: 'flexible',
    title: 'Flexible interval data',
    description: 'CSV, XLSX, or Green Button XML with configurable timestamp/value mapping.'
  },
  {
    id: 'ns-power-smoc',
    title: 'NS Power SMOC data',
    description: 'Dedicated XLSX parser that reads Interval Period End Timestamp Local and Max A fields.'
  }
];

export default function Uploader({ mode, onModeChange, onPreview, onParsedData }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const jobIdRef = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
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
        if (event.data?.jobId !== jobId) {
          return;
        }
        cleanup();
        if (event.data.type === 'success') {
          resolve({ preview: event.data.preview, warning: event.data.warning });
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

      worker.postMessage({ jobId, buffer });
    });
  }, [ensureWorker]);

  const handleFiles = useCallback(
    async (file: File) => {
      setError(null);
      setIsLoading(true);
      setStatusMessage(null);
      setPerformanceWarning(null);
      try {
        const format = detectFileFormat(file.name, file.type ?? '');
        if (!format) {
          throw new Error('Upload CSV, XLSX, or Green Button XML files.');
        }

        if (mode === 'ns-power-smoc' && format !== 'excel') {
          throw new Error('NS Power SMOC uploads must be Excel workbooks (.xlsx).');
        }

        if (format === 'excel') {
          setStatusMessage(mode === 'ns-power-smoc' ? 'Parsing NS Power SMOC Excel data…' : 'Parsing Excel data…');
          const result = await parseExcelOffThread(await readFileBuffer(file));
          setPerformanceWarning(result.warning ?? null);

          if (mode === 'ns-power-smoc') {
            const mapped = parseNsPowerSmocRows(result.preview.columns, result.preview.rows);
            onParsedData(mapped);
          } else {
            onPreview(result.preview);
          }
        } else if (format === 'csv') {
          const preview = parseCsv(await file.text());
          onPreview(preview);
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
              setError(
                (err as Error).message || 'We could not auto-map the XML file. Map the columns manually to continue.'
              );
              onPreview(preview);
            }
          } else {
            setError('XML parsed, but we could not detect the timestamp and kWh fields. Map them manually to continue.');
            onPreview(preview);
          }
        }
      } catch (err) {
        setError((err as Error).message || 'Unable to parse the file.');
      } finally {
        setStatusMessage(null);
        setIsLoading(false);
      }
    },
    [mode, onParsedData, onPreview, parseExcelOffThread, readFileBuffer]
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {modes.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onModeChange(option.id)}
            className={`flex-1 min-w-[180px] rounded-2xl border px-4 py-3 text-left shadow-sm transition ${
              mode === option.id
                ? 'border-brand-600 bg-brand-50 text-brand-900'
                : 'border-slate-200 bg-white text-slate-800 hover:border-brand-300'
            }`}
          >
            <p className="text-sm font-semibold">{option.title}</p>
            <p className="text-xs text-slate-600">{option.description}</p>
          </button>
        ))}
      </div>

      <label
        htmlFor="file"
        className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-brand-500 bg-white/80 px-6 py-12 text-center text-brand-900 shadow-sm hover:bg-brand-50"
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
      >
        <ArrowUpTrayIcon className="h-10 w-10 text-brand-500" />
        <div>
          <p className="text-lg font-semibold">Drag and drop interval data</p>
          <p className="text-sm text-slate-500">{mode === 'ns-power-smoc' ? 'NS Power SMOC XLSX files (first worksheet).' : 'CSV, XLSX, or Green Button XML files are all accepted.'}</p>
        </div>
        <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">
          Mode: {mode === 'ns-power-smoc' ? 'NS Power SMOC data' : 'Flexible interval data'}
        </span>
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
        {performanceWarning && <p className="text-sm text-amber-600">{performanceWarning}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
