/** A single actual generation data point from FUELHH */
export interface ActualDataPoint {
  time: string;       // ISO 8601 UTC
  timeMs: number;     // epoch ms
  actualMW: number;
}

/** A single forecast data point from WINDFOR */
export interface ForecastDataPoint {
  time: string;       // ISO 8601 UTC  (startTime of the settlement period)
  timeMs: number;
  forecastMW: number;
  publishTime: string;  // when this forecast was published
  publishTimeMs: number;
}

/** Raw record from WINDFOR API */
export interface RawForecastRecord {
  startTime: string;
  publishTime: string;
  generation: number;
}

/** Raw record from FUELHH API */
export interface RawActualRecord {
  startTime: string;
  fuelType: string;
  generation: number;
}

/** Merged point for Recharts */
export interface ChartDataPoint {
  timeMs: number;
  time: string;
  actual?: number;
  forecast?: number;
}

/** API response shape */
export interface ActualsApiResponse {
  data: ActualDataPoint[];
  meta: { count: number; from: string; to: string };
}

export interface ForecastsApiResponse {
  data: ForecastDataPoint[];
  meta: { count: number; from: string; to: string; horizonHours: number };
}
