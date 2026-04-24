import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
import io, base64, math

import numpy as np
import pandas as pd
import yfinance as yf
import datetime as dt

from flask import Flask, jsonify, request
from flask_cors import CORS
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_squared_error

app = Flask(__name__)
CORS(app)

# ── Dark gold chart theme ─────────────────────────────────────────────────────
plt.rcParams.update({
    'figure.facecolor':  '#0f0e06',
    'axes.facecolor':    '#181700',
    'axes.edgecolor':    '#2a2800',
    'axes.labelcolor':   '#7a7760',
    'axes.titlecolor':   '#f0eed5',
    'axes.titlesize':    13,
    'axes.labelsize':    10,
    'xtick.color':       '#7a7760',
    'ytick.color':       '#7a7760',
    'grid.color':        '#222100',
    'grid.linestyle':    '--',
    'grid.alpha':        0.6,
    'text.color':        '#f0eed5',
    'legend.facecolor':  '#181700',
    'legend.edgecolor':  '#2a2800',
    'legend.labelcolor': '#f0eed5',
    'legend.fontsize':   9,
    'figure.dpi':        150,
    'savefig.dpi':       150,
})

GOLD   = '#d4af37'
GOLD_B = '#ffd700'
BLUE   = '#60a5fa'
PURPLE = '#c084fc'
RED    = '#f87171'
GREEN  = '#4ade80'


def fig_to_b64(fig):
    buf = io.BytesIO()
    fig.savefig(buf, format='png', bbox_inches='tight',
                facecolor='#0f0e06', edgecolor='none')
    buf.seek(0)
    encoded = base64.b64encode(buf.read()).decode('utf-8')
    plt.close(fig)
    return f'data:image/png;base64,{encoded}'


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_data(symbol, start, end):
    try:
        df = yf.download(symbol, start=start, end=end, progress=False)
        if df.empty:
            return None, None, None
        df.columns = [c[0] if isinstance(c, tuple) else c for c in df.columns]
        close = df['Close'].values.flatten().astype(float)
        dates = [str(d.date()) for d in df.index]
        return df, close, dates
    except Exception:
        return None, None, None


def sma(prices, w):
    out = [None] * (w - 1)
    for i in range(w - 1, len(prices)):
        out.append(float(np.mean(prices[i - w + 1:i + 1])))
    return out


def train_model(close, pred_days):
    scaler = MinMaxScaler()
    scaled = scaler.fit_transform(close.reshape(-1, 1))
    X, y = [], []
    for i in range(pred_days, len(scaled)):
        X.append(scaled[i - pred_days:i, 0])
        y.append(scaled[i, 0])
    X, y = np.array(X), np.array(y)
    split = int(len(X) * 0.8)
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X[:split], y[:split])
    return model, scaler, X[split:], y[split:], split


def predict_future(model, scaler, close, pred_days, n):
    scaled = scaler.transform(close.reshape(-1, 1)).flatten()
    seq = list(scaled[-pred_days:])
    preds = []
    for _ in range(n):
        p = model.predict(np.array(seq[-pred_days:]).reshape(1, -1))[0]
        preds.append(float(scaler.inverse_transform([[p]])[0][0]))
        seq.append(p)
    return preds


def future_dates(last_dt, n):
    out = []
    for i in range(1, n + 1):
        d = last_dt + pd.Timedelta(days=i)
        while d.weekday() >= 5:
            d += pd.Timedelta(days=1)
        out.append(str(d.date()))
    return out


# ── Routes ────────────────────────────────────────────────────────────────────

@app.route('/api/health')
def health():
    return jsonify({'status': 'ok', 'message': 'StockPredict API running'})


@app.route('/api/predict', methods=['POST'])
def predict():
    b = request.get_json() or {}
    symbol    = b.get('symbol', 'AAPL').upper().strip()
    start     = b.get('start', '2024-01-01')
    end       = b.get('end', str(dt.date.today()))
    pred_days = int(b.get('prediction_days', 30))
    fut_days  = int(b.get('future_days', 7))

    df, close, dates = get_data(symbol, start, end)
    if df is None:
        return jsonify({'error': f'No data found for "{symbol}"'}), 404
    if len(close) < pred_days + 20:
        return jsonify({'error': f'Need at least {pred_days + 20} trading days of data.'}), 400

    model, scaler, X_test, y_test, split = train_model(close, pred_days)

    y_pred   = scaler.inverse_transform(model.predict(X_test).reshape(-1, 1)).flatten()
    y_actual = scaler.inverse_transform(y_test.reshape(-1, 1)).flatten()
    rmse     = math.sqrt(mean_squared_error(y_actual, y_pred))
    accuracy = max(0.0, min(100.0, 100 - rmse / (np.mean(y_actual) + 1e-9) * 100))

    fut_prices = predict_future(model, scaler, close, pred_days, fut_days)
    fut_dates  = future_dates(df.index[-1], fut_days)

    s20  = sma(close, 20)
    s100 = sma(close, 100)

    historical = [
        {'date': dates[i], 'close': float(close[i]),
         'sma20': s20[i], 'sma100': s100[i]}
        for i in range(len(dates))
    ]

    test_off = split + pred_days
    test_actual_arr  = [None] * test_off + [float(v) for v in y_actual]
    test_pred_arr    = [None] * test_off + [float(v) for v in y_pred]

    return jsonify({
        'symbol': symbol,
        'historical': historical,
        'future': [{'date': d, 'predicted': p} for d, p in zip(fut_dates, fut_prices)],
        'test_actual':    test_actual_arr,
        'test_predicted': test_pred_arr,
        'metrics': {
            'rmse':           float(rmse),
            'accuracy':       float(accuracy),
            'current_price':  float(close[-1]),
            'predicted_next': fut_prices[0] if fut_prices else None,
            'price_change':   float(close[-1] - close[0]),
            'pct_change':     float((close[-1] - close[0]) / close[0] * 100),
            'data_points':    len(close),
            'train_size':     split,
            'test_size':      len(X_test),
        },
    })


