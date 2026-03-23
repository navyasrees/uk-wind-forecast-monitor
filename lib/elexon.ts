import dns from "dns";
import https from "https";
import axios from "axios";
import { RawActualRecord, RawForecastRecord, ActualDataPoint } from "./types";

// Force IPv4 DNS — data.elexon.co.uk has no IPv6 record; Node.js tries AAAA first by default
dns.setDefaultResultOrder("ipv4first");

const ELEXON_BASE = "https://data.elexon.co.uk/bmrs/api/v1";

// Custom agent that also forces IPv4 at the socket level
const httpsAgent = new https.Agent({ family: 4 });

/** Fetch ELEXON JSON endpoint using axios (avoids native fetch TLS issues) */
async function elexonGet<T>(path: string, params: Record<string, string>): Promise<T[]> {
  const response = await axios.get<T[] | { data: T[] }>(`${ELEXON_BASE}${path}`, {
    params: { ...params, format: "json" },
    timeout: 25_000,
    httpsAgent,
  });
  const body = response.data;
  return Array.isArray(body) ? body : (body as { data: T[] }).data ?? [];
}

/** ISO date string → "YYYY-MM-DD" */
function toDateStr(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * Fetch actual wind generation from FUELHH.
 * Uses settlementDateFrom/To (accepted by this endpoint).
 */
export async function fetchActuals(
  from: string,
  to: string
): Promise<ActualDataPoint[]> {
  const records = await elexonGet<RawActualRecord>("/datasets/FUELHH/stream", {
    settlementDateFrom: toDateStr(from),
    settlementDateTo: toDateStr(to),
    fuelType: "WIND",
  });

  const fromMs = new Date(from).getTime();
  const toMs = new Date(to).getTime();

  const results: ActualDataPoint[] = [];
  for (const item of records) {
    if (item.fuelType !== "WIND") continue;
    const timeMs = new Date(item.startTime).getTime();
    if (timeMs < fromMs || timeMs > toMs) continue;
    results.push({
      time: item.startTime,
      timeMs,
      actualMW: item.generation,
    });
  }

  results.sort((a, b) => a.timeMs - b.timeMs);
  return results;
}

/**
 * Fetch raw wind generation forecasts from WINDFOR.
 * Uses publishDateTimeFrom expanded by 48h to capture long-horizon forecasts.
 */
export async function fetchRawForecasts(
  from: string,
  to: string
): Promise<RawForecastRecord[]> {
  // Expand the window back 48h so forecasts for early target times are captured
  const expandedFrom = new Date(new Date(from).getTime() - 48 * 60 * 60 * 1000).toISOString();

  const records = await elexonGet<RawForecastRecord>("/datasets/WINDFOR/stream", {
    publishDateTimeFrom: expandedFrom,
    publishDateTimeTo: to,
  });

  // Filter to records whose startTime (target) falls in [from, to]
  const fromMs = new Date(from).getTime();
  const toMs = new Date(to).getTime();

  return records.filter((r) => {
    const tMs = new Date(r.startTime).getTime();
    return tMs >= fromMs && tMs <= toMs;
  });
}
