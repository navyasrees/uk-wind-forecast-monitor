"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import { ChartDataPoint } from "@/lib/types";

interface ForecastChartProps {
  data: ChartDataPoint[];
}

function formatTime(timeMs: number) {
  return format(new Date(timeMs), "dd MMM HH:mm");
}

function formatMW(value: number) {
  return `${value.toLocaleString()} MW`;
}

interface TooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: number;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-sm">
      <p className="font-medium mb-1">{label ? formatTime(label) : ""}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name === "actual" ? "Actual" : "Forecast"}:{" "}
          {formatMW(entry.value)}
        </p>
      ))}
    </div>
  );
}

export function ForecastChart({ data }: ForecastChartProps) {
  if (data.length === 0) {
    return (
      <div className="w-full h-[300px] md:h-[400px] flex items-center justify-center text-muted-foreground">
        No data to display
      </div>
    );
  }

  return (
    <div className="w-full h-[300px] md:h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="timeMs"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(v) => format(new Date(v), "dd MMM HH:mm")}
            tick={{ fontSize: 11 }}
            tickCount={6}
            minTickGap={40}
          />
          <YAxis
            tickFormatter={(v) => `${v.toLocaleString()}`}
            tick={{ fontSize: 11 }}
            label={{
              value: "MW",
              angle: -90,
              position: "insideLeft",
              offset: 10,
              style: { fontSize: 11 },
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) =>
              value === "actual" ? "Actual Generation" : "Forecast Generation"
            }
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            name="actual"
          />
          <Line
            type="monotone"
            dataKey="forecast"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            name="forecast"
            strokeDasharray="5 3"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
