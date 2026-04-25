#!/usr/bin/env bash
set -e

echo ">>> Building React frontend..."
cd website
npm install
npm run build
cd ..

echo ">>> Copying dist to backend..."
rm -rf backend/dist
cp -r website/dist backend/dist

echo ">>> Installing Python dependencies..."
pip install -r backend/requirements.txt

echo ">>> Build complete."
