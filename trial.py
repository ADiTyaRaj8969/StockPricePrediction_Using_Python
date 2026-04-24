# Stock Price Prediction
import os
import time  
import numpy as np
import matplotlib.pyplot as plt
import pandas as pd
import yfinance as yf
import datetime as dt
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, LSTM, Dropout
import seaborn as sns

company = "AAPL"
start = dt.datetime(2024, 1, 1)
end = dt.datetime(2025, 6, 16)

# Download stock data
data = yf.download(company, start=start, end=end)

# Validate 'Close' column
if 'Close' not in data.columns:
    raise KeyError("The 'Close' column is missing from the dataset.")

# Scale the data
scalar = MinMaxScaler(feature_range=(0, 1))
scaled_data = scalar.fit_transform(data['Close'].values.reshape(-1, 1))

# Prepare training data
prediction_days = int(input('Enter no of days for prediction: '))
x_train, y_train = [], []

for x in range(prediction_days, len(scaled_data)):
    x_train.append(scaled_data[x - prediction_days:x, 0])
    y_train.append(scaled_data[x, 0])

x_train, y_train = np.array(x_train), np.array(y_train)
x_train = np.reshape(x_train, (x_train.shape[0], x_train.shape[1], 1))

# Build LSTM model
model = Sequential([
    LSTM(units=100, return_sequences=True, input_shape=(x_train.shape[1], 1)),
    Dropout(0.2),
    LSTM(units=100, return_sequences=True),
    Dropout(0.2),
    LSTM(units=100),
    Dropout(0.2),
    Dense(units=1)
])
model.compile(optimizer='adam', loss='mean_squared_error')
model.fit(x_train, y_train, batch_size=64, epochs=100)

# Test the model
test_start = dt.datetime(2020, 1, 1)
test_end = dt.datetime.now()
test_data = yf.download(company, start=test_start, end=test_end)

# Validate 'Close' column in test data
if 'Close' not in test_data.columns:
    raise KeyError("The 'Close' column is missing from the test dataset.")

actual_price = test_data['Close'].values
total_dataset = pd.concat((data['Close'], test_data['Close']), axis=0)
model_inputs = total_dataset[len(total_dataset) - len(test_data) - prediction_days:].values
model_inputs = model_inputs.reshape(-1, 1)
model_inputs = scalar.transform(model_inputs)

# Prepare test inputs
x_test = []
for x in range(prediction_days, len(model_inputs)):
    x_test.append(model_inputs[x - prediction_days:x, 0])

x_test = np.array(x_test)
x_test = np.reshape(x_test, (x_test.shape[0], x_test.shape[1], 1))
predicted_price = model.predict(x_test)
predicted_price = scalar.inverse_transform(predicted_price)

# Plot predictions
plt.figure(figsize=(14, 7))
plt.plot(actual_price, color='black', label=f"Actual {company} prices")
plt.plot(predicted_price, color='green', label=f"Predicted {company} prices")
plt.title('Stock Price Prediction')
plt.xlabel('Time')
plt.ylabel('Price')
plt.legend()

# Predict next day price
real_data = model_inputs[len(model_inputs) - prediction_days:len(model_inputs), 0]
real_data = np.array(real_data).reshape(1, prediction_days, 1)
next_day_prediction = model.predict(real_data)
next_day_prediction = scalar.inverse_transform(next_day_prediction)

plt.scatter(len(actual_price), next_day_prediction, color='red', label='Next Day Prediction', zorder=5)
plt.axvline(x=len(actual_price) - 1, color='red', linestyle='--')
plt.legend()
plt.grid(True)
plt.show()

print(f"Predicted price of {company} stock for the next day: {next_day_prediction[0][0]}")

# Additional Visualizations
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

# Close Price and Moving Averages
short_window, long_window = 20, 100
data = data.assign(
    SMA20=data['Close'].rolling(window=short_window).mean(),
    SMA100=data['Close'].rolling(window=long_window).mean()
)

plt.figure(figsize=(14, 7))
plt.plot(data['Close'], label='Closing Price', color='blue')
plt.plot(data['SMA20'], label=f'{short_window}-Day SMA', color='green', linestyle='--')
plt.plot(data['SMA100'], label=f'{long_window}-Day SMA', color='red', linestyle='--')
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
