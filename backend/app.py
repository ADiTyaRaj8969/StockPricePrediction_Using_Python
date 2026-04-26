import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
import io, base64, math, os, warnings, traceback
warnings.filterwarnings('ignore')

import numpy as np
import pandas as pd
import yfinance as yf
import datetime as dt

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

DIST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dist')

from sklearn.ensemble import (
    RandomForestRegressor, GradientBoostingRegressor, ExtraTreesRegressor
)
from sklearn.linear_model import Ridge
from sklearn.preprocessing import RobustScaler
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


# ── Data fetch ────────────────────────────────────────────────────────────────

def get_data(symbol, start, end):
    try:
        df = yf.download(symbol, start=start, end=end, progress=False)
        if df.empty:
            return None, None, None
        df.columns = [c[0] if isinstance(c, tuple) else c for c in df.columns]
        df = df.dropna(subset=['Close'])
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


# ── Technical indicator engine ────────────────────────────────────────────────

def _ema(arr, span):
    s = pd.Series(arr)
    return s.ewm(span=span, adjust=False).mean().values

def _rsi(close, period=14):
    delta = np.diff(close, prepend=close[0])
    gain  = np.where(delta > 0, delta, 0.0)
    loss  = np.where(delta < 0, -delta, 0.0)
    ag    = pd.Series(gain).ewm(alpha=1/period, adjust=False).mean().values
    al    = pd.Series(loss).ewm(alpha=1/period, adjust=False).mean().values
    rs    = np.where(al < 1e-10, 100.0, ag / (al + 1e-10))
    return np.where(al < 1e-10, 100.0, 100 - 100 / (1 + rs))

def _atr(high, low, close, period=14):
    prev = np.roll(close, 1)
    tr = np.maximum(high - low,
         np.maximum(np.abs(high - prev),
                    np.abs(low  - prev))).copy()
    tr[0] = high[0] - low[0]
    return pd.Series(tr).rolling(period, min_periods=1).mean().values

def _stoch(high, low, close, k=14, d=3):
    lo = pd.Series(low).rolling(k,  min_periods=1).min().values
    hi = pd.Series(high).rolling(k, min_periods=1).max().values
    k_pct = 100 * (close - lo) / (hi - lo + 1e-10)
    d_pct = pd.Series(k_pct).rolling(d, min_periods=1).mean().values
    return k_pct, d_pct

def _williams_r(high, low, close, period=14):
    hi = pd.Series(high).rolling(period, min_periods=1).max().values
    lo = pd.Series(low).rolling(period,  min_periods=1).min().values
    return -100 * (hi - close) / (hi - lo + 1e-10)

def _obv(close, volume):
    direction = np.sign(np.diff(close, prepend=close[0]))
    return np.cumsum(direction * volume)

def _cmf(high, low, close, volume, period=20):
    mfm = ((close - low) - (high - close)) / (high - low + 1e-10)
    mfv = mfm * volume
    return pd.Series(mfv).rolling(period, min_periods=1).sum().values / \
           (pd.Series(volume).rolling(period, min_periods=1).sum().values + 1e-10)

