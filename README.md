# 📈 QuantEdge — Advanced Stock Price Prediction

[![License: MIT](https://img.shields.io/badge/License-MIT-gold.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11](https://img.shields.io/badge/Python-3.11-blue.svg)](https://www.python.org/)
[![React 18](https://img.shields.io/badge/React-18-61dafb.svg)](https://reactjs.org/)
[![Deployment: Render](https://img.shields.io/badge/Deployment-Render-46E3B7.svg)](https://render.com/)

QuantEdge is a sophisticated full-stack machine learning application designed to forecast stock market trends. It leverages an ensemble of **Random Forest** and **LSTM** models to provide short-term and long-term price predictions with a focus on visual clarity and user experience.

---

## ✨ Key Features

- **🚀 Live ML Predictor**: Real-time market data fetching from Yahoo Finance with instant browser-side or server-side (Flask) inference.
- **🧠 Hybrid AI Engine**: 
  - **Random Forest**: 100-tree ensemble for robust daily forecasts (Backend).
  - **LSTM**: 3-layer Deep Learning model for sequential pattern recognition (`trial.py`).
- **🌍 Dynamic Multi-Currency**: Automatic localized currency detection (`₹`, `$`, `£`, `€`, etc.) based on the stock ticker suffix.
- **📊 6-Point Technical Analysis**:
  - Close Price History
  - SMA 20 & SMA 100 (Trend Confirmation)
  - Actual vs Predicted (Accuracy Validation)
  - 7-Day Future Forecast
  - Price Distribution & KDE
  - Feature Correlation Matrix
- **📄 Pro PDF Reports**: Generate comprehensive analysis reports with charts, metrics, and insights directly from the dashboard.
- **🎨 Minimalist Grid UI**: A high-end, dark-themed interface focused on "Grid-only" aesthetics for maximum focus.

---

## 🛠️ Tech Stack

### Backend
- **Core**: Python 3.11, Flask
- **ML/DS**: Scikit-Learn, TensorFlow, NumPy, Pandas
- **Utilities**: yfinance, SciPy, Matplotlib, Seaborn

### Frontend
- **Core**: React 18, Vite
- **Styling**: Tailwind CSS, Vanilla CSS
- **Animations**: Framer Motion
- **Charts**: Recharts
- **PDF**: jsPDF

---

## 📂 Project Structure

```text
├── backend/
│   ├── app.py           # Flask REST API (Ensemble Inference)
│   └── requirements.txt # Python dependencies
├── website/
│   ├── src/             # React application source
│   ├── public/          # Static assets
│   └── .env.example     # Environment template
├── code.py              # Random Forest core logic
├── trial.py             # LSTM (TensorFlow) core logic
├── render.yaml          # Render.com Infrastructure-as-Code
└── .github/workflows/   # CI/CD for GitHub Pages
```

---

## 🚀 Quick Start

### 1. Prerequisites
- Python 3.10+
- Node.js 18+

### 2. Local Backend Setup
```bash
cd backend
pip install -r requirements.txt
python app.py
# API starts at http://localhost:5000
```

### 3. Local Frontend Setup
```bash
cd website
cp .env.example .env.local  # Point VITE_API_URL to http://localhost:5000
npm install
npm run dev
```

---

## 🌐 Deployment

### Backend (Render)
The project includes a `render.yaml` for seamless deployment:
1. Connect your GitHub repo to **Render**.
2. Render will automatically detect the blueprint and set up the Flask service.
3. Copy your Render service URL.

### Frontend (GitHub Pages)
1. Set the `VITE_API_URL` secret in your GitHub Repository settings.
2. Push to `main` — the GitHub Action (`deploy.yml`) will handle the rest.

---

## 📝 License
Distributed under the MIT License. See `LICENSE` for more information.

Developed with ❤️ by [Aditya Raj](https://github.com/ADiTyaRaj8969)
