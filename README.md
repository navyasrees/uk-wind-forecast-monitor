# UK Wind Power Forecast Monitor

A full-stack web app for monitoring UK national wind power generation forecasts — comparing actual vs. forecasted output from the [ELEXON BMRS API](https://developer.data.elexon.co.uk/).

## Features

- **Interactive dashboard**: Select start/end dates & times and a forecast horizon (0–48h)
- **Real data**: Fetches live actuals from FUELHH and forecasts from WINDFOR
- **Horizon-correct selection**: For each 30-min settlement period, picks the latest forecast published at least H hours in advance
- **Visual gaps**: Missing forecasts appear as gaps — never interpolated
- **Responsive**: Works on mobile (390px) and desktop

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router, TypeScript) |
| Styling | Tailwind CSS + shadcn/ui |
| Charting | Recharts |
| Date utils | date-fns |
| API | ELEXON BMRS (FUELHH + WINDFOR) |
| Deploy | Vercel |

## Directory Structure

```
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   └── api/
│       ├── actuals/route.ts      # GET /api/actuals?from=&to=
│       └── forecasts/route.ts    # GET /api/forecasts?from=&to=&horizon=
├── components/
│   ├── WindForecastDashboard.tsx # Main client component
│   ├── ControlPanel.tsx
│   ├── DateTimePicker.tsx
│   ├── HorizonSlider.tsx
│   ├── ForecastChart.tsx
│   ├── ChartLoadingSkeleton.tsx
│   └── ui/                       # shadcn/ui components
├── lib/
│   ├── types.ts                  # TypeScript interfaces
│   ├── elexon.ts                 # ELEXON API client (NDJSON streaming)
│   ├── forecast-selector.ts      # Horizon selection + chart merge
│   └── utils.ts
├── notebooks/
│   ├── data_fetcher.py           # Shared Python data utilities
│   ├── forecast_error_analysis.ipynb
│   └── wind_reliability_analysis.ipynb
└── vercel.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run build
npm start
```

### API Endpoints

```bash
# Actual wind generation
curl "http://localhost:3000/api/actuals?from=2025-01-05T00:00:00Z&to=2025-01-06T00:00:00Z"

# Forecasted wind generation at 4h horizon
curl "http://localhost:3000/api/forecasts?from=2025-01-05T00:00:00Z&to=2025-01-06T00:00:00Z&horizon=4"
```

Both return `{ data: [...], meta: { count, from, to } }`.

**Constraints**: `from >= 2025-01-01`, `from < to`, `to <= now()`, window ≤ 7 days.

## Notebooks

Requires Python 3.10+ with:
```bash
pip install pandas numpy matplotlib scipy requests jupyter
```

Run:
```bash
cd notebooks
jupyter notebook
```

- **`forecast_error_analysis.ipynb`**: MAE/RMSE vs horizon, time-of-day analysis, error distribution (Jan–Mar 2025)
- **`wind_reliability_analysis.ipynb`**: Load duration curve, reliability function, P10 reliable capacity recommendation

## Deployed URL

_Set after Vercel deployment — run `vercel --prod` to deploy_

## Algorithm: Horizon Selection

For each 30-min target slot `t`:
1. `cutoff = t − horizon_hours`
2. Find all WINDFOR records for slot `t` with `publishTime ≤ cutoff`
3. Pick the one with the **latest** publishTime
4. If none found → skip slot (gap in chart)

This ensures the forecast was genuinely available H hours before the delivery period.

## AI Tool Disclosure

This project was built with assistance from Claude (Anthropic) for architecture design, code generation, and analysis notebook structure. All code and ELEXON API integration were verified against the live API.
