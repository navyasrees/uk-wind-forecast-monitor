"use client";

import { Slider } from "@/components/ui/slider";

interface HorizonSliderProps {
  value: number;
  onChange: (value: number) => void;
}

const MARKS = [0, 6, 12, 24, 36, 48];

export function HorizonSlider({ value, onChange }: HorizonSliderProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium">
        Forecast Horizon:{" "}
        <span className="text-primary font-semibold">{value}h</span>
      </label>
      <div className="px-1">
        <Slider
          min={0}
          max={48}
          step={1}
          value={[value]}
          onValueChange={([v]) => onChange(v)}
          className="w-full"
        />
        <div className="flex justify-between mt-1">
          {MARKS.map((m) => (
            <span key={m} className="text-xs text-muted-foreground">
              {m}h
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
