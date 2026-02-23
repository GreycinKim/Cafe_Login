# Life Word Mission Cafe

A full-stack church/ministry management web application for tracking finances, receipts, reimbursements, and recipes.

## Tech Stack

- **Frontend:** React 18 + Vite, Tailwind CSS, React Router v6, Axios, Recharts
- **Backend:** Flask, Flask-SQLAlchemy, Flask-Migrate, Flask-JWT-Extended, Flask-CORS
- **Database:** PostgreSQL
- **AI/Vector:** OpenAI API (GPT-4o for receipt OCR, text-embedding-3-small for embeddings), Pinecone (vector search)
- **Auth:** JWT tokens with role-based access (admin / worker)

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── __init__.py        # Flask app factory
│   │   ├── models.py          # SQLAlchemy models
│   │   ├── routes/            # API blueprints
│   │   └── services/          # OCR + Pinecone service
│   ├── uploads/               # Local receipt image storage
│   ├── requirements.txt
│   ├── .env.example
│   └── run.py
└── frontend/
    ├── src/
    │   ├── api/               # Axios client + endpoint functions
    │   ├── components/        # Layout, Modal, ProtectedRoute
    │   ├── pages/             # Login, Dashboard, Expenses, etc.
    │   ├── context/           # AuthContext
    │   └── hooks/             # useAuth
    ├── package.json
    └── index.html
```

## Setup Instructions

### Prerequisites

- **Node.js** (v18+) and npm
- **Python** (3.10+)
- **PostgreSQL** (running locally or remotely)

### 1. Database Setup

```bash
# Create the database
createdb ministry_db
```

### 2. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and fill in your actual values:
#   DATABASE_URL=postgresql://user:password@localhost:5432/ministry_db
#   SECRET_KEY=<random-secret>
#   JWT_SECRET_KEY=<random-jwt-secret>
#   OPENAI_API_KEY=sk-...
#   PINECONE_API_KEY=<your-key>

# Initialize and run database migrations
flask --app run:app db init
flask --app run:app db migrate -m "initial"
flask --app run:app db upgrade

# Start the backend server
python run.py
```

The backend runs at `http://localhost:5000`.

### 3. Seed the Admin User

After the backend is running, create the first admin account:

```bash
curl -X POST http://localhost:5000/api/auth/seed-admin \
  -H "Content-Type: application/json" \
  -d '{"name": "Admin", "email": "admin@ministry.org", "password": "admin123"}'
```

> This endpoint is disabled after the first admin is created.

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The frontend runs at `http://localhost:3000` and proxies API requests to the backend.

### 5. Log In

Open `http://localhost:3000` and sign in with your admin credentials. From there you can create additional worker accounts via the Users page.

## Features

### Dashboard
- Date-range filtered financial summary table
- Daily breakdown by category (Sales, Expenses, Reimbursement, Ministry Fund, Offering)
- Net profit calculation with color-coded values
- Admin: Add, edit, and delete ledger entries

### Expenses (Receipt OCR)
- Drag-and-drop receipt image upload
- Automated OCR via OpenAI GPT-4o extracts merchant, date, amount, items
- Review and correct OCR results before saving
- Semantic search for receipts via Pinecone vector embeddings

### Reimbursements
- Workers submit reimbursement requests
- Admins approve/reject from a pending queue
- Status tracking with visual badges

### Recipes
- Card grid with category filtering
- Full recipe detail view (ingredients, instructions, times)
- Admin: Create, edit, and delete recipes with image upload

### Analytics
- Summary cards (Total Sales, Expenses, Net Profit, Reimbursement Count)
- Line chart: Sales vs Expenses over time
- Bar chart: Category breakdown

### User Management (Admin)
- Create, edit, deactivate/activate user accounts
- Role assignment (admin / worker)

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SECRET_KEY` | Flask secret key |
| `JWT_SECRET_KEY` | JWT signing key |
| `OPENAI_API_KEY` | OpenAI API key (for OCR + embeddings) |
| `PINECONE_API_KEY` | Pinecone API key (for receipt vector search) |
| `PINECONE_INDEX_NAME` | Pinecone index name (default: `receipts`) |

---

## Deployment

The app is split into **frontend** (Vercel) and **backend** (Render). You need a **PostgreSQL** database (Neon, Supabase, Render Postgres, or Vercel Postgres).

### 1. Database

Create a PostgreSQL database and copy the connection URL (e.g. `postgresql://user:pass@host:5432/dbname`). You will set this as `DATABASE_URL` on the backend.

### 2. Backend on Render

See **RENDER_DEPLOY.md** for step-by-step Render instructions. Summary: create a Web Service, set Root Directory to `backend`, set Build/Start/Pre-Deploy commands, add DATABASE_URL and secrets, seed admin, then copy the backend URL for the frontend.

### 3. Frontend (Vercel)

1. Import your repo in Vercel.
2. Set **Root Directory** to `frontend`.
3. Add an environment variable:
   - **Name:** `VITE_API_URL`
   - **Value:** your Render backend URL from step 2 (no trailing slash), e.g. `https://cafe-backend.onrender.com`
4. Deploy. Vercel will run `npm run build` and serve the `dist` folder. The app will call your Render backend for all API and image requests.

### 4. Lock down CORS (optional)

After the frontend is live, set `FRONTEND_URL` on the Render service to your Vercel URL (e.g. `https://your-app.vercel.app`). The backend will then allow only that origin for API requests.

### 5. Checklist

- [ ] PostgreSQL created and `DATABASE_URL` set on Render
- [ ] Render env vars set: `SECRET_KEY`, `JWT_SECRET_KEY` (and optionally `FRONTEND_URL`)
- [ ] Backend deployed; pre-deploy command ran migrations (or run `flask --app run:app db upgrade` once via Shell)
- [ ] Admin user seeded via `POST /api/auth/seed-admin`
- [ ] Frontend on Vercel with `VITE_API_URL` set to Render backend URL
- [ ] Login and API calls work from the deployed frontend

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Current user from token |
| POST | `/api/auth/seed-admin` | One-time admin creation |
| GET | `/api/users/` | List all users (admin) |
| POST | `/api/users/` | Create user (admin) |
| PATCH | `/api/users/:id` | Update user (admin) |
| DELETE | `/api/users/:id` | Soft-delete user (admin) |
| POST | `/api/receipts/upload` | Upload + OCR receipt |
| GET | `/api/receipts/` | List receipts |
| PATCH | `/api/receipts/:id` | Update receipt fields |
| GET | `/api/receipts/search?q=` | Semantic search |
| POST | `/api/ledger/` | Create ledger entry |
| GET | `/api/ledger/` | List entries (filterable) |
| GET | `/api/ledger/daily-summary` | Aggregated daily summary |
| PATCH | `/api/ledger/:id` | Update entry (admin) |
| DELETE | `/api/ledger/:id` | Delete entry (admin) |
| POST | `/api/reimbursements/` | Submit reimbursement |
| GET | `/api/reimbursements/mine` | My reimbursements |
| GET | `/api/reimbursements/pending` | Pending queue (admin) |
| POST | `/api/reimbursements/:id/approve` | Approve (admin) |
| POST | `/api/reimbursements/:id/reject` | Reject (admin) |
| GET | `/api/recipes/` | List recipes |
| POST | `/api/recipes/` | Create recipe (admin) |
| PATCH | `/api/recipes/:id` | Update recipe (admin) |
| DELETE | `/api/recipes/:id` | Delete recipe (admin) |
| GET | `/api/analytics/summary` | Financial summary + trends |
