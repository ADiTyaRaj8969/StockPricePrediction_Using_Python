# Stock Price Prediction — Machine Learning

A full-stack ML application that predicts stock prices using **Random Forest** and **LSTM** models, with an interactive React frontend and a PDF report generator.

---

## Project Structure

```
├── code.py              # Random Forest prediction model
├── trial.py             # LSTM (TensorFlow/Keras) model
├── backend/
│   ├── app.py           # Flask REST API
│   └── requirements.txt
├── website/
│   ├── src/             # React frontend
│   ├── package.json
│   └── .env.example
└── .github/
    └── workflows/
        └── deploy.yml   # GitHub Actions — auto-deploy to Pages
```

---

## Models

| Feature           | Random Forest (`code.py`)      | LSTM (`trial.py`)              |
|-------------------|---------------------------------|---------------------------------|
| Library           | scikit-learn                   | TensorFlow / Keras              |
| Architecture      | 100 decision trees             | 3-layer LSTM + Dropout(0.2)     |
| Training speed    | Fast (no GPU needed)           | Slow (100 epochs)               |
| Loss function     | MSE                            | MSE                             |
| Normalization     | MinMaxScaler (0–1)             | MinMaxScaler (0–1)              |

---

## Quick Start

### 1. Backend (Python)

```bash
cd backend
pip install -r requirements.txt
python app.py
# API runs at http://localhost:5000
```

### 2. Frontend (React)

```bash
cd website
cp .env.example .env.local          # set VITE_API_URL if needed
npm install
npm run dev                          # dev server at http://localhost:5173
```

### 3. Production build

```bash
cd website
npm run build                        # outputs to website/dist/
```

---

## Backend API Endpoints

| Method | Path           | Description                                      |
|--------|----------------|--------------------------------------------------|
| GET    | `/api/health`  | Health check                                     |
| POST   | `/api/predict` | Returns historical prices + ML forecast + metrics |
| POST   | `/api/report`  | Returns 6 matplotlib chart images for PDF report  |

### POST `/api/predict` — Request body

```json
{
  "symbol":          "AAPL",
  "start":           "2024-01-01",
  "end":             "2025-01-01",
  "prediction_days": 30,
  "future_days":     7
}
```

---

## Deploying the Frontend to GitHub Pages

The GitHub Actions workflow (`.github/workflows/deploy.yml`) automatically builds and deploys the React app to GitHub Pages whenever you push to `main`.

**Setup steps:**
1. Go to **Settings → Pages** → set source to `gh-pages` branch.
2. (Optional) Add `VITE_API_URL` as a **Repository Secret** (Settings → Secrets) pointing to your deployed backend URL.
3. Push to `main` — the site deploys automatically.

Live URL: `https://ADiTyaRaj8969.github.io/StockPricePrediction_Using_Python/`

---

## Deploying the Backend

The Flask API can be deployed to any Python-compatible hosting:

- **Render** (free tier): connect repo, set `Start Command` to `cd backend && python app.py`
- **Railway**: auto-detects Python, set `ROOT_DIRECTORY` to `backend`
- **Heroku**: add a `Procfile` with `web: python backend/app.py`

After deployment, set the backend URL as `VITE_API_URL` in the frontend env or as a GitHub Secret.

---

## Tech Stack

**Backend:** Python, Flask, scikit-learn, TensorFlow, yfinance, NumPy, Pandas, Matplotlib, Seaborn, SciPy

**Frontend:** React, Vite, Tailwind CSS, Framer Motion, Recharts, jsPDF

---

## License

MIT — Aditya Raj
