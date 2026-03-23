"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/DateTimePicker";
import { HorizonSlider } from "@/components/HorizonSlider";

interface ControlPanelProps {
  startDate: Date;
  endDate: Date;
  horizonHours: number;
  isLoading: boolean;
  onStartChange: (d: Date) => void;
  onEndChange: (d: Date) => void;
  onHorizonChange: (h: number) => void;
  onLoadData: () => void;
}

const MIN_DATE = new Date("2025-01-01T00:00:00Z");

export function ControlPanel({
  startDate,
  endDate,
  horizonHours,
  isLoading,
  onStartChange,
  onEndChange,
  onHorizonChange,
  onLoadData,
}: ControlPanelProps) {
  const now = new Date();

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
      <DateTimePicker
        label="Start"
        value={startDate}
        onChange={onStartChange}
        minDate={MIN_DATE}
        maxDate={endDate}
      />
      <DateTimePicker
        label="End"
        value={endDate}
        onChange={onEndChange}
        minDate={startDate}
        maxDate={now}
      />
      <HorizonSlider value={horizonHours} onChange={onHorizonChange} />
      <Button onClick={onLoadData} disabled={isLoading} className="h-10">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading…
          </>
        ) : (
          "Load Data"
        )}
      </Button>
    </div>
  );
}
