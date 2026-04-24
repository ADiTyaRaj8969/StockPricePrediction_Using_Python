# Stock Price Prediction without TensorFlow
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import yfinance as yf
import datetime as dt
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_squared_error

# Parameters
company = "AAPL"
start = dt.datetime(2024, 1, 1)
end = dt.datetime(2025, 5, 11)
prediction_days = int(input('Enter no of days for prediction: '))

# Download stock data
data = yf.download(company, start=start, end=end)
if 'Close' not in data.columns:
    raise KeyError("The 'Close' column is missing from the dataset.")

# Scale 'Close' prices
scaler = MinMaxScaler(feature_range=(0, 1))
data_scaled = scaler.fit_transform(data[['Close']])

# Create features and labels
x, y = [], []
for i in range(prediction_days, len(data_scaled)):
    x.append(data_scaled[i - prediction_days:i, 0])
    y.append(data_scaled[i, 0])

x, y = np.array(x), np.array(y)

# Train-test split
split = int(len(x) * 0.8)
x_train, x_test = x[:split], x[split:]
y_train, y_test = y[:split], y[split:]

# Train Random Forest model
model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(x_train, y_train)

# Predict
predicted_scaled = model.predict(x_test)
predicted_prices = scaler.inverse_transform(predicted_scaled.reshape(-1, 1))
actual_prices = scaler.inverse_transform(y_test.reshape(-1, 1))

# Plot predictions
plt.figure(figsize=(14, 7))
plt.plot(actual_prices, color='black', label='Actual Prices')
plt.plot(predicted_prices, color='green', label='Predicted Prices')
plt.title(f'{company} Stock Price Prediction (Random Forest)')
plt.xlabel('Time')
plt.ylabel('Price')
plt.legend()
plt.grid(True)
plt.show()

# Predict next day
last_sequence = data_scaled[-prediction_days:].reshape(1, -1)
next_day_scaled = model.predict(last_sequence)
next_day_price = scaler.inverse_transform(next_day_scaled.reshape(-1, 1))

print(f"Predicted price of {company} stock for the next day: {next_day_price[0][0]:.2f}")

# Extra Visualizations
# Close Price History
plt.figure(figsize=(14, 7))
plt.plot(data['Close'], label='Closing Price', color='blue')
plt.title(f'{company} Close Price History')
plt.xlabel('Time')
plt.ylabel('Close Price')
plt.legend()
plt.grid(True)
plt.show()

# Distribution of Closing Price
plt.figure(figsize=(14, 7))
sns.histplot(data['Close'], bins=50, kde=True, color='purple')
plt.title(f'{company} Close Price Distribution')
plt.xlabel('Close Price')
plt.ylabel('Frequency')
plt.grid(True)
plt.show()

# Moving Averages
data['SMA20'] = data['Close'].rolling(window=20).mean()
data['SMA100'] = data['Close'].rolling(window=100).mean()

plt.figure(figsize=(14, 7))
plt.plot(data['Close'], label='Closing Price', color='blue')
plt.plot(data['SMA20'], label='20-Day SMA', color='green', linestyle='--')
plt.plot(data['SMA100'], label='100-Day SMA', color='red', linestyle='--')
plt.title(f'{company} Close Price and Moving Averages')
plt.xlabel('Time')
plt.ylabel('Close Price')
plt.legend()
plt.grid(True)
plt.show()

# Correlation Matrix
correlation_matrix = data.corr()
plt.figure(figsize=(10, 8))
sns.heatmap(correlation_matrix, annot=True, cmap='coolwarm', fmt=".2f", linewidths=0.5)
plt.title(f'{company} Correlation Matrix')
plt.show()







