# KrishiSetu — Smart Farming Companion 🌾

KrishiSetu is a farmer-friendly web app (B.Tech major project) that brings four ML / data tools into one place:

| Feature | How it works |
| --- | --- |
| **Crop recommendation** | Random Forest model on soil N, P, K, pH and climate (temperature, humidity, rainfall). Shows the top 3 crops with confidence, NPK requirement and fertilizer. |
| **Leaf disease detection** | ResNet-50 (PyTorch) trained on 19 classes of chickpea, hibiscus, mango and jowar leaves. Shows confidence, other possibilities, treatment and product. Gemini identifies the plant name. |
| **Weather forecast** | Open-Meteo forecast for any Indian city/village (or the phone's GPS location) with a 7-day outlook and farming tips generated from the numbers. |
| **Mandi price forecasting** | A separate XGBoost model per commodity (Cotton, Wheat, Rice, Jowar, Sugarcane) trained on 556,040 Agmarknet price rows (Jan 2023 – today) with district rainfall. Shows the predicted modal price, rain for that day, heavy-rain alerts, a 7-day outlook and a chart of recent prices. Updates itself daily from Agmarknet. |

Other features: login/sign-up (Supabase), **light & dark theme**, and the full UI in **English, हिन्दी and मराठी** (built-in translations, no Google Translate).

## Project structure

```
krishi-setu-forecaster/
├── backend/                     FastAPI server + ML models
│   ├── main.py                  API routes
│   ├── crop_recommend.py        Random Forest crop model
│   ├── leaf_disease_detect.py   ResNet-50 disease model (loaded on first use)
│   ├── leaf_detect.py           Gemini plant identification
│   ├── price_forecasting.py     Price prediction: outlook, history, rain
│   ├── price_features.py        Features shared by training and prediction
│   ├── train_price_model.py     Trains one model per commodity (tests with / without rain)
│   ├── agmarknet_sync.py        Downloads new mandi prices from Agmarknet
│   ├── weather_history.py       District locations + daily rainfall (NASA POWER / Open-Meteo)
│   ├── update_prices.py         Prices + rain + retrain in one step (also run daily by the API)
│   ├── weather.py               Open-Meteo forecast + geocoding
│   ├── cleaned_combine_wsrjc.csv  Market price dataset used by the API
│   ├── district_weather.csv     Daily rain / max temperature per district
│   └── scripts/export_dataset.py  Builds the Excel workbook
├── dataset/
│   └── KrishiSetu_Dataset.xlsx  Every dataset in one workbook (see below)
└── src/                         React + TypeScript + Tailwind frontend
    ├── i18n/                    English / Hindi / Marathi translations
    ├── pages/                   Dashboard, Crop, Disease, Weather, Prices, Profile
    └── components/              Header, bottom navigation, theme & language switchers
```

## Dataset workbook

`dataset/KrishiSetu_Dataset.xlsx` is the whole dataset in one workbook (every row and column visible,
frozen and filterable headers). The models are trained on exactly this data
(the API reads the same rows from the CSV files in `backend/`, which load much faster).

- **Market Prices** — all 556,040 Agmarknet price rows (25 states, 484 districts, 3,702 mandis,
  1 Jan 2023 – 17 Oct 2026), each with **Rain (mm)**, **Rain last 7 days (mm)** and **Max Temp** for that district and day
- **Summary** — records, markets and min / avg / max price per state and commodity
- **District Weather** — location of every district and its yearly / last-30-day rainfall
- **Model Accuracy** — error of each commodity model vs. "same as last price", with and without rain, and on heavy-rain days
- **Crop Nutrients** — NPK range and preferred fertilizer for all 22 crops
- **Leaf Diseases** — all 19 disease classes with description, treatment, product and watering
- **Data Dictionary** — what every column and model feature means
- **Data Quality** — cleaning notes and the 1,910 rows the model ignores as data-entry errors

To rebuild it:

```bash
python backend/scripts/export_dataset.py
```

## How the price model works

1. **One price per district per day** — the median of all its mandis, after removing data-entry errors
   (prices more than 2.5× away from that district's usual price).
2. **A separate model for each commodity.** Each one predicts the *change* from the latest price
   (features: last 1/2/3/7 days, 7- and 30-day averages, volatility, days since last price, season, district).
   Forecasts therefore stay close to the current market price.
3. **Accuracy on the most recent 15% of days (Jul–Oct 2026), never seen in training:**

   | Commodity | Error (MAE) | Error % | "Same as last price" MAE |
   | --- | --- | --- | --- |
   | Wheat | ₹53 | 2.0% | ₹63 |
   | Cotton | ₹326 | 3.8% | ₹328 |
   | Rice | ₹333 | 8.3% | ₹409 |
   | Jowar | ₹407 | 11.5% | ₹478 |
   | Sugarcane | ₹18 | 5.4% | ₹18 (too little data, model keeps the last price) |

### What about sudden rain?

Rainfall for every district (daily, 2023 – today, from NASA POWER, plus Open-Meteo's 16-day forecast) is
part of the dataset. When training, each commodity's model is built **with and without** rain features
(rain that day, last 3 / 7 / 30 days, temperature) and the more accurate one is kept:

- **Cotton** — rain helps slightly, so it uses rain; the app shows the rain effect in ₹ (vs. a dry day).
- **Wheat, Rice, Jowar** — adding rain made forecasts slightly *worse*, even on heavy-rain days
  (≥ 20 mm in a day or ≥ 40 mm in 3 days; see the Model Accuracy sheet). When rain disrupts a market,
  the change shows up in the next days' mandi prices, and the model always starts from the latest price.

So the rain problem is handled in three ways: the data refreshes **every day** from Agmarknet, so a price
drop after rain becomes the new starting point; rain is used in the model wherever it actually improves
accuracy; and the app warns the farmer when the forecast shows **heavy rain** in the next 7 days.

## Deploying

Website on Vercel, API on your laptop with a free ngrok link (starts hidden at log-in via `install-autostart.bat`), login on Supabase: see [DEPLOY.md](DEPLOY.md).

## Running locally

### 1. Backend (Python 3.11)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --port 8000
```

API docs: http://localhost:8000/docs

### 2. Supabase (login / sign-up)

1. Create a project at https://supabase.com/dashboard.
2. Open **SQL Editor → New query**, paste [`supabase/setup.sql`](supabase/setup.sql) and click **Run**.
   This creates the `farmers` table and the `signup_farmer` / `signin_farmer` functions.
3. Copy the **Project URL** and **anon public key** from **Project Settings → API** into `.env` (below).

### 3. Frontend

Create `.env` in the project root:

```
VITE_BACKEND=http://localhost:8000
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
GEMINI_API_KEY=...
DATA_GOV_API_KEY=...        # free key from data.gov.in, used for live Agmarknet prices
```

```bash
npm install
npm run dev
```

Open http://localhost:8080.

## Keeping mandi prices up to date (Agmarknet)

Prices come from Agmarknet through the official data.gov.in API
(["Variety-wise Daily Market Prices Data of Commodity"](https://www.data.gov.in/resource/variety-wise-daily-market-prices-data-commodity)).

1. Sign up at https://www.data.gov.in (free), open **My Account** and copy your **API key**.
2. Add it to `.env` as `DATA_GOV_API_KEY=...`.
3. Catch up from the last date in the dataset to today and retrain (takes a while the first time):

   ```bash
   cd backend
   python update_prices.py --excel
   ```

After that the API server checks Agmarknet **once a day** by itself: it downloads new prices and
rainfall, retrains the models if anything new arrived and starts using them without a restart
(if data.gov.in is down it tries again an hour later).
`GET /price-status` shows the latest data date, model accuracy and the last update.
Set `AUTO_UPDATE_PRICES=0` to turn this off, or `PRICE_UPDATE_INTERVAL_HOURS` to change how often it runs.

| Script | What it does |
| --- | --- |
| `backend/agmarknet_sync.py` | Downloads new prices and appends them to `cleaned_combine_wsrjc.csv` (maps renamed districts like Solapur → Sholapur) |
| `backend/weather_history.py` | Finds every district's location and downloads its daily rainfall |
| `backend/train_price_model.py` | Retrains the 5 commodity models and writes accuracy to `price_model_metrics.json` |
| `backend/update_prices.py` | Runs all three, plus `--excel` to rebuild the workbook |

## API

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/predict` | Crop recommendation → `predicted_crop`, `top_crops` |
| POST | `/predict-disease` | Leaf image → disease class, confidence, alternatives |
| POST | `/predict-leaf` | Leaf image → plant name (Gemini) |
| POST | `/weather` | `{ city }` or `{ latitude, longitude }` → current + 8-day forecast |
| GET | `/price-options` | States → districts → commodities the price model can forecast |
| GET | `/price-status` | Latest data date, model accuracy, last automatic update |
| POST | `/predict-price` | `{ state, district, commodity, date }` → price, rain, heavy-rain days, 7-day outlook, history |

## Tech stack

React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query, Recharts, Framer Motion, next-themes · FastAPI, scikit-learn, XGBoost, PyTorch, pandas · Supabase · Agmarknet (data.gov.in) · NASA POWER · Open-Meteo · Google Gemini
