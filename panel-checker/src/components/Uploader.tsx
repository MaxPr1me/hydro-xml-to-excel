import { useCallback, useRef, useState } from 'react';
import { ArrowUpTrayIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { CsvPreview } from '../types';
import { detectFileFormat, parseCsv, parseExcel, parseGreenButtonXml, type FileFormat } from '../lib/parse';

interface Props {
  onPreview: (preview: CsvPreview) => void;
}

const SAMPLE_FILES: Record<FileFormat, string> = {
  csv: 'sample-15min.csv',
  excel: 'NSP interval data.xlsx',
  xml: 'NSPI_Electric_15_Minutes_01-01-2024_12-31-2024.XML'
};

export default function Uploader({ onPreview }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFiles = useCallback(
    async (file: File) => {
      setError(null);
      setIsLoading(true);
      try {
        const format = detectFileFormat(file.name, file.type ?? '');
        if (!format) {
          throw new Error('Upload CSV, XLSX, or Green Button XML files.');
        }
        let preview: CsvPreview;
        if (format === 'excel') {
          preview = await parseExcel(await file.arrayBuffer());
        } else if (format === 'csv') {
          preview = parseCsv(await file.text());
        } else {
          preview = parseGreenButtonXml(await file.text());
        }
        onPreview(preview);
      } catch (err) {
        setError((err as Error).message || 'Unable to parse the file.');
      } finally {
        setIsLoading(false);
      }
    },
    [onPreview]
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

  const loadSample = useCallback(
    async (format: FileFormat) => {
      setError(null);
      setIsLoading(true);
      try {
        const filePath = SAMPLE_FILES[format];
        const url = `${import.meta.env.BASE_URL}${encodeURIComponent(filePath)}`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Unable to load the sample file.');
        }
        let preview: CsvPreview;
        if (format === 'excel') {
          preview = await parseExcel(await response.arrayBuffer());
        } else if (format === 'csv') {
          preview = parseCsv(await response.text());
        } else {
          preview = parseGreenButtonXml(await response.text());
        }
        onPreview(preview);
      } catch (err) {
        setError((err as Error).message || 'Unable to load the sample file.');
      } finally {
        setIsLoading(false);
      }
    },
    [onPreview]
  );

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

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Try sample:</span>
        {(['csv', 'excel', 'xml'] as FileFormat[]).map((format) => (
          <button
            key={format}
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-brand-600 px-4 py-2 text-sm font-semibold text-brand-700"
            onClick={() => loadSample(format)}
            disabled={isLoading}
          >
            <DocumentArrowDownIcon className="h-4 w-4" />
            {format.toUpperCase()}
          </button>
        ))}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
