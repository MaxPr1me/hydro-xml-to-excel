import Plotly from 'plotly.js-dist-min';
import { computeDemandStats } from './parse';
import { dataUrlToBytes } from './pdf';
import type { IntervalDatum } from '../types';

type Metric = 'amps' | 'kwh';

interface SnapshotOptions {
  chartElement: HTMLDivElement;
  data: IntervalDatum[];
  metric: Metric;
}

export interface SnapshotResult {
  dataUrl: string;
  width: number;
  height: number;
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
  context.fillText('Demand profile', padding, padding + 10);

  context.font = '400 16px Inter, sans-serif';
  const metricLabel = options.metric === 'amps' ? 'Amps' : 'kWh';
  const summaryLine = stats
    ? `One-year peak ${stats.maxAmps.toFixed(0)} A · 95th percentile ${stats.percentile95.toFixed(0)} A · Viewing ${metricLabel}`
    : `Viewing ${metricLabel}`;
  context.fillText(summaryLine, padding, padding + 40);

  const chartTop = padding + 60;
  const chartHeight = 640;
  context.drawImage(chartImage, padding, chartTop, canvas.width - padding * 2, chartHeight);

  const metricsTop = chartTop + chartHeight + 36;
  context.font = '700 16px Inter, sans-serif';
  context.fillText('Highlights', padding, metricsTop);

  context.font = '400 15px Inter, sans-serif';
  const lineHeight = 26;
  const coverageLine = stats
    ? `Coverage: ${stats.start.toLocaleDateString()} — ${stats.end.toLocaleDateString()}`
    : 'Coverage: interval data required';
  const cadenceLine = stats ? `Cadence: ${stats.cadenceMinutes}-minute data` : 'Cadence: n/a';
  const qualityLine = `Data quality: ${options.data.length.toLocaleString()} intervals`;

  [coverageLine, cadenceLine, qualityLine].forEach((line, index) => {
    context.fillText(line, padding, metricsTop + 12 + lineHeight * (index + 1));
  });

  return { dataUrl: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height };
}

export function snapshotToBytes(snapshot: SnapshotResult): Uint8Array {
  return dataUrlToBytes(snapshot.dataUrl);
}
