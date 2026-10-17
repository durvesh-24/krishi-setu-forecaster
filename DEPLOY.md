# Deploying KrishiSetu

| Part | Where | Notes |
| --- | --- | --- |
| Website (React) | **Vercel** | Always online, free |
| API (Python: PyTorch, XGBoost, ~200 MB of models/data) | **Your laptop + ngrok** | Free, fixed public link; works while the laptop runs `start-backend.bat` |
| Login database | **Supabase** | Free |

Free cloud servers (Render, Koyeb, Hugging Face free CPU) either have too little memory (512 MB) for
this API or are not available on every account. If you later get a paid plan (e.g. Hugging Face PRO),
`backend/Dockerfile` is ready to use there instead — just point `VITE_BACKEND` at that address.

Do the steps in order: **1 → 2 → 3 → 4**.

---

## 1. Supabase (login / sign-up)

1. https://supabase.com/dashboard → **New project**.
2. **SQL Editor → New query** → paste all of [`supabase/setup.sql`](supabase/setup.sql) → **Run**.
3. **Project Settings → API**: copy the **Project URL** and the **anon public** key.
4. Put them in `.env` as `VITE_SUPABASE_URL=...` and `VITE_SUPABASE_ANON_KEY=...`.

## 2. ngrok: a free fixed public link for the API

1. Sign up at https://dashboard.ngrok.com/signup (free).
2. **Your Authtoken** (left menu) → copy the token.
3. **Domains** (left menu, under *Universal Gateway*) → your free static domain, something like
   `your-name.ngrok-free.app` (click **+ New Domain / Create Domain** if none is shown) → copy it.
4. Install ngrok — in PowerShell:
   ```
   winget install ngrok.ngrok
   ```
   Close and reopen PowerShell, then save your token (once):
   ```
   ngrok config add-authtoken PASTE_YOUR_TOKEN
   ```
5. Add the domain to `.env` (no `https://`):
   ```
   NGROK_DOMAIN=your-name.ngrok-free.app
   ```
6. Make sure the backend packages are installed (once):
   ```
   py -3.11 -m pip install -r backend\requirements.txt
   ```

## 3. Start the API

Double-click **`start-backend.bat`** in the project folder.

- It starts the API (≈30 s) and then ngrok. Keep the window open.
- Check it: open `https://your-name.ngrok-free.app/docs` in a browser (click **Visit Site** if ngrok shows a notice).
- While it runs, the API also downloads new Agmarknet prices and rainfall once a day and retrains itself.

## 4. Website on Vercel

1. Sign up at https://vercel.com → **Continue with GitHub**.
2. **Add New… → Project** → import `durvesh-24/krishi-setu-forecaster`.
3. Framework preset: **Vite** (automatic). Leave the build settings as they are.
4. **Environment Variables**:

   | Name | Value |
   | --- | --- |
   | `VITE_BACKEND` | `https://your-name.ngrok-free.app` (no `/` at the end) |
   | `VITE_SUPABASE_URL` | Supabase Project URL |
   | `VITE_SUPABASE_ANON_KEY` | Supabase anon public key |

5. **Deploy** → you get `https://krishi-setu-forecaster.vercel.app` (or similar).

If you change a variable later: **Deployments → ⋯ → Redeploy**.

## Before a demo

1. Double-click `start-backend.bat` and wait for the ngrok screen ("Session Status: online").
2. Open the Vercel link → log in → Dashboard should show the weather.

If a page says it can't reach the server, the `start-backend.bat` window is closed or the laptop is
offline — start it again.