def build_features(df, close):
    """
    ~35 features per bar — all computed in log-return / ratio space
    so the model sees stationary, scale-invariant inputs.
    """
    close  = np.array(close, dtype=float)   # always writable
    n = len(close)
    high   = np.array(df['High'].values.flatten(),   dtype=float) if 'High'   in df.columns else close.copy()
    low    = np.array(df['Low'].values.flatten(),    dtype=float) if 'Low'    in df.columns else close.copy()
    volume = np.array(df['Volume'].values.flatten(), dtype=float) if 'Volume' in df.columns else np.ones(n)
    volume = np.where(volume == 0, 1.0, volume)

    log_ret = np.log(close / np.roll(close, 1)).copy(); log_ret[0] = 0

    # EMAs
    e5,  e10, e20  = _ema(close, 5),  _ema(close, 10), _ema(close, 20)
    e50, e100      = _ema(close, 50), _ema(close, 100)

    # Price / EMA ratios
    r5   = close / (e5   + 1e-10) - 1
    r10  = close / (e10  + 1e-10) - 1
    r20  = close / (e20  + 1e-10) - 1
    r50  = close / (e50  + 1e-10) - 1
    r100 = close / (e100 + 1e-10) - 1

    # EMA cross
    cross_s  = e5  / (e20  + 1e-10) - 1   # short-term trend
    cross_m  = e20 / (e100 + 1e-10) - 1   # medium trend

    # MACD
    macd     = _ema(close, 12) - _ema(close, 26)
    macd_sig = _ema(macd, 9)
    macd_h   = macd - macd_sig

    # Bollinger Bands (20, 2)
    bb_mid = pd.Series(close).rolling(20, min_periods=1).mean().values
    bb_std = pd.Series(close).rolling(20, min_periods=1).std().fillna(0).values
    bb_pos = (close - (bb_mid - 2*bb_std)) / (4*bb_std + 1e-10)   # 0=lower, 1=upper
    bb_wid = 4 * bb_std / (bb_mid + 1e-10)

    # RSI (7 and 14)
    rsi7  = _rsi(close, 7)  / 100
    rsi14 = _rsi(close, 14) / 100

    # ATR (normalised by close)
    atr14 = _atr(high, low, close, 14) / (close + 1e-10)

    # Stochastic
    stoch_k, stoch_d = _stoch(high, low, close)
    stoch_k = stoch_k.copy() / 100
    stoch_d = stoch_d.copy() / 100

    # Williams %R
    will_r = (_williams_r(high, low, close) + 100) / 100   # normalised 0–1

    # OBV (normalised)
    obv = _obv(close, volume)
    obv_norm = obv / (np.abs(obv).max() + 1e-10)

    # Chaikin Money Flow
    cmf20 = _cmf(high, low, close, volume)

    # Momentum returns (5, 10, 20, 60 day)
    def safe_ret(k):
        r = np.roll(close, k).copy(); r[:k] = close[:k]
        return close / (r + 1e-10) - 1
    mom5, mom10, mom20, mom60 = safe_ret(5), safe_ret(10), safe_ret(20), safe_ret(60)

    # Rolling volatility (10, 20)
    vol10 = pd.Series(log_ret).rolling(10, min_periods=1).std().fillna(0).values
    vol20 = pd.Series(log_ret).rolling(20, min_periods=1).std().fillna(0).values

    # Volume momentum
    vol_ma20 = pd.Series(volume).rolling(20, min_periods=1).mean().values
    vol_ratio = volume / (vol_ma20 + 1e-10) - 1

    # High-Low range
    hl_range = (high - low) / (close + 1e-10)

    # Lag returns
    lag1 = np.roll(log_ret, 1).copy(); lag1[0] = 0
    lag2 = np.roll(log_ret, 2).copy(); lag2[:2] = 0
    lag3 = np.roll(log_ret, 3).copy(); lag3[:3] = 0

    X = np.column_stack([
        log_ret, lag1, lag2, lag3,
        r5, r10, r20, r50, r100,
        cross_s, cross_m,
        macd / (close + 1e-10), macd_sig / (close + 1e-10), macd_h / (close + 1e-10),
        bb_pos, bb_wid,
        rsi7, rsi14,
        atr14,
        stoch_k, stoch_d,
        will_r,
        obv_norm, cmf20,
        mom5, mom10, mom20, mom60,
        vol10, vol20,
        vol_ratio, hl_range,
    ])
    X = np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)
    return X


# ── Ensemble model ────────────────────────────────────────────────────────────

def build_supervised(features, target_returns, horizon=1):
    """Predict log-return `horizon` steps ahead from feature vector at t."""
    X, y = [], []
    for i in range(len(features) - horizon):
        X.append(features[i])
        y.append(target_returns[i + horizon])
    return np.array(X), np.array(y)


def train_ensemble(X_tr, y_tr):
    rf  = RandomForestRegressor(
              n_estimators=400, max_depth=12, min_samples_leaf=4,
              max_features='sqrt', n_jobs=-1, random_state=42)
    gbr = GradientBoostingRegressor(
              n_estimators=300, max_depth=5, learning_rate=0.04,
              subsample=0.8, min_samples_leaf=5, random_state=42)
    et  = ExtraTreesRegressor(
              n_estimators=400, max_depth=12, min_samples_leaf=4,
              max_features='sqrt', n_jobs=-1, random_state=42)
    ridge = Ridge(alpha=1.0)

    rf.fit(X_tr, y_tr)
    gbr.fit(X_tr, y_tr)
    et.fit(X_tr, y_tr)
    # Stack: use predictions of base models as features for Ridge meta-learner
    p_rf  = rf.predict(X_tr)
    p_gbr = gbr.predict(X_tr)
    p_et  = et.predict(X_tr)
    meta_X = np.column_stack([p_rf, p_gbr, p_et])
    ridge.fit(meta_X, y_tr)
    return rf, gbr, et, ridge


def predict_ensemble(models, X):
    rf, gbr, et, ridge = models
    p_rf  = rf.predict(X)
    p_gbr = gbr.predict(X)
    p_et  = et.predict(X)
    meta_X = np.column_stack([p_rf, p_gbr, p_et])
    return ridge.predict(meta_X)


