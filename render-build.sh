#!/usr/bin/env bash
# render-build.sh — Render Build Script
# Runs during the "Build" phase on Render Web Service
set -euo pipefail

echo "=== [1/4] Installing backend dependencies ==="
cd backend
npm ci
npm run build
cd ..

echo "=== [2/4] Installing frontend dependencies ==="
cd frontend
npm ci
npm run build
cd ..

echo "=== [3/4] Running database migrations ==="
node render-migrate.js

echo "=== [4/4] Build complete! ==="
