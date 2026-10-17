# Deploying KrishiSetu

| Part | Where | Notes |
| --- | --- | --- |
| Website (React) | **Vercel** | Always online, free |
| API (Python: PyTorch, XGBoost, ~200 MB of models/data) | **Your laptop + ngrok** | Free, fixed public link; starts hidden at Windows log-in (`install-autostart.bat`) |
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

## 3. Start the API (automatic)

Double-click **`install-autostart.bat`** once.

- The API and the ngrok link now start **hidden, every time you log in to Windows**, and restart
  themselves if they crash or the internet drops. No window to keep open.
- Check it: open `https://your-name.ngrok-free.app/docs` (click **Visit Site** if ngrok shows a notice).
- Logs are in `backend\logs\` (`service.log` says when it started / restarted).
- To stop it and remove it from start-up: double-click **`remove-autostart.bat`**.
- Without autostart you can still start it by hand with **`start-backend.bat`** (keep that window open).

The laptop must be **on, logged in and online** for predictions to work. To stop it sleeping:
Settings → System → Power → Screen and sleep → *When plugged in, put my device to sleep after* → **Never**.

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

1. Laptop on, logged in, connected to the internet (the backend starts by itself within a minute).
2. Open the Vercel link → log in → Dashboard should show the weather.

If a page says it can't reach the server, the laptop is off, asleep or offline. Wake it / reconnect
and wait a minute; the backend repairs itself.
