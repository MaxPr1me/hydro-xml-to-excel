import { DependencyList, useEffect } from 'react';
import { enhanceWet } from '../lib/wet';

export function useWetEnhance(dependencies: DependencyList, selector?: string): void {
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      enhanceWet(selector);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
}
