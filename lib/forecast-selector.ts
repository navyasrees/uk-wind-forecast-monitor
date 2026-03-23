import { RawForecastRecord, ForecastDataPoint, ChartDataPoint, ActualDataPoint } from "./types";

const HALF_HOUR_MS = 30 * 60 * 1000;

/**
 * For each 30-min target slot t in [windowStart, windowEnd]:
 *   cutoff = t - horizonMs
 *   pick the forecast published LATEST before cutoff
 *   skip if none found (creates a visual gap)
 */
export function selectForecastsByHorizon(
  rawRecords: RawForecastRecord[],
  windowStart: string,
  windowEnd: string,
  horizonHours: number
): ForecastDataPoint[] {
  const horizonMs = horizonHours * 60 * 60 * 1000;
  const startMs = new Date(windowStart).getTime();
  const endMs = new Date(windowEnd).getTime();

  // Group raw records by target startTime (ms)
  const byTargetTime = new Map<number, RawForecastRecord[]>();
  for (const rec of rawRecords) {
    const tMs = new Date(rec.startTime).getTime();
    if (!byTargetTime.has(tMs)) byTargetTime.set(tMs, []);
    byTargetTime.get(tMs)!.push(rec);
  }

  const results: ForecastDataPoint[] = [];

  // Iterate each 30-min slot in the window
  for (let t = startMs; t <= endMs; t += HALF_HOUR_MS) {
    const cutoff = t - horizonMs;
    // WINDFOR is hourly: a :30 slot falls within the :00 record's coverage window.
    // Check the exact slot first, then fall back to the preceding :00 record.
    const candidates = [
      ...(byTargetTime.get(t) ?? []),
      ...(byTargetTime.get(t - HALF_HOUR_MS) ?? []),
    ];
    if (candidates.length === 0) continue;

    // Filter to those published at or before the cutoff
    const eligible = candidates.filter(
      (r) => new Date(r.publishTime).getTime() <= cutoff
    );
    if (eligible.length === 0) continue;

    // Pick the latest publish time
    const best = eligible.reduce((prev, curr) =>
      new Date(curr.publishTime).getTime() > new Date(prev.publishTime).getTime()
        ? curr
        : prev
    );

    results.push({
      time: best.startTime,
      timeMs: t,
      forecastMW: best.generation,
      publishTime: best.publishTime,
      publishTimeMs: new Date(best.publishTime).getTime(),
    });
  }

  results.sort((a, b) => a.timeMs - b.timeMs);
  return results;
}

/**
 * Outer join actuals and forecasts on 30-min time slots.
 * Missing values produce undefined (visual gaps in Recharts with connectNulls=false).
 */
export function mergeForChart(
  actuals: ActualDataPoint[],
  forecasts: ForecastDataPoint[],
  windowStart: string,
  windowEnd: string
): ChartDataPoint[] {
  const startMs = new Date(windowStart).getTime();
  const endMs = new Date(windowEnd).getTime();

  const actualsMap = new Map<number, number>();
  for (const a of actuals) actualsMap.set(a.timeMs, a.actualMW);

  const forecastsMap = new Map<number, number>();
  for (const f of forecasts) forecastsMap.set(f.timeMs, f.forecastMW);

  const result: ChartDataPoint[] = [];

  for (let t = startMs; t <= endMs; t += HALF_HOUR_MS) {
    const isoTime = new Date(t).toISOString();
    result.push({
      timeMs: t,
      time: isoTime,
      actual: actualsMap.get(t),
      forecast: forecastsMap.get(t),
    });
  }

  return result;
}
