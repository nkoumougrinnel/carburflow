import { isFiniteNumber } from './stats.js';

/**
 * Aggregates multiple series into a single series by summing values at each index.
 */
export function aggregateSeries(series = []) {
  if (!series.length) return [];
  const maxLength = Math.max(...series.map((entry) => (entry?.data || []).length));
  return Array.from({ length: maxLength }, (_, index) => {
    let hasValue = false;
    const sum = series.reduce((acc, entry) => {
      const raw = entry?.data?.[index];
      if (typeof raw === 'number' && Number.isFinite(raw)) {
        hasValue = true;
        return acc + raw;
      }
      return acc;
    }, 0);
    return hasValue ? sum : null;
  });
}

/**
 * Aggregates multiple hour series.
 */
export function aggregateHoursSeries(entries = []) {
  if (!entries.length) return [];
  let maxLength = 0;
  entries.forEach((entry) => {
    ;(entry?.datasets || []).forEach((dataset) => {
      if (dataset?.data?.length > maxLength) maxLength = dataset.data.length;
    });
  });
  return Array.from({ length: maxLength }, (_, i) => {
    let hasValue = false;
    const sum = entries.reduce((acc, entry) => {
      const entrySum = (entry?.datasets || []).reduce((dSum, dataset) => {
        const raw = dataset?.data?.[i];
        if (typeof raw === 'number' && Number.isFinite(raw)) {
          hasValue = true;
          return dSum + raw;
        }
        return dSum;
      }, 0);
      return acc + entrySum;
    }, 0);
    return hasValue ? sum : null;
  });
}
