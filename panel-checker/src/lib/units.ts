import { IntervalDatum, IntervalUnit } from '../types';

const VOLTAGE_DEFAULT: 120 | 208 | 240 = 120;

export function convertToAmps(
  value: number,
  unit: IntervalUnit,
  voltage: number,
  intervalMinutes: number
): number {
  if (unit === 'Amps') {
    return value;
  }

  if (unit === 'kW') {
    return (value * 1000) / voltage;
  }

  // kWh per interval -> average kW in that window.
  const hours = intervalMinutes / 60;
  const averageKW = value / hours;
  return (averageKW * 1000) / voltage;
}

export function toIntervalDatum(
  timestamp: Date,
  value: number,
  unit: IntervalUnit,
  voltage: number,
  intervalMinutes: number
): IntervalDatum {
  return {
    timestamp,
    value,
    unit,
    amps: convertToAmps(value, unit, voltage || VOLTAGE_DEFAULT, intervalMinutes),
    voltage: voltage || VOLTAGE_DEFAULT,
    intervalMinutes
  };
}

export function convertToKwh(value: number, unit: IntervalUnit, voltage: number, intervalMinutes: number): number {
  if (unit === 'kWh') {
    return value;
  }

  if (unit === 'kW') {
    return value * (intervalMinutes / 60);
  }

  const kw = (value * (voltage || VOLTAGE_DEFAULT)) / 1000;
  return kw * (intervalMinutes / 60);
}
