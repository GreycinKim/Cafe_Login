# Deploying the backend on Render

Use this guide to deploy the **Life Word Mission Cafe** Flask backend on [Render](https://render.com).

## Prerequisites

- Repo pushed to **GitHub**
- A **PostgreSQL** database (e.g. [Render Postgres](https://render.com/docs/databases), [Neon](https://neon.tech), or Supabase). Copy the connection URL.

## Steps

### 1. Create a Web Service

1. Go to [dashboard.render.com](https://dashboard.render.com) and sign in (or create an account).
2. Click **New +** → **Web Service**.
3. Connect your GitHub account if needed, then select the repository that contains this project.

### 2. Configure the service

Use these settings:

| Field | Value |
|-------|--------|
| **Name** | `cafe-backend` (or any name you like) |
| **Region** | Choose one close to you |
| **Root Directory** | `backend` |
| **Runtime** | Python 3 |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `gunicorn --config gunicorn_config.py run:app` |
| **Pre-Deploy Command** | `flask --app run:app db upgrade` (runs migrations before each deploy) |

### 3. Environment variables

In the **Environment** section, add:

| Key | Value | Required |
|-----|--------|----------|
| `DATABASE_URL` | Your PostgreSQL connection string | Yes |
| `SECRET_KEY` | A long random string (e.g. run `openssl rand -hex 32`) | Yes |
| `JWT_SECRET_KEY` | Another long random string | Yes |
| `FRONTEND_URL` | Your Vercel frontend URL (e.g. `https://your-app.vercel.app`) — for CORS; can add after frontend is deployed | No |
| `OPENAI_API_KEY` | For receipt OCR | No |
| `PINECONE_API_KEY` | For receipt search | No |
| `PINECONE_INDEX_NAME` | Default: `receipts` | No |

### 4. Deploy

Click **Create Web Service**. Render will build and deploy. The first time, the pre-deploy command will run `flask db upgrade` to apply migrations.

### 5. Seed the admin user (one-time)

After the service is live, create the first admin account. Replace `YOUR_RENDER_URL` with your actual URL (e.g. `https://cafe-backend.onrender.com`):

```bash
curl -X POST https://YOUR_RENDER_URL/api/auth/seed-admin \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Admin\", \"email\": \"admin@ministry.org\", \"password\": \"YOUR_SECURE_PASSWORD\"}"
```

Use a strong password and keep it safe. The seed endpoint is disabled after the first admin is created.

### 6. Use the backend URL for the frontend

Copy your backend URL (e.g. `https://cafe-backend.onrender.com`) **without** a trailing slash. In Vercel, set the frontend env var:

- **Name:** `VITE_API_URL`
- **Value:** `https://cafe-backend.onrender.com` (your URL)

---

## Optional: Deploy with Blueprint

The repo includes a `render.yaml` Blueprint. You can use it to create the web service from the dashboard:

1. **New +** → **Blueprint**.
2. Connect the repo; Render will read `render.yaml` and create the `cafe-backend` web service with the correct root directory, build command, start command, and pre-deploy command.
3. You still must add **Environment** variables (especially `DATABASE_URL`, `SECRET_KEY`, `JWT_SECRET_KEY`) in the Render dashboard for the new service.

---

## Troubleshooting

- **Migrations fail:** Ensure `DATABASE_URL` is set and correct. You can run migrations manually via **Shell** in the Render dashboard: `flask --app run:app db upgrade`.
- **CORS errors from frontend:** Set `FRONTEND_URL` on Render to your exact Vercel URL (e.g. `https://your-app.vercel.app`).
- **Service sleeps (free tier):** On the free tier, the service may spin down after inactivity; the first request after that can be slow.
