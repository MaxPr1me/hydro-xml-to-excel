const GA_MEASUREMENT_ID = 'G-H7D2LYV208';

let initialized = false;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: any[]) => void;
  }
}

export function initAnalytics() {
  if (initialized || !GA_MEASUREMENT_ID) {
    return;
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  const hasInlineConfig = Array.isArray(window.dataLayer)
    ? window.dataLayer.some(
        (entry) => Array.isArray(entry) && entry[0] === 'config' && entry[1] === GA_MEASUREMENT_ID
      )
    : false;

  function gtag(...args: any[]) {
    window.dataLayer?.push(args);
  }
  if (!window.gtag) {
    window.gtag = gtag;
  }

  const existingScript = document.querySelector(
    `script[src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"]`
  );

  if (!existingScript) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);
  }

  if (!hasInlineConfig) {
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, { send_page_view: true });
  }

  initialized = true;
}

export function trackEvent(name: string, params: Record<string, any> = {}) {
  try {
    if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
      return;
    }
    window.gtag('event', name, params);
  } catch {
    // Avoid surfacing analytics failures to users
  }
}

export function trackToolLoaded() {
  trackEvent('tool_loaded');
}

export function trackModeSelected(mode: 'flex' | 'ns_power') {
  trackEvent('mode_selected', { mode });
}

export function trackFileUpload(opts: {
  fileType: 'csv' | 'xlsx' | 'xml';
  isSample: boolean;
  approxSizeKb?: number;
  mode: 'flex' | 'ns_power';
}) {
  const payload = {
    ...opts,
    approxSizeKb: typeof opts.approxSizeKb === 'number' ? Math.round(opts.approxSizeKb) : undefined
  };
  trackEvent('file_upload', payload);
}

export function trackMappingCompleted(opts: {
  timestepMinutes: number;
  durationDays: number;
  mode: 'flex' | 'ns_power';
}) {
  trackEvent('mapping_completed', opts);
}

export function trackAnalysisRun(opts: {
  mode: 'flex' | 'ns_power';
  method: 'verified' | 'manual_peak';
  hasData: boolean;
}) {
  trackEvent('analysis_run', opts);
}

export function trackAnalysisResult(opts: {
  mode: 'flex' | 'ns_power';
  method: 'verified' | 'manual_peak';
  jurisdiction?: string;
  panelRatingAmps?: number;
  maxDemandAmpsRounded?: number;
  upgradeRequired: boolean;
}) {
  trackEvent('analysis_result', opts);
}

export function trackSummaryDownload(opts: {
  format: 'pdf' | 'png';
  method: 'verified' | 'manual_peak';
  hasData: boolean;
}) {
  trackEvent('summary_download', opts);
}

export function trackAnalysisError(opts: {
  stage: 'upload' | 'mapping' | 'analysis' | 'pdf';
  errorCode: string;
}) {
  trackEvent('analysis_error', opts);
}

