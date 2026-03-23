"use client";

import { useState, useCallback } from "react";
import { subDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ControlPanel } from "@/components/ControlPanel";
import { ForecastChart } from "@/components/ForecastChart";
import { ChartLoadingSkeleton } from "@/components/ChartLoadingSkeleton";
import { mergeForChart } from "@/lib/forecast-selector";
import type {
  ChartDataPoint,
  ActualsApiResponse,
  ForecastsApiResponse,
} from "@/lib/types";

interface Stats {
  actualCount: number;
  forecastCount: number;
}

/** Round a Date down to the nearest 30-minute settlement period boundary */
function snapToHalfHour(d: Date): Date {
  const snapped = new Date(d);
  snapped.setMinutes(d.getUTCMinutes() < 30 ? 0 : 30, 0, 0);
  return snapped;
}

/** Return a Date snapped to the start of the current hour in UTC */
function nowSnapped(): Date {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  return d;
}

export function WindForecastDashboard() {
  const [startDate, setStartDate] = useState<Date>(() => subDays(nowSnapped(), 2));
  const [endDate, setEndDate] = useState<Date>(() => subDays(nowSnapped(), 1));
  const [horizonHours, setHorizonHours] = useState<number>(4);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  const handleLoadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // Snap to 30-min boundaries so slots align with FUELHH settlement periods
    const from = snapToHalfHour(startDate).toISOString();
    const to = snapToHalfHour(endDate).toISOString();

    try {
      const [actualsRes, forecastsRes] = await Promise.all([
        fetch(
          `/api/actuals?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
        ),
        fetch(
          `/api/forecasts?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&horizon=${horizonHours}`
        ),
      ]);

      if (!actualsRes.ok) {
        const body = await actualsRes.json();
        throw new Error(`Actuals: ${body.error ?? actualsRes.statusText}`);
      }
      if (!forecastsRes.ok) {
        const body = await forecastsRes.json();
        throw new Error(`Forecasts: ${body.error ?? forecastsRes.statusText}`);
      }

      const [actualsData, forecastsData]: [
        ActualsApiResponse,
        ForecastsApiResponse
      ] = await Promise.all([actualsRes.json(), forecastsRes.json()]);

      const merged = mergeForChart(
        actualsData.data,
        forecastsData.data,
        from,
        to
      );

      setChartData(merged);
      setStats({
        actualCount: actualsData.meta.count,
        forecastCount: forecastsData.meta.count,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setChartData([]);
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, horizonHours]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            UK Wind Power Forecast Monitor
          </h1>
          <p className="text-muted-foreground mt-1">
            Compare actual vs. forecasted wind generation from ELEXON BMRS
          </p>
        </div>

        {/* Controls */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Query Parameters</CardTitle>
          </CardHeader>
          <CardContent>
            <ControlPanel
              startDate={startDate}
              endDate={endDate}
              horizonHours={horizonHours}
              isLoading={isLoading}
              onStartChange={setStartDate}
              onEndChange={setEndDate}
              onHorizonChange={setHorizonHours}
              onLoadData={handleLoadData}
            />
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Chart */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <CardTitle className="text-base">
                Wind Generation — Actual vs Forecast (horizon: {horizonHours}h)
              </CardTitle>
              {stats && !isLoading && (
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>
                    <span className="text-blue-500 font-semibold">
                      {stats.actualCount}
                    </span>{" "}
                    actual points
                  </span>
                  <span>
                    <span className="text-green-500 font-semibold">
                      {stats.forecastCount}
                    </span>{" "}
                    forecast points
                  </span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pl-0 pr-4">
            {isLoading ? (
              <ChartLoadingSkeleton />
            ) : chartData.length > 0 ? (
              <ForecastChart data={chartData} />
            ) : (
              <div className="w-full h-[300px] md:h-[400px] flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <p className="text-lg">No data loaded yet</p>
                <p className="text-sm">
                  Set your parameters above and click &quot;Load Data&quot;
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Legend note */}
        {chartData.length > 0 && !isLoading && (
          <p className="text-xs text-muted-foreground text-center">
            Gaps in the forecast line indicate settlement periods where no
            forecast was published at least {horizonHours}h in advance.
          </p>
        )}
      </div>
    </div>
  );
}
