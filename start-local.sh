#!/usr/bin/env bash
# ==============================================================================
# Curvada's Kitchen - Localhost BE & FE Startup Script
# ==============================================================================
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "=========================================================="
echo "   Curvada's Kitchen - Launching Local Development"
echo "=========================================================="
echo "   Backend API & WS: http://localhost:5000"
echo "   Frontend Web App: http://localhost:3000"
echo "=========================================================="

if [ ! -d "node_modules" ]; then
  echo "📦 Installing root frontend dependencies..."
  npm install
fi

if [ ! -d "backend/node_modules" ]; then
  echo "📦 Installing backend dependencies..."
  npm --prefix backend install
fi

echo "🚀 Starting Backend and Frontend concurrently..."
npm run dev:all
