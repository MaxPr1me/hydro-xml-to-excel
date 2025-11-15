const VOLTAGE_DEFAULT = 240;
export function convertToAmps(value, unit, voltage, intervalMinutes) {
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
export function toIntervalDatum(timestamp, value, unit, voltage, intervalMinutes) {
    return {
        timestamp,
        value,
        unit,
        amps: convertToAmps(value, unit, voltage || VOLTAGE_DEFAULT, intervalMinutes)
    };
}
