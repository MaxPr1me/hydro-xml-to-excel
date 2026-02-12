import Plotly from 'plotly.js-dist-min';
import { computeDemandStats } from './parse';
import { dataUrlToBytes } from './pdf';
import type { IntervalDatum } from '../types';

type Metric = 'amps' | 'kwh';

interface SnapshotOptions {
  chartElement: HTMLDivElement;
  data: IntervalDatum[];
  metric: Metric;
  labels?: {
    title: string;
    oneYearPeak: string;
    percentile95: string;
    viewing: string;
    highlights: string;
    coverage: string;
    coverageMissing: string;
    cadence: string;
    cadenceMissing: string;
    dataQuality: string;
    intervals: string;
  };
}

export interface SnapshotResult {
  dataUrl: string;
  width: number;
  height: number;
}

interface ElementSnapshotOptions {
  element: HTMLElement;
  backgroundColor?: string;
  pixelRatio?: number;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to render chart image.'));
    image.src = url;
  });
}

export async function renderDemandProfileSnapshot(options: SnapshotOptions): Promise<SnapshotResult> {
  const stats = computeDemandStats(options.data);
  const chartUrl = (await Plotly.toImage(options.chartElement, {
    format: 'png',
    width: 1400,
    height: 720,
    scale: 2
  })) as string;

  const chartImage = await loadImage(chartUrl);

  const canvas = document.createElement('canvas');
  const padding = 48;
  canvas.width = 1600;
  canvas.height = 1050;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to prepare the export canvas.');
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = '#0f172a';
  context.font = '600 28px Inter, sans-serif';
  const labels = options.labels ?? {
    title: 'Demand profile',
    oneYearPeak: 'One-year peak',
    percentile95: '95th percentile',
    viewing: 'Viewing',
    highlights: 'Highlights',
    coverage: 'Coverage',
    coverageMissing: 'interval data required',
    cadence: 'Cadence',
    cadenceMissing: 'n/a',
    dataQuality: 'Data quality',
    intervals: 'intervals'
  };
  context.fillText(labels.title, padding, padding + 10);

  context.font = '400 16px Inter, sans-serif';
  const metricLabel = options.metric === 'amps' ? 'Amps' : 'kWh';
  const summaryLine = stats
    ? `${labels.oneYearPeak} ${stats.maxAmps.toFixed(0)} A · ${labels.percentile95} ${stats.percentile95.toFixed(0)} A · ${labels.viewing} ${metricLabel}`
    : `${labels.viewing} ${metricLabel}`;
  context.fillText(summaryLine, padding, padding + 40);

  const chartTop = padding + 60;
  const chartHeight = 640;
  context.drawImage(chartImage, padding, chartTop, canvas.width - padding * 2, chartHeight);

  const metricsTop = chartTop + chartHeight + 36;
  context.font = '700 16px Inter, sans-serif';
  context.fillText(labels.highlights, padding, metricsTop);

  context.font = '400 15px Inter, sans-serif';
  const lineHeight = 26;
  const coverageLine = stats
    ? `${labels.coverage}: ${stats.start.toLocaleDateString()} — ${stats.end.toLocaleDateString()}`
    : `${labels.coverage}: ${labels.coverageMissing}`;
  const cadenceLine = stats ? `${labels.cadence}: ${stats.cadenceMinutes}-minute data` : `${labels.cadence}: ${labels.cadenceMissing}`;
  const qualityLine = `${labels.dataQuality}: ${options.data.length.toLocaleString()} ${labels.intervals}`;

  [coverageLine, cadenceLine, qualityLine].forEach((line, index) => {
    context.fillText(line, padding, metricsTop + 12 + lineHeight * (index + 1));
  });

  return { dataUrl: canvas.toDataURL('image/jpeg', 0.92), width: canvas.width, height: canvas.height };
}

export function snapshotToBytes(snapshot: SnapshotResult): Uint8Array {
  return dataUrlToBytes(snapshot.dataUrl);
}

function cloneWithInlineStyles(node: HTMLElement): HTMLElement {
  const clone = node.cloneNode(true) as HTMLElement;
  const stack: Array<{ source: HTMLElement; target: HTMLElement }> = [{ source: node, target: clone }];

  while (stack.length) {
    const { source, target } = stack.pop() as { source: HTMLElement; target: HTMLElement };
    const style = getComputedStyle(source);
    for (const property of style) {
      target.style.setProperty(property, style.getPropertyValue(property), style.getPropertyPriority(property));
    }

    Array.from(source.childNodes).forEach((child, index) => {
      const targetChild = target.childNodes[index];
      if (child.nodeType === Node.ELEMENT_NODE && targetChild instanceof HTMLElement) {
        stack.push({ source: child as HTMLElement, target: targetChild });
      }
    });
  }

  return clone;
}


function syncFormControlValues(source: HTMLElement, target: HTMLElement) {
  const sourceControls = Array.from(source.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea'));
  const targetControls = Array.from(target.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea'));

  sourceControls.forEach((control, index) => {
    const targetControl = targetControls[index];
    if (!targetControl) return;

    if (control instanceof HTMLInputElement && targetControl instanceof HTMLInputElement) {
      targetControl.value = control.value;
      targetControl.checked = control.checked;
      return;
    }

    if (control instanceof HTMLTextAreaElement && targetControl instanceof HTMLTextAreaElement) {
      targetControl.value = control.value;
      targetControl.textContent = control.value;
      return;
    }

    if (control instanceof HTMLSelectElement && targetControl instanceof HTMLSelectElement) {
      targetControl.value = control.value;
      Array.from(targetControl.options).forEach((option) => {
        option.selected = option.value === control.value;
      });
    }
  });
}

function pruneExcludedElements(element: HTMLElement) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT);
  const toRemove: Element[] = [];

  let current: HTMLElement | null = element;
  while (current) {
    if (current.dataset?.exportExclude === 'true') {
      toRemove.push(current);
    }
    current = walker.nextNode() as HTMLElement | null;
  }

  toRemove.forEach((node) => node.remove());
}

export async function renderElementSnapshot({
  element,
  backgroundColor = '#ffffff',
  pixelRatio = 2
}: ElementSnapshotOptions): Promise<SnapshotResult> {
  const rect = element.getBoundingClientRect();
  const width = Math.max(1, Math.ceil(rect.width || element.offsetWidth));
  const height = Math.max(1, Math.ceil(rect.height || element.offsetHeight));

  const cloned = cloneWithInlineStyles(element);
  syncFormControlValues(element, cloned);
  pruneExcludedElements(cloned);

  const serializer = new XMLSerializer();
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.setAttribute('width', `${width}`);
  svg.setAttribute('height', `${height}`);

  const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
  foreignObject.setAttribute('width', '100%');
  foreignObject.setAttribute('height', '100%');
  foreignObject.appendChild(cloned);
  svg.appendChild(foreignObject);

  const svgString = serializer.serializeToString(svg);
  const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
  const svgImage = await loadImage(dataUrl);

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * pixelRatio));
  canvas.height = Math.max(1, Math.round(height * pixelRatio));
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to prepare the export canvas.');
  }

  context.fillStyle = backgroundColor;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(svgImage, 0, 0, canvas.width, canvas.height);

  return { dataUrl: canvas.toDataURL('image/jpeg', 0.92), width: canvas.width, height: canvas.height };
}