def run_model(df, close, pred_days):
    """
    Train ensemble on log-returns with rich features.
    Returns: models, features, log_returns, split index, X_test, y_test_prices, y_pred_prices
    """
    close      = np.array(close, dtype=float)   # ensure writable copy
    features   = build_features(df, close)
    log_ret    = np.log(close / np.roll(close, 1)).copy(); log_ret[0] = 0

    X, y = build_supervised(features, log_ret, horizon=1)
    if len(X) < 60:
        raise ValueError('Not enough data — expand the date range.')

    split  = int(len(X) * 0.80)
    X_tr, X_te = X[:split], X[split:]
    y_tr, y_te = y[:split], y[split:]

    scaler = RobustScaler()
    X_tr_s = scaler.fit_transform(X_tr)
    X_te_s = scaler.transform(X_te)

    models = train_ensemble(X_tr_s, y_tr)

    # Reconstruct prices from predicted log-returns on test set
    pred_rets  = predict_ensemble(models, X_te_s)
    base_prices = close[split:split + len(X_te)]   # price at each test-step start
    y_pred_px   = base_prices * np.exp(pred_rets)
    y_actual_px = close[split + 1:split + 1 + len(X_te)]
    # align lengths
    min_len = min(len(y_pred_px), len(y_actual_px))
    y_pred_px   = y_pred_px[:min_len]
    y_actual_px = y_actual_px[:min_len]

    return models, scaler, features, log_ret, split, X_te_s, y_actual_px, y_pred_px


def forecast_future(models, scaler, df, close, n_days):
    """Iterative multi-step forecast in log-return space."""
    # Build live feature state — append predicted rows step by step
    sim_df    = df.copy()
    sim_close = list(close)
    preds     = []

    for _ in range(n_days):
        close_arr = np.array(sim_close, dtype=float)
        feats = build_features(sim_df, close_arr)
        x     = scaler.transform(feats[[-1]])
        ret   = float(predict_ensemble(models, x)[0])
        ret   = max(-0.15, min(0.15, ret))   # clamp ±15%
        next_p = sim_close[-1] * math.exp(ret)
        preds.append(round(next_p, 4))

        # Append a synthetic row so build_features sees updated OHLCV
        new_row = {c: sim_df.iloc[-1][c] for c in sim_df.columns}
        for col in ('Close', 'Open', 'High', 'Low'):
            if col in new_row:
                new_row[col] = next_p
        sim_df = pd.concat([sim_df, pd.DataFrame([new_row])], ignore_index=True)
        sim_close.append(next_p)

    return preds


CURR_MAP = {
    '.NS': '₹', '.BO': '₹', '.L': '£', '.PA': '€', '.DE': '€',
    '.TO': 'CA$', '.AX': 'A$', '.HK': 'HK$', '.T': '¥',
}

def get_currency_symbol(symbol):
    for suffix, sym in CURR_MAP.items():
        if symbol.upper().endswith(suffix):
            return sym
    return '$'


def future_dates(last_dt, n):
    out = []
    for i in range(1, n + 1):
        d = last_dt + pd.Timedelta(days=i)
        while d.weekday() >= 5:
            d += pd.Timedelta(days=1)
        out.append(str(d.date()))
    return out


