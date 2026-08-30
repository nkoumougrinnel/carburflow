/**
 * Utility functions for calculating statistics over a window of values.
 */

export const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);

/**
 * Calculates statistics for a given window of values.
 * @param {Array} values - The series of values.
 * @param {number} start - Start index.
 * @param {number} end - End index.
 * @param {Object} options - Options (e.g., ignoreZeros).
 */
export function windowStats(values = [], start, end, options = {}) {
  const ignoreZeros = options.ignoreZeros ?? false;
  const series = values || [];
  
  const finiteOf = (arr) => arr.filter(isFiniteNumber);
  const meaningfulOf = (arr) => {
    const finite = finiteOf(arr);
    return ignoreZeros ? finite.filter((value) => value > 0) : finite;
  };

  const window = series.slice(start, end + 1);
  const meaningfulWindow = meaningfulOf(window);
  const total = meaningfulWindow.reduce((sum, value) => sum + value, 0);
  const mean = meaningfulWindow.length ? total / meaningfulWindow.length : 0;

  const prevWindowLength = end - start + 1;
  const prevStart = start - prevWindowLength;
  const prevEnd = start - 1;
  const prevWindow = prevStart >= 0 ? series.slice(prevStart, prevEnd + 1) : [];
  const meaningfulPrevWindow = meaningfulOf(prevWindow);
  const prevTotal = meaningfulPrevWindow.reduce((sum, value) => sum + value, 0);
  const prevMean = meaningfulPrevWindow.length ? prevTotal / meaningfulPrevWindow.length : 0;

  const meaningfulValues = meaningfulOf(series);
  const allTimeMean = meaningfulValues.length ? meaningfulValues.reduce((sum, value) => sum + value, 0) / meaningfulValues.length : 0;
  const variance = meaningfulValues.length
    ? meaningfulValues.reduce((sum, value) => sum + (value - allTimeMean) ** 2, 0) / meaningfulValues.length
    : 0;
  const allTimeStddev = Math.sqrt(variance);

  const variationPct = prevTotal === 0 ? null : ((total - prevTotal) / prevTotal) * 100;
  const meanVariationPct = prevMean === 0 ? null : ((mean - prevMean) / prevMean) * 100;

  let latest = null;
  for (let i = window.length - 1; i >= 0; i -= 1) {
    if (isFiniteNumber(window[i])) {
      latest = window[i];
      break;
    }
  }

  return {
    total: Number(total.toFixed(1)),
    mean: Number(mean.toFixed(1)),
    latest: latest == null ? 0 : Number(latest.toFixed(1)),
    previous_total: meaningfulPrevWindow.length ? Number(prevTotal.toFixed(1)) : null,
    previous_mean: meaningfulPrevWindow.length ? Number(prevMean.toFixed(1)) : null,
    variation_pct: variationPct === null ? null : Number(variationPct.toFixed(1)),
    mean_variation_pct: meanVariationPct === null ? null : Number(meanVariationPct.toFixed(1)),
    all_time_mean: Number(allTimeMean.toFixed(1)),
    all_time_stddev: Number(allTimeStddev.toFixed(1)),
    has_previous_period: meaningfulPrevWindow.length > 0,
  };
}

/**
 * Calculates derived metrics for a series of values.
 */
export function buildDerivedMetric(values = []) {
  const normalizedValues = (values || []).filter(isFiniteNumber);
  if (!normalizedValues.length) {
    return {
      total: 0,
      mean: 0,
      all_time_mean: 0,
      all_time_stddev: 0,
      variation_pct: null,
      mean_variation_pct: null,
      has_previous_period: false,
    };
  }

  const total = normalizedValues.reduce((sum, value) => sum + value, 0);
  const mean = total / normalizedValues.length;
  const firstValue = normalizedValues[0];
  const variationPct = firstValue === 0 ? null : ((normalizedValues[normalizedValues.length - 1] - firstValue) / firstValue) * 100;
  const meanVariationPct = firstValue === 0 ? null : ((mean - firstValue) / firstValue) * 100;
  const variance = normalizedValues.reduce((sum, value) => sum + (value - mean) ** 2, 0) / normalizedValues.length;

  return {
    total: Number(total.toFixed(1)),
    mean: Number(mean.toFixed(1)),
    all_time_mean: Number(mean.toFixed(1)),
    all_time_stddev: Number(Math.sqrt(variance).toFixed(1)),
    variation_pct: variationPct === null ? null : Number(variationPct.toFixed(1)),
    mean_variation_pct: meanVariationPct === null ? null : Number(meanVariationPct.toFixed(1)),
    has_previous_period: normalizedValues.length > 1,
  };
}