@app.route('/api/report', methods=['POST'])
def report():
    b = request.get_json() or {}
    symbol    = b.get('symbol', 'AAPL').upper().strip()
    start     = b.get('start', '2024-01-01')
    end       = b.get('end', str(dt.date.today()))
    pred_days = int(b.get('prediction_days', 30))
    fut_days  = int(b.get('future_days', 7))

    df, close, dates = get_data(symbol, start, end)
    if df is None:
        return jsonify({'error': f'No data found for "{symbol}"'}), 404
    if len(close) < pred_days + 20:
        return jsonify({'error': 'Not enough data for report.'}), 400

    model, scaler, X_test, y_test, split = train_model(close, pred_days)

    y_pred   = scaler.inverse_transform(model.predict(X_test).reshape(-1, 1)).flatten()
    y_actual = scaler.inverse_transform(y_test.reshape(-1, 1)).flatten()
    rmse     = math.sqrt(mean_squared_error(y_actual, y_pred))
    accuracy = max(0.0, min(100.0, 100 - rmse / (np.mean(y_actual) + 1e-9) * 100))

    fut_prices = predict_future(model, scaler, close, pred_days, fut_days)
    fut_dates_ = future_dates(df.index[-1], fut_days)

    s20  = np.array([v if v is not None else np.nan for v in sma(close, 20)])
    s100 = np.array([v if v is not None else np.nan for v in sma(close, 100)])

    # Chart 1 – Close Price History
    fig, ax = plt.subplots(figsize=(12, 4.5))
    ax.plot(close, color=GOLD, linewidth=1.5, label='Close Price')
    ax.fill_between(range(len(close)), close, alpha=0.08, color=GOLD)
    ax.set_title(f'{symbol} – Close Price History')
    ax.set_xlabel('Trading Days'); ax.set_ylabel('Price (USD)')
    ax.legend(); ax.grid(True)
    chart_history = fig_to_b64(fig)

    # Chart 2 – Moving Averages
    fig, ax = plt.subplots(figsize=(12, 4.5))
    ax.plot(close, color=GOLD, linewidth=1.2, label='Close Price', alpha=0.8)
    ax.plot(s20,   color=BLUE,   linewidth=1.5, linestyle='--', label='SMA 20')
    ax.plot(s100,  color=PURPLE, linewidth=1.5, linestyle='--', label='SMA 100')
    ax.set_title(f'{symbol} – Close Price & Moving Averages')
    ax.set_xlabel('Trading Days'); ax.set_ylabel('Price (USD)')
    ax.legend(); ax.grid(True)
    chart_sma = fig_to_b64(fig)

    # Chart 3 – Actual vs Predicted
    fig, ax = plt.subplots(figsize=(12, 4.5))
    ax.plot(y_actual, color=GOLD,  linewidth=1.5, label='Actual Price')
    ax.plot(y_pred,   color=BLUE,  linewidth=1.5, linestyle='--', label='Predicted (RF)')
    ax.set_title(f'{symbol} – Actual vs Predicted (Test Set)  |  RMSE: ${rmse:.2f}')
    ax.set_xlabel('Test Days'); ax.set_ylabel('Price (USD)')
    ax.legend(); ax.grid(True)
    chart_avp = fig_to_b64(fig)

    # Chart 4 – Future Prediction
    last_n   = min(60, len(close))
    tail     = close[-last_n:]
    hx       = list(range(last_n))
    fx       = list(range(last_n, last_n + fut_days))
    fig, ax  = plt.subplots(figsize=(12, 4.5))
    ax.plot(hx, tail,        color=GOLD,   linewidth=1.5, label='Historical')
    ax.plot(fx, fut_prices,  color=GOLD_B, linewidth=2,   linestyle='--',
            marker='o', markersize=4, label=f'Predicted ({fut_days}d)')
    ax.axvline(x=last_n - 1, color='#2a2800', linestyle=':', linewidth=1.5)
    ax.set_title(f'{symbol} – Future Price Prediction')
    ax.set_xlabel('Trading Days'); ax.set_ylabel('Price (USD)')
    ax.legend(); ax.grid(True)
    chart_future = fig_to_b64(fig)

    # Chart 5 – Distribution
    fig, ax = plt.subplots(figsize=(12, 4.5))
    ax.hist(close, bins=50, color=GOLD, edgecolor='#0f0e06', alpha=0.75, label='Frequency')
    try:
        from scipy.stats import gaussian_kde
        xs = np.linspace(close.min(), close.max(), 300)
        ys = gaussian_kde(close)(xs)
        ax2 = ax.twinx()
        ax2.plot(xs, ys, color=GOLD_B, linewidth=2, label='KDE')
        ax2.tick_params(colors='#7a7760')
        ax2.set_yticks([])
    except Exception:
        pass
    ax.set_title(f'{symbol} – Closing Price Distribution')
    ax.set_xlabel('Price (USD)'); ax.set_ylabel('Frequency')
    ax.grid(True)
    chart_dist = fig_to_b64(fig)

    # Chart 6 – Correlation Matrix
    df_c = df[['Open', 'High', 'Low', 'Close', 'Volume']].copy()
    df_c.columns = ['Open', 'High', 'Low', 'Close', 'Volume']
    df_c = df_c.apply(pd.to_numeric, errors='coerce').dropna()
    fig, ax = plt.subplots(figsize=(8, 6))
    sns.heatmap(df_c.corr(), annot=True, cmap='YlOrBr', fmt='.2f',
                linewidths=0.5, ax=ax,
                annot_kws={'size': 9, 'color': '#f0eed5'},
                linecolor='#2a2800')
    ax.set_title(f'{symbol} – Feature Correlation Matrix')
    chart_corr = fig_to_b64(fig)

    return jsonify({
        'symbol': symbol,
        'metrics': {
            'rmse': float(rmse), 'accuracy': float(accuracy),
            'current_price': float(close[-1]),
            'predicted_next': fut_prices[0] if fut_prices else None,
            'data_points': len(close), 'start': start, 'end': end,
        },
        'charts': [
            {
                'id': 'history', 'title': 'Close Price History',
                'image': chart_history,
                'description': (
                    f'Historical closing price of {symbol} from {start} to {end}. '
                    f'The price started at ${close[0]:.2f} and '
                    f'{"rose" if close[-1] > close[0] else "fell"} to ${close[-1]:.2f} — '
                    f'a {(close[-1]-close[0])/close[0]*100:+.2f}% change over the period. '
                    f'The shaded area highlights overall price momentum.'
                ),
            },
            {
                'id': 'sma', 'title': 'Moving Averages (SMA 20 & SMA 100)',
                'image': chart_sma,
                'description': (
                    'Simple Moving Averages smooth out price fluctuations to reveal trend direction. '
                    'SMA 20 (blue dashed) captures short-term momentum and reacts quickly to price changes. '
                    'SMA 100 (purple dashed) reflects the long-term trend. '
                    'A Golden Cross (SMA 20 crossing above SMA 100) signals bullish momentum; '
                    'a Death Cross signals bearish pressure.'
                ),
            },
            {
                'id': 'avp', 'title': 'Actual vs Predicted Prices (Test Set)',
                'image': chart_avp,
                'description': (
                    f'The Random Forest model was evaluated on a held-out test set (20% of data = {len(y_actual)} days). '
                    f'Achieved RMSE: ${rmse:.2f} | Estimated accuracy: {accuracy:.1f}%. '
                    f'The model uses {pred_days} previous trading days as input features to predict the next day\'s closing price. '
                    f'100 decision trees are averaged (ensemble) to produce each prediction.'
                ),
            },
            {
                'id': 'future', 'title': f'Future Price Prediction (Next {fut_days} Days)',
                'image': chart_future,
                'description': (
                    f'Iterative {fut_days}-day forecast starting from {str(df.index[-1].date())}. '
                    f'Each predicted value is fed back as input for the next step. '
                    f'Next trading day prediction: ${fut_prices[0]:.2f} '
                    f'({(fut_prices[0]-close[-1])/close[-1]*100:+.2f}% from current). '
                    'Stock predictions carry inherent uncertainty — use as one of many decision inputs.'
                ),
            },
            {
                'id': 'dist', 'title': 'Closing Price Distribution',
                'image': chart_dist,
                'description': (
                    f'Histogram of {symbol} closing prices over the selected period. '
                    f'The KDE curve shows the probability density. '
                    f'Median: ${np.median(close):.2f} | Min: ${close.min():.2f} | '
                    f'Max: ${close.max():.2f} | Std Dev: ${close.std():.2f}. '
                    f'Concentration around certain price levels indicates support/resistance zones.'
                ),
            },
            {
                'id': 'corr', 'title': 'Feature Correlation Matrix',
                'image': chart_corr,
                'description': (
                    'Pearson correlation between OHLCV features. Values near +1 indicate strong positive '
                    'correlation (move together); near -1 indicates inverse relationship. '
                    'Open/High/Low/Close are highly correlated as expected for daily price data. '
                    'Volume often shows a distinct pattern, sometimes inversely correlated with price.'
                ),
            },
        ],
    })


if __name__ == '__main__':
    app.run(debug=True, port=5000, host='0.0.0.0')
