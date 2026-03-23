"""
Shared Python utilities for fetching ELEXON BMRS data.
Used by the analysis notebooks.
"""

import requests
import json
import pandas as pd
from datetime import datetime, timezone, timedelta
from typing import Optional

ELEXON_BASE = "https://data.elexon.co.uk/bmrs/api/v1"


def fetch_ndjson(url: str, params: dict) -> list[dict]:
    """
    Fetch a streaming NDJSON (or JSON array) endpoint and return a list of records.
    Handles both content-type: application/x-ndjson and application/json.
    """
    resp = requests.get(url, params=params, stream=True, timeout=120)
    resp.raise_for_status()

    ct = resp.headers.get("content-type", "")
    if "ndjson" in ct:
        records = []
        for line in resp.iter_lines():
            if line:
                records.append(json.loads(line))
        return records
    else:
        # Regular JSON array
        data = resp.json()
        if isinstance(data, list):
            return data
        return data.get("data", [])


def fetch_actuals(
    from_dt: datetime,
    to_dt: datetime,
) -> pd.DataFrame:
    """
    Fetch actual wind generation from FUELHH.

    Returns a DataFrame with columns:
        startTime (datetime, UTC), actualMW (float)
    """
    params = {
        "from": from_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "to": to_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "fuelType": "WIND",
        "format": "json",
    }
    records = fetch_ndjson(f"{ELEXON_BASE}/datasets/FUELHH/stream", params)

    rows = []
    for r in records:
        if r.get("fuelType") != "WIND":
            continue
        rows.append(
            {
                "startTime": pd.to_datetime(r["startTime"], utc=True),
                "actualMW": float(r["quantity"]),
            }
        )

    df = pd.DataFrame(rows)
    if not df.empty:
        df = df.sort_values("startTime").reset_index(drop=True)
    return df


def fetch_raw_forecasts(
    from_dt: datetime,
    to_dt: datetime,
    expand_hours: int = 48,
) -> pd.DataFrame:
    """
    Fetch raw wind generation forecasts from WINDFOR.

    The window is expanded by `expand_hours` before `from_dt` so that
    forecasts published well in advance are captured.

    Returns a DataFrame with columns:
        startTime (datetime, UTC)  — the target settlement period
        publishTime (datetime, UTC) — when this forecast was published
        forecastMW (float)
    """
    expanded_from = from_dt - timedelta(hours=expand_hours)
    params = {
        "from": expanded_from.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "to": to_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "format": "json",
    }
    records = fetch_ndjson(f"{ELEXON_BASE}/datasets/WINDFOR/stream", params)

    rows = []
    for r in records:
        rows.append(
            {
                "startTime": pd.to_datetime(r["startTime"], utc=True),
                "publishTime": pd.to_datetime(r["publishTime"], utc=True),
                "forecastMW": float(r["quantity"]),
            }
        )

    df = pd.DataFrame(rows)
    if not df.empty:
        df = df.sort_values(["startTime", "publishTime"]).reset_index(drop=True)
    return df


def select_forecasts_by_horizon(
    raw: pd.DataFrame,
    from_dt: datetime,
    to_dt: datetime,
    horizon_hours: float,
) -> pd.DataFrame:
    """
    For each 30-min target slot t in [from_dt, to_dt]:
        cutoff = t - horizon_hours
        Select the forecast published LATEST before or at cutoff.
        Skip slot if no eligible forecast exists.

    Returns DataFrame with columns:
        startTime, publishTime, forecastMW
    """
    if raw.empty:
        return pd.DataFrame(columns=["startTime", "publishTime", "forecastMW"])

    horizon = timedelta(hours=horizon_hours)
    slots = pd.date_range(from_dt, to_dt, freq="30min", tz="UTC")

    results = []
    for slot in slots:
        cutoff = slot - horizon
        candidates = raw[
            (raw["startTime"] == slot) & (raw["publishTime"] <= cutoff)
        ]
        if candidates.empty:
            continue
        best = candidates.loc[candidates["publishTime"].idxmax()]
        results.append(
            {
                "startTime": slot,
                "publishTime": best["publishTime"],
                "forecastMW": best["forecastMW"],
            }
        )

    result_df = pd.DataFrame(results)
    if not result_df.empty:
        result_df = result_df.sort_values("startTime").reset_index(drop=True)
    return result_df


def merge_actuals_forecasts(
    actuals: pd.DataFrame,
    forecasts: pd.DataFrame,
    from_dt: datetime,
    to_dt: datetime,
) -> pd.DataFrame:
    """
    Outer join actuals and forecasts on startTime (30-min slots).
    Returns DataFrame with columns: startTime, actualMW, forecastMW, error (actual - forecast)
    """
    slots = pd.DataFrame(
        {"startTime": pd.date_range(from_dt, to_dt, freq="30min", tz="UTC")}
    )

    merged = slots.merge(
        actuals[["startTime", "actualMW"]], on="startTime", how="left"
    ).merge(
        forecasts[["startTime", "forecastMW"]], on="startTime", how="left"
    )

    # Compute error only where both exist
    mask = merged["actualMW"].notna() & merged["forecastMW"].notna()
    merged["error"] = merged.loc[mask, "actualMW"] - merged.loc[mask, "forecastMW"]

    return merged