/**
 * Calculates statistics for a period series.
 */
export function buildPeriodSeriesStats(values = [], options = {}) {
  const series = values || [];
  if (!series.length) {
    return { weekN: null, weekN1: null, total: null, mean: null };
  }
  const finite = series.filter(isFiniteNumber);
  const excludeZeroValues = options.excludeZeroValues === true;
  const meaningful = excludeZeroValues ? finite.filter((value) => value > 0) : finite;
  const total = finite.reduce((sum, value) => sum + value, 0);
  
  // Find last finite value (week N)
  let weekN = null;
  for (let i = series.length - 1; i >= 0; i -= 1) {
    if (isFiniteNumber(series[i])) {
      weekN = series[i];
      break;
    }
  }
  
  // Find second to last finite value (week N-1)
  let weekN1 = null;
  if (series.length > 1) {
    let foundOne = false;
    for (let i = series.length - 1; i >= 0; i -= 1) {
      if (isFiniteNumber(series[i])) {
        if (!foundOne) {
          foundOne = true;
          continue;
        }
        weekN1 = series[i];
        break;
      }
    }
  }
  
  return {
    weekN,
    weekN1,
    total: finite.length ? total : null,
    mean: meaningful.length ? total / meaningful.length : null,
  };
}

/**
 * Builds an hourly rate series from hours and consumption.
 */
export function buildHourlyRateSeries(hours = [], consumption = []) {
  const len = Math.max(hours.length, consumption.length);
  const kinds = [];
  const raw = [];

  for (let index = 0; index < len; index += 1) {
    const hoursValue = hours[index];
    const consumptionValue = consumption[index];
    if (!isFiniteNumber(hoursValue) || !isFiniteNumber(consumptionValue)) {
      kinds.push('missing');
      raw.push(null);
      continue;
    }
    if (hoursValue > 0 && consumptionValue === 0) {
      kinds.push('zero');
      raw.push(0);
      continue;
    }
    if (hoursValue === 0 && consumptionValue > 0) {
      kinds.push('infinite');
      raw.push(Infinity);
      continue;
    }
    if (hoursValue > 0) {
      kinds.push('normal');
      raw.push(Number((consumptionValue / hoursValue).toFixed(2)));
      continue;
    }
    kinds.push('zero');
    raw.push(0);
  }

  const finitePositive = raw.filter((value) => isFiniteNumber(value) && value > 0);
  const finiteAll = raw.filter((value) => isFiniteNumber(value));
  const hasInfinite = raw.some((value) => value === Infinity);
  const baseMax = finitePositive.length
    ? Math.max(...finitePositive)
    : (finiteAll.length ? Math.max(...finiteAll, 1) : 1);
  const infinityDisplay = Number((Math.max(baseMax * 1.35, 1)).toFixed(2));
  const suggestedMax = hasInfinite
    ? infinityDisplay
    : (finiteAll.length ? Math.max(...finiteAll, 0) * 1.1 || 1 : 1);

  const data = raw.map((value) => (value === Infinity ? infinityDisplay : value));

  return {
    data,
    kinds,
    infinityDisplay,
    suggestedMax,
    hasZero: kinds.includes('zero'),
    hasInfinite,
  };
}

/**
 * Calculates statistics for hourly consumption.
 */
export function buildHourlyConsumptionStats(hours = [], consumption = []) {
  const series = buildHourlyRateSeries(hours, consumption);
  const rates = series.data
    .map((value, index) => {
      const kind = series.kinds[index];
      if (kind === 'normal' && isFiniteNumber(value) && value > 0) return value;
      return null;
    })
    .filter(isFiniteNumber);

  if (!rates.length) {
    return {
      mean: null,
      max: null,
      min: null,
      stddev: null,
      noData: true,
      zeroCount: series.kinds.filter((k) => k === 'zero').length,
      infiniteCount: series.kinds.filter((k) => k === 'infinite').length,
    };
  }

  const mean = rates.reduce((sum, value) => sum + value, 0) / rates.length;
  const variance = rates.reduce((sum, value) => sum + (value - mean) ** 2, 0) / rates.length;

  return {
    mean,
    max: Math.max(...rates),
    min: Math.min(...rates),
    stddev: Math.sqrt(variance),
    noData: false,
    zeroCount: series.kinds.filter((k) => k === 'zero').length,
    infiniteCount: series.kinds.filter((k) => k === 'infinite').length,
  };
}
