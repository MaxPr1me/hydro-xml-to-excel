import { InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { ReactNode, useEffect, useRef, useState } from 'react';

interface Props {
  label: string;
  children: ReactNode;
}

export default function InfoBubble({ label, children }: Props) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        ref={buttonRef}
        className="ml-2 inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? `${label.replace(/\s+/g, '-').toLowerCase()}-help` : undefined}
      >
        <InformationCircleIcon className="h-4 w-4" aria-hidden />
        <span className="ml-1">(?)</span>
      </button>
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          id={`${label.replace(/\s+/g, '-').toLowerCase()}-help`}
          aria-label={label}
          className="absolute right-0 top-full z-20 mt-2 w-80 max-w-xs rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700 shadow-xl"
        >
          <div className="flex items-start gap-3">
            <p className="flex-1 whitespace-pre-line">{children}</p>
            <button
              type="button"
              className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              onClick={() => setOpen(false)}
              aria-label="Close help"
            >
              <XMarkIcon className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
