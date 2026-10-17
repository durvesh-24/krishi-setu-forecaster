# KrishiSetu — Smart Farming Companion 🌾

KrishiSetu is a farmer-friendly web app (B.Tech major project) that brings four ML / data tools into one place:

| Feature | How it works |
| --- | --- |
| **Crop recommendation** | Random Forest model on soil N, P, K, pH and climate (temperature, humidity, rainfall). Shows the top 3 crops with confidence, NPK requirement and fertilizer. |
| **Leaf disease detection** | ResNet-50 (PyTorch) trained on 19 classes of chickpea, hibiscus, mango and jowar leaves. Shows confidence, other possibilities, treatment and product. Gemini identifies the plant name. |
| **Weather forecast** | Open-Meteo forecast for any Indian city/village (or the phone's GPS location) with a 7-day outlook and farming tips generated from the numbers. |
| **Mandi price forecasting** | One XGBoost model per commodity (Cotton, Wheat, Rice, Jowar, Sugarcane) using lag and calendar features. Shows the predicted modal price, a 7-day outlook and a chart of recent prices. |

Other features: login/sign-up (Supabase), **light & dark theme**, and the full UI in **English, हिन्दी and मराठी** (built-in translations, no Google Translate).

## Project structure

```
krishi-setu-forecaster/
├── backend/                     FastAPI server + ML models
│   ├── main.py                  API routes
│   ├── crop_recommend.py        Random Forest crop model
│   ├── leaf_disease_detect.py   ResNet-50 disease model (loaded on first use)
│   ├── leaf_detect.py           Gemini plant identification
│   ├── price_forecasting.py     XGBoost price models + history / outlook
│   ├── weather.py               Open-Meteo forecast + geocoding
│   ├── cleaned_combine_wsrjc.csv  Market price dataset used by the API
│   └── scripts/export_dataset.py  Cleans the CSV and builds the Excel workbook
├── dataset/
│   └── KrishiSetu_Dataset.xlsx  Every dataset in one workbook (see below)
└── src/                         React + TypeScript + Tailwind frontend
    ├── i18n/                    English / Hindi / Marathi translations
    ├── pages/                   Dashboard, Crop, Disease, Weather, Prices, Profile
    └── components/              Header, bottom navigation, theme & language switchers
```

## Dataset workbook

`dataset/KrishiSetu_Dataset.xlsx` contains every row and column (nothing hidden), with a frozen, filterable header on each sheet:

- **Market Prices** — all 157,268 price records (22 states, 300 districts, 1,032 mandis, Jan 2023 – Oct 2025) plus a real `Date` column
- **Summary** — records, markets and min / avg / max price per state and commodity
- **Crop Nutrients** — NPK range and preferred fertilizer for all 22 crops
- **Leaf Diseases** — all 19 disease classes with description, treatment, product and watering
- **Data Dictionary** — what every column and model feature means
- **Data Quality** — cleaning notes (457 exact duplicate rows removed) and 29 suspicious price rows to review

To rebuild it after editing the CSV:

```bash
python backend/scripts/export_dataset.py
```

## Running locally

### 1. Backend (Python 3.11)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --port 8000
```

API docs: http://localhost:8000/docs

### 2. Frontend

Create `.env` in the project root:

```
VITE_BACKEND=http://localhost:8000
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
GEMINI_API_KEY=...
```

```bash
npm install
npm run dev
```

Open http://localhost:8080.

## API

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/predict` | Crop recommendation → `predicted_crop`, `top_crops` |
| POST | `/predict-disease` | Leaf image → disease class, confidence, alternatives |
| POST | `/predict-leaf` | Leaf image → plant name (Gemini) |
| POST | `/weather` | `{ city }` or `{ latitude, longitude }` → current + 8-day forecast |
| GET | `/price-options` | States → districts → commodities the price model can forecast |
| POST | `/predict-price` | `{ state, district, commodity, date }` → price, 7-day outlook, history |

## Tech stack

React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query, Recharts, Framer Motion, next-themes · FastAPI, scikit-learn, XGBoost, PyTorch, pandas · Supabase · Open-Meteo · Google Gemini
