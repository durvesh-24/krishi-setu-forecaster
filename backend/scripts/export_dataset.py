"""
Export every dataset used by KrishiSetu into one Excel workbook
(dataset/KrishiSetu_Dataset.xlsx). Every row and column is visible, each
sheet has a frozen, filterable header.

  Market Prices     all Agmarknet mandi price rows + rainfall for that district & day
  Summary           records / average price per state & commodity
  District Weather  location of every district and its rainfall totals
  Model Accuracy    validation results of the per-commodity price models
  Crop Nutrients    NPK ranges + fertilizer per crop
  Leaf Diseases     disease classes with description & treatment
  Data Dictionary   meaning of every column
  Data Quality      cleaning notes + rows the model ignores as data errors

Run from the project root:
    python backend/scripts/export_dataset.py
"""

import json
import sys
from pathlib import Path

import pandas as pd
from openpyxl import Workbook
from openpyxl.cell import WriteOnlyCell
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))
import price_features as pf  # noqa: E402

CSV_PATH = BACKEND / "cleaned_combine_wsrjc.csv"
WEATHER_PATH = BACKEND / "district_weather.csv"
COORDS_PATH = BACKEND / "district_coords.csv"
METRICS_PATH = BACKEND / "price_model_metrics.json"
NPK_PATH = ROOT / "src" / "data" / "commodity_npk_fertilizer_data.json"
DISEASE_PATH = ROOT / "src" / "data" / "plant_disease_classes.json"
OUT_DIR = ROOT / "dataset"
OUT_PATH = OUT_DIR / "KrishiSetu_Dataset.xlsx"

HEADER_FONT = Font(bold=True, color="FFFFFF")
HEADER_FILL = PatternFill("solid", fgColor="1F7A4D")
PRICE_COL = pf.PRICE_COL
MSP_COL = "MSP (Rs./Quintal)"
MAX_ERROR_ROWS = 20000


def remove_duplicate_lines(path):
    """Drop exact duplicate rows in place, keeping the file's original formatting."""
    lines = path.read_bytes().split(b"\n")
    seen, kept = set(), []
    for line in lines:
        key = line.rstrip(b"\r")
        if key and key in seen:
            continue
        seen.add(key)
        kept.append(line)
    path.write_bytes(b"\n".join(kept))
    return len(lines) - len(kept)


def write_sheet(wb, title, df, widths=None, wrap_cols=(), date_cols=(), filter_rows=True, extra=None):
    """Write a DataFrame (write-only mode, fast for big sheets)."""
    ws = wb.create_sheet(title)
    for idx, col in enumerate(df.columns, start=1):
        if widths and col in widths:
            width = widths[col]
        else:
            sample = df[col].astype(str).head(2000)
            width = min(max(len(str(col)), int(sample.str.len().max() or 0)) + 3, 60)
        ws.column_dimensions[get_column_letter(idx)].width = width
    ws.freeze_panes = "A2"
    if filter_rows:
        ws.auto_filter.ref = f"A1:{get_column_letter(len(df.columns))}{len(df) + 1}"

    header = []
    for col in df.columns:
        c = WriteOnlyCell(ws, value=col)
        c.font, c.fill = HEADER_FONT, HEADER_FILL
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        header.append(c)
    ws.append(header)

    wrap = [df.columns.get_loc(c) for c in wrap_cols if c in df]
    dates = [df.columns.get_loc(c) for c in date_cols if c in df]
    for row in df.itertuples(index=False):
        values = [None if (isinstance(v, float) and pd.isna(v)) else v for v in row]
        if wrap or dates:
            for i in wrap:
                c = WriteOnlyCell(ws, value=values[i])
                c.alignment = Alignment(wrap_text=True, vertical="top")
                values[i] = c
            for i in dates:
                c = WriteOnlyCell(ws, value=values[i])
                c.number_format = "dd-mmm-yyyy"
                values[i] = c
        ws.append(values)

    for block in extra or []:
        ws.append([])
        title_cell = WriteOnlyCell(ws, value=block["title"])
        title_cell.font = Font(bold=True)
        ws.append([title_cell])
        head = []
        for col in block["df"].columns:
            c = WriteOnlyCell(ws, value=col)
            c.font, c.fill = HEADER_FONT, HEADER_FILL
            head.append(c)
        ws.append(head)
        for row in block["df"].itertuples(index=False):
            ws.append(list(row))
    return ws


