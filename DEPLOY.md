# Deploying KrishiSetu

KrishiSetu has two parts that are hosted separately:

| Part | Where | Why |
| --- | --- | --- |
| Website (React) | **Vercel** | Free static hosting, deploys from GitHub |
| API (Python: PyTorch, XGBoost, ~200 MB of models/data) | **Hugging Face Spaces** (Docker) | Free, 16 GB RAM. Too large for Vercel's serverless functions |
| Login database | **Supabase** | Already used by the app |

Do them in this order: **1 → 2 → 3**, because the website needs the API address and Supabase keys.

---

## 1. Supabase (login / sign-up)

1. https://supabase.com/dashboard → **New project**.
2. **SQL Editor → New query** → paste all of [`supabase/setup.sql`](supabase/setup.sql) → **Run**.
3. **Project Settings → API**: copy the **Project URL** and the **anon public** key (you need them in step 3).

## 2. API on Hugging Face Spaces

1. Sign up at https://huggingface.co (free).
2. Top right → **New → Space**
   - Space name: `krishisetu-api`
   - SDK: **Docker** → **Blank**
   - Hardware: **CPU basic (free)**
   - Visibility: Public
3. In the new Space open **Files → Add file → Upload files** and drag in **everything inside the
   `backend/` folder** (not the folder itself): `main.py`, `Dockerfile`, `README.md`,
   `requirements.txt`, all `.py` files, the `.csv`, `.joblib`, `.json` and `.pth` files, and the `scripts` folder.
   Large files are handled automatically. Click **Commit**.
4. **Settings → Variables and secrets → New secret**, add:
   - `GEMINI_API_KEY` = your Gemini key
   - `DATA_GOV_API_KEY` = your data.gov.in key
5. The Space builds (about 5–10 minutes the first time). When it says **Running**, your API address is
   `https://<your-username>-krishisetu-api.hf.space`. Check `https://<your-username>-krishisetu-api.hf.space/docs` opens.

> Free Spaces go to sleep after ~48 hours without visitors and wake up on the next request (takes a minute).
> Open the API link a few minutes before a demo.

## 3. Website on Vercel

1. Sign up at https://vercel.com with your GitHub account.
2. **Add New → Project** → import `durvesh-24/krishi-setu-forecaster`.
3. Framework preset: **Vite** (detected automatically; `vercel.json` sets the rest).
4. **Environment Variables** — add these three:

   | Name | Value |
   | --- | --- |
   | `VITE_BACKEND` | `https://<your-username>-krishisetu-api.hf.space` (no `/` at the end) |
   | `VITE_SUPABASE_URL` | Project URL from step 1 |
   | `VITE_SUPABASE_ANON_KEY` | anon public key from step 1 |

5. **Deploy**. You get a link like `https://krishi-setu-forecaster.vercel.app`.

If you change an environment variable later, use **Deployments → ⋯ → Redeploy** so the new value is built in.

## Check it works

- Open the Vercel link → sign up → Dashboard shows the weather.
- Price Forecasting → pick a state, district, commodity → a price and the rain section appear.
- Leaf Disease → upload a leaf photo → a result appears.

If a page says it can't reach the server, open the Hugging Face Space link first to wake it up, then refresh.