# ── Routes ────────────────────────────────────────────────────────────────────

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    # Let /api/* routes fall through to their own handlers (registered after)
    # but Flask matches routes in order of specificity, so /api/* routes win.
    # This catch-all only fires for non-API paths.
    if os.path.isdir(DIST_DIR):
        file_path = os.path.join(DIST_DIR, path)
        if path and os.path.isfile(file_path):
            return send_from_directory(DIST_DIR, path)
        return send_from_directory(DIST_DIR, 'index.html')
    # Fallback when frontend hasn't been built yet
    return jsonify({
        'status': 'online',
        'message': 'QuantEdge Stock Prediction API is running.',
        'endpoints': {
            'health': '/api/health',
            'predict': '/api/predict (POST)',
            'report': '/api/report (POST)',
        }
    })


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
    if len(close) < 80:
        return jsonify({'error': 'Need at least 80 trading days. Expand the date range.'}), 400

    try:
        models, scaler, features, log_ret, split, X_te_s, y_actual, y_pred = \
            run_model(df, close, pred_days)
        fut_prices = forecast_future(models, scaler, df, close, fut_days)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500

    rmse = math.sqrt(mean_squared_error(y_actual, y_pred))

    fut_dates_ = future_dates(df.index[-1], fut_days)

    s20  = sma(close, 20)
    s100 = sma(close, 100)

    historical = [
        {'date': dates[i], 'close': float(close[i]),
         'sma20': s20[i], 'sma100': s100[i]}
        for i in range(len(dates))
    ]

    # Align test arrays with historical (offset = split+1 because we predict ret[i+1])
    test_off = split + 1
    n_pad    = len(close) - test_off - len(y_actual)
    test_actual_arr  = [None] * test_off + [float(v) for v in y_actual] + [None] * max(0, n_pad)
    test_pred_arr    = [None] * test_off + [float(v) for v in y_pred]   + [None] * max(0, n_pad)

    return jsonify({
        'symbol':         symbol,
        'currencySymbol': get_currency_symbol(symbol),
        'historical':     historical,
        'future':         [{'date': d, 'predicted': p} for d, p in zip(fut_dates_, fut_prices)],
        'test_actual':    test_actual_arr,
        'test_predicted': test_pred_arr,
        'metrics': {
            'rmse':           round(float(rmse), 4),
            'current_price':  float(close[-1]),
            'predicted_next': fut_prices[0] if fut_prices else None,
            'price_change':   float(close[-1] - close[0]),
            'pct_change':     round(float((close[-1] - close[0]) / close[0] * 100), 2),
            'data_points':    len(close),
            'train_size':     split,
            'test_size':      len(y_actual),
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
    if len(close) < 80:
        return jsonify({'error': 'Need at least 80 trading days for report.'}), 400

    try:
        models, scaler, features, log_ret, split, X_te_s, y_actual, y_pred = \
            run_model(df, close, pred_days)
        fut_prices = forecast_future(models, scaler, df, close, fut_days)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500

    rmse       = math.sqrt(mean_squared_error(y_actual, y_pred))
    fut_dates_ = future_dates(df.index[-1], fut_days)
    curr_sym   = get_currency_symbol(symbol)

    s20  = np.array([v if v is not None else np.nan for v in sma(close, 20)])
    s100 = np.array([v if v is not None else np.nan for v in sma(close, 100)])

    # Chart 1 – Close Price History
    fig, ax = plt.subplots(figsize=(12, 4.5))
    ax.plot(close, color=GOLD, linewidth=1.5, label='Close Price')
    ax.fill_between(range(len(close)), close, alpha=0.08, color=GOLD)
    ax.set_title(f'{symbol} – Close Price History')
    ax.set_xlabel('Trading Days'); ax.set_ylabel(f'Price ({curr_sym})')
    ax.legend(); ax.grid(True)
    chart_history = fig_to_b64(fig)

    # Chart 2 – Moving Averages
    fig, ax = plt.subplots(figsize=(12, 4.5))
    ax.plot(close, color=GOLD, linewidth=1.2, label='Close Price', alpha=0.8)
    ax.plot(s20,   color=BLUE,   linewidth=1.5, linestyle='--', label='SMA 20')
    ax.plot(s100,  color=PURPLE, linewidth=1.5, linestyle='--', label='SMA 100')
    ax.set_title(f'{symbol} – Close Price & Moving Averages')
    ax.set_xlabel('Trading Days'); ax.set_ylabel(f'Price ({curr_sym})')
    ax.legend(); ax.grid(True)
    chart_sma = fig_to_b64(fig)

    # Chart 3 – Actual vs Predicted
    fig, ax = plt.subplots(figsize=(12, 4.5))
    ax.plot(y_actual, color=GOLD,  linewidth=1.5, label='Actual Price')
    ax.plot(y_pred,   color=BLUE,  linewidth=1.5, linestyle='--', label='Predicted (RF)')
    ax.set_title(f'{symbol} – Actual vs Predicted (Test Set)  |  RMSE: {curr_sym}{rmse:.2f}')
    ax.set_xlabel('Test Days'); ax.set_ylabel(f'Price ({curr_sym})')
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
    ax.set_xlabel('Trading Days'); ax.set_ylabel(f'Price ({curr_sym})')
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
    ax.set_xlabel(f'Price ({curr_sym})'); ax.set_ylabel('Frequency')
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
            'rmse': round(float(rmse), 4),
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
                    f'The price started at {curr_sym}{close[0]:.2f} and '
                    f'{"rose" if close[-1] > close[0] else "fell"} to {curr_sym}{close[-1]:.2f} — '
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
                    f'Ensemble model (Random Forest + Gradient Boosting + Extra Trees + Ridge meta-learner) '
                    f'evaluated on {len(y_actual)} held-out test days. '
                    f'RMSE: {curr_sym}{rmse:.2f}. Features include RSI, MACD, Bollinger Bands, ATR, Stochastics, '
                    f'OBV, Chaikin Money Flow, momentum across 5/10/20/60-day windows, and EMA crossovers.'
                ),
            },
            {
                'id': 'future', 'title': f'Future Price Prediction (Next {fut_days} Days)',
                'image': chart_future,
                'description': (
                    f'Iterative {fut_days}-day forecast starting from {str(df.index[-1].date())}. '
                    f'Each predicted value is fed back as input for the next step. '
                    f'Next trading day prediction: {curr_sym}{fut_prices[0]:.2f} '
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
                    f'Median: {curr_sym}{np.median(close):.2f} | Min: {curr_sym}{close.min():.2f} | '
                    f'Max: {curr_sym}{close.max():.2f} | Std Dev: {curr_sym}{close.std():.2f}. '
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
