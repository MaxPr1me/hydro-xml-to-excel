import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { ReactNode, useState } from 'react';

interface Props {
  label: string;
  children: ReactNode;
}

export default function InfoBubble({ label, children }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-flex items-center" onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className="ml-2 inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        onMouseEnter={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((prev) => !prev)}
        aria-label={label}
      >
        <InformationCircleIcon className="h-4 w-4" aria-hidden />
        <span className="ml-1">(?)</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-2 max-w-xs rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-lg">
          {children}
        </div>
      )}
    </div>
  );
}