def main():
    removed_duplicates = remove_duplicate_lines(CSV_PATH)
    df = pd.read_csv(CSV_PATH)
    df["date"] = pd.to_datetime(df[["year", "month", "day"]])
    original_rows = len(df) + removed_duplicates

    # Rainfall for the district on that day + the week before it
    weather = pd.read_csv(WEATHER_PATH, parse_dates=["date"]) if WEATHER_PATH.exists() else None
    if weather is not None:
        wf = pf.weather_features(weather)[["State Name", "District Name", "date", "rain_1d", "rain_7d", "tmax_1d"]]
        df = df.merge(wf, on=["State Name", "District Name", "date"], how="left")
        df = df.rename(columns={"rain_1d": "Rain (mm)", "rain_7d": "Rain last 7 days (mm)", "tmax_1d": "Max Temp (°C)"})
        for c in ("Rain (mm)", "Rain last 7 days (mm)", "Max Temp (°C)"):
            df[c] = df[c].round(1)

    cleaned = pf.clean_prices(df)
    errors = df.loc[~df.index.isin(cleaned.index)]

    df["Date"] = df["date"].dt.date
    df = df.drop(columns="date").sort_values(
        ["State Name", "District Name", "Commodity", "Date", "Market Name"]).reset_index(drop=True)

    summary = (
        df.groupby(["State Name", "Commodity"])
        .agg(
            Districts=("District Name", "nunique"),
            Markets=("Market Name", "nunique"),
            Records=(PRICE_COL, "size"),
            **{
                "Avg Modal Price": (PRICE_COL, "mean"),
                "Min Modal Price": (PRICE_COL, "min"),
                "Max Modal Price": (PRICE_COL, "max"),
                "First Date": ("Date", "min"),
                "Last Date": ("Date", "max"),
            },
        )
        .reset_index()
    )
    summary["Avg Modal Price"] = summary["Avg Modal Price"].round(2)

    district_weather = None
    if weather is not None and COORDS_PATH.exists():
        coords = pd.read_csv(COORDS_PATH)
        w = weather.assign(year=weather["date"].dt.year)
        yearly = w.pivot_table(index=["State Name", "District Name"], columns="year",
                               values="rain_mm", aggfunc="sum").round(0)
        yearly.columns = [f"Rain {y} (mm)" for y in yearly.columns]
        last30 = (w[w["date"] > w["date"].max() - pd.Timedelta(days=30)]
                  .groupby(["State Name", "District Name"])["rain_mm"].sum().round(1)
                  .rename("Rain last 30 days (mm)"))
        district_weather = (coords.rename(columns={"latitude": "Latitude", "longitude": "Longitude",
                                                   "source": "Located by"})
                            .merge(yearly.reset_index(), on=["State Name", "District Name"], how="left")
                            .merge(last30.reset_index(), on=["State Name", "District Name"], how="left")
                            .sort_values(["State Name", "District Name"]))

    accuracy = None
    if METRICS_PATH.exists():
        m = json.loads(METRICS_PATH.read_text(encoding="utf-8"))
        accuracy = pd.DataFrame([
            {
                "Commodity": c,
                "Districts": v.get("districts"),
                "Days of prices": v.get("days_of_prices"),
                "Validation days": v.get("validation_days"),
                "Model error MAE (Rs.)": v.get("mae"),
                "Model error MAPE (%)": v.get("mape_percent"),
                "R²": v.get("r2"),
                "Baseline 'same as last price' MAE (Rs.)": v.get("baseline_mae"),
                "Uses rain": "Yes" if v.get("uses_rain") else "No",
                "MAE without rain (Rs.)": v.get("mae_without_rain"),
                "MAE with rain (Rs.)": v.get("mae_with_rain"),
                "Heavy-rain days tested": v.get("heavy_rain_days"),
                "Heavy-rain-day MAE without rain (Rs.)": v.get("heavy_rain_mae_without_rain"),
                "Heavy-rain-day MAE with rain (Rs.)": v.get("heavy_rain_mae_with_rain"),
            }
            for c, v in m.get("commodities", {}).items()
        ])

    npk = pd.DataFrame([
        {
            "Crop": crop,
            "Nitrogen N (kg/ha)": info["N_range_kg_per_ha"],
            "Phosphorus P (kg/ha)": info["P_range_kg_per_ha"],
            "Potassium K (kg/ha)": info["K_range_kg_per_ha"],
            "Preferred Fertilizer": info["preferred_fertilizer"],
        }
        for crop, info in json.loads(NPK_PATH.read_text(encoding="utf-8")).items()
    ])

    diseases = pd.DataFrame([
        {
            "Class": d["disease_name"].strip(),
            "Plant": d["disease_name"].strip().split("_")[0],
            "Description": d.get("description", ""),
            "Treatment": d.get("treatement", ""),
            "Fertilizer / Fungicide": d.get("fertilizerName", ""),
            "Watering": d.get("waterLevel") or "",
        }
        for d in json.loads(DISEASE_PATH.read_text(encoding="utf-8"))
    ])

    dictionary = pd.DataFrame(
        [
            ("Market Prices", "State Name", "Indian state where the mandi (market) is located"),
            ("Market Prices", "District Name", "District of the mandi (Agmarknet renames mapped to the old names)"),
            ("Market Prices", "Market Name", "Name of the APMC mandi"),
            ("Market Prices", "Commodity", "Crop traded: Cotton, Wheat, Rice, Jowar, Sugarcane"),
            ("Market Prices", MSP_COL, "Minimum price of the day in that mandi (Agmarknet 'Min Price', Rs. per quintal)"),
            ("Market Prices", PRICE_COL, "Most common trading price of the day (Rs. per quintal) - the value the model forecasts"),
            ("Market Prices", "day / month / year", "Date of the price record, split into parts"),
            ("Market Prices", "Rain (mm)", "Rainfall in the district on that day (NASA POWER / Open-Meteo)"),
            ("Market Prices", "Rain last 7 days (mm)", "Total rainfall in the district over that day and the 6 days before"),
            ("Market Prices", "Max Temp (°C)", "Maximum temperature in the district on that day"),
            ("Market Prices", "Date", "Same date as one Excel date column"),
            ("Model features", "lag_1 / lag_2 / lag_3 / lag_7", "District price 1, 2, 3 and 7 trading days before"),
            ("Model features", "rolling_7 / rolling_30 / std_7", "Average of the last 7 / 30 days and how much the last 7 varied"),
            ("Model features", "gap_days", "Days since the last recorded price"),
            ("Model features", "rain_1d / rain_3d / rain_7d / rain_30d", "Rain on the day and summed over 3, 7, 30 days"),
            ("Model features", "tmax_1d", "Maximum temperature on the day"),
            ("Model features", "day_of_week / month / day_of_year", "Calendar (season) of the prediction date"),
            ("Model features", "State_enc / District_enc", "Label-encoded state and district"),
            ("Model", "Target", "Change from the last price, log(price / lag_1); one XGBoost model per commodity"),
        ],
        columns=["Sheet / Group", "Column", "Meaning"],
    )

    dates = pd.to_datetime(df["Date"])
    quality = pd.DataFrame(
        [
            ("Rows in source CSV", original_rows),
            ("Exact duplicate rows removed", removed_duplicates),
            ("Rows kept", len(df)),
            ("Date range", f"{dates.min().date()} to {dates.max().date()}"),
            ("States", df["State Name"].nunique()),
            ("Districts", df["District Name"].nunique()),
            ("Markets", df["Market Name"].nunique()),
            ("Rows with MSP = 0 (kept, not used by the model)", int((df[MSP_COL] == 0).sum())),
            ("Rows ignored by the model as data errors (listed below)", len(errors)),
            ("Rows with rainfall attached", int(df["Rain (mm)"].notna().sum()) if "Rain (mm)" in df else 0),
        ],
        columns=["Check", "Value"],
    )
    error_rows = errors[["State Name", "District Name", "Market Name", "Commodity", PRICE_COL]].assign(
        Date=errors["date"].dt.date).head(MAX_ERROR_ROWS)

    OUT_DIR.mkdir(exist_ok=True)
    wb = Workbook(write_only=True)

    print(f"Writing {len(df)} price rows...", flush=True)
    write_sheet(wb, "Market Prices", df, widths={"Date": 13, "day": 7, "month": 8, "year": 8}, date_cols=("Date",))
    write_sheet(wb, "Summary", summary)
    if district_weather is not None:
        write_sheet(wb, "District Weather", district_weather)
    if accuracy is not None:
        write_sheet(wb, "Model Accuracy", accuracy, widths={c: 18 for c in accuracy.columns})
    write_sheet(wb, "Crop Nutrients", npk)
    write_sheet(
        wb, "Leaf Diseases", diseases,
        widths={"Class": 34, "Plant": 16, "Description": 60, "Treatment": 60, "Fertilizer / Fungicide": 32, "Watering": 50},
        wrap_cols=("Description", "Treatment", "Watering"),
    )
    write_sheet(wb, "Data Dictionary", dictionary, widths={"Sheet / Group": 18, "Column": 36, "Meaning": 90})
    write_sheet(
        wb, "Data Quality", quality, widths={"Check": 60, "Value": 28}, filter_rows=False,
        extra=[{"title": f"Rows the model ignores as data errors (first {MAX_ERROR_ROWS})", "df": error_rows}],
    )

    wb.save(OUT_PATH)
    print(f"Removed {removed_duplicates} duplicate rows, kept {len(df)}")
    print(f"Workbook written to {OUT_PATH}")


if __name__ == "__main__":
    main()
