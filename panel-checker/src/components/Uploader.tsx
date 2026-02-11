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
import ErrorSummary from './ErrorSummary';

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

  const toAnalyticsMode = (value: UploadMode) => (value === 'flexible' ? 'flex' : 'ns_power');

  const toFileType = (format: ReturnType<typeof detectFileFormat>): 'csv' | 'xlsx' | 'xml' => {
    if (format === 'excel') return 'xlsx';
    return format ?? 'csv';
  };

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
          const message = 'Upload CSV, XLSX, or Green Button XML files.';
          trackAnalysisError({ stage: 'upload', errorCode: 'UNSUPPORTED_EXTENSION' });
          setError(message);
          return;
        }

        if (mode === 'ns-power-smoc' && format !== 'excel') {
          const message = 'NS Power SMOC uploads must be Excel workbooks (.xlsx).';
          trackAnalysisError({ stage: 'upload', errorCode: 'INVALID_MODE_FILETYPE' });
          setError(message);
          return;
        }

        trackFileUpload({
          fileType: toFileType(format),
          isSample: false,
          approxSizeKb: Math.round(file.size / 1024),
          mode: toAnalyticsMode(mode)
        });

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
        const message = (err as Error).message || 'Unable to parse the file.';
        setError(message);
        trackAnalysisError({ stage: 'upload', errorCode: resolveUploadErrorCode(message) });
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
    <section className="panel panel-default" aria-labelledby="upload-heading">
      <header className="panel-heading">
        <h2 id="upload-heading" className="panel-title">Upload data</h2>
      </header>
      <div className="panel-body">
        <fieldset>
          <legend className="h5">Choose data mode</legend>
          <div className="row">
            {modes.map((option) => (
              <div key={option.id} className="col-md-6">
                <label className="radio">
                  <input type="radio" name="upload-mode" checked={mode === option.id} onChange={() => onModeChange(option.id)} />
                  <strong>{option.title}</strong>
                  <span className="display-block">{option.description}</span>
                </label>
              </div>
            ))}
          </div>
        </fieldset>

        <label htmlFor="file" className="display-block well text-center" onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
          <ArrowUpTrayIcon className="center-block" style={{ width: 40, height: 40 }} aria-hidden />
          <p className="h5">Drag and drop interval data</p>
          <p>{mode === 'ns-power-smoc' ? 'NS Power SMOC XLSX files (first worksheet).' : 'CSV, XLSX, or Green Button XML files are accepted.'}</p>
          <button type="button" className="btn btn-primary" onClick={() => inputRef.current?.click()} disabled={isLoading}>
            {isLoading ? 'Parsing…' : 'Choose file'}
          </button>
          <input id="file" ref={inputRef} type="file" accept=".csv,.xls,.xlsx,.xml,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/xml" className="wb-inv" onChange={onChange} />
        </label>

        <ErrorSummary errors={error ? [{ id: 'file', message: error }] : []} />
        {statusMessage && <p aria-live="polite">{statusMessage}</p>}
        {performanceWarning && <p className="text-warning">{performanceWarning}</p>}
      </div>
    </section>
  );
}
