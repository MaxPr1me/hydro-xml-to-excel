import { useCallback, useRef, useState } from 'react';
import Papa from 'papaparse';
import { ArrowUpTrayIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { CsvPreview } from '../types';

interface Props {
  onPreview: (preview: CsvPreview) => void;
}

export default function Uploader({ onPreview }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback(
    async (file: File) => {
      setError(null);
      const text = await file.text();
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      if (!parsed.meta.fields?.length) {
        setError('No headers detected. Please upload a CSV with column names.');
        return;
      }
      onPreview({ columns: parsed.meta.fields, rows: parsed.data as Record<string, string>[] });
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

  const loadSample = useCallback(async () => {
    const response = await fetch(`${import.meta.env.BASE_URL}sample-15min.csv`);
    const text = await response.text();
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    onPreview({ columns: parsed.meta.fields ?? [], rows: parsed.data as Record<string, string>[] });
  }, [onPreview]);

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
          <p className="text-lg font-semibold">Drag and drop a CSV</p>
          <p className="text-sm text-slate-500">Green Button XML support is on deck; for now use CSV.</p>
        </div>
        <button
          type="button"
          className="rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow"
          onClick={() => inputRef.current?.click()}
        >
          Browse files
        </button>
        <input
          id="file"
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={onChange}
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-brand-600 px-4 py-2 text-sm font-semibold text-brand-700"
          onClick={loadSample}
        >
          <DocumentArrowDownIcon className="h-4 w-4" />
          Try sample data
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
