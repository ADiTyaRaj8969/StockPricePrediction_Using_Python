# QuantEdge - Stock Price Prediction

QuantEdge is a full-stack machine learning application designed to forecast stock market trends. It utilizes Random Forest and LSTM models to provide price predictions with a focus on visual clarity and user experience.

---

## Key Features

- Live ML Predictor: Real-time market data fetching from Yahoo Finance with instant inference.
- Hybrid AI Engine: Random Forest and LSTM models for pattern recognition and forecasting.
- Dynamic Multi-Currency: Automatic localized currency detection based on the stock ticker suffix.
- Technical Analysis: History, SMA trend confirmation, and accuracy validation metrics.
- PDF Reports: Automated generation of analysis reports with charts and metrics.
- Minimalist Grid UI: A dark-themed interface focused on a clean grid aesthetic.

---

## Tech Stack

### Backend
- Core: Python 3.11, Flask
- ML/DS: Scikit-Learn, TensorFlow, NumPy, Pandas
- Utilities: yfinance, SciPy, Matplotlib, Seaborn

### Frontend
- Core: React 18, Vite
- Styling: Tailwind CSS, Vanilla CSS
- Animations: Framer Motion
- Charts: Recharts
- PDF: jsPDF

---

## Project Structure

- backend/: Flask REST API and dependencies.
- website/: React application source and assets.
- code.py: Random Forest core logic.
- trial.py: LSTM core logic.
- render.yaml: Deployment configuration.

---

## Quick Start

### 1. Prerequisites
- Python 3.10+
- Node.js 18+

### 2. Local Backend Setup
cd backend
pip install -r requirements.txt
python app.py

### 3. Local Frontend Setup
cd website
cp .env.example .env.local
npm install
npm run dev

---

## Deployment

### Backend
The project includes a render.yaml for deployment on Render. Connect the repository and the service will be configured automatically.

### Frontend
GitHub Actions handle deployment to GitHub Pages. Set the VITE_API_URL secret in the repository settings to point to your backend.

---

## License
Distributed under the MIT License.

Developed by Aditya Raj
