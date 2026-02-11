declare global {
  interface Window {
    wb?: {
      init?: (event: Event, selector?: string) => void;
      ready?: (event: Event, selector?: string) => void;
    };
    jQuery?: {
      (target: unknown): { trigger: (eventName: string) => void };
    };
  }
}

export function enhanceWet(selector = '.wb-init, .wb-frmvld, .wb-details'): void {
  if (typeof window === 'undefined') return;

  if (window.jQuery) {
    window.jQuery(document).trigger('wb-updated.wb');
  }

  const event = new Event('timerpoke.wb');
  window.wb?.init?.(event, selector);
  window.wb?.ready?.(event, selector);
}
