#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "          Starting Sellix Trace Platform"
echo "=========================================================="

# 1. Free port 8000 if occupied
PID=$(lsof -ti:8000 || true)
if [ -n "$PID" ]; then
  echo "[*] Freeing port 8000 (killing PID: $PID)..."
  kill -9 $PID 2>/dev/null || true
  sleep 1
fi

# 2. Ensure virtualenv exists
if [ ! -d "backend/venv" ]; then
  echo "[*] Creating Python virtual environment..."
  python3 -m venv backend/venv
  ./backend/venv/bin/pip install --upgrade pip
  ./backend/venv/bin/pip install -r backend/requirements.txt
fi

# 3. Seed database
echo "[*] Seeding deterministic synthetic intelligence data..."
PYTHONPATH=. ./backend/venv/bin/python -m backend.app.seed.generator

# 4. Build frontend if dist doesn't exist
if [ ! -d "frontend/dist" ]; then
  echo "[*] Building frontend assets..."
  cd frontend
  npm install
  npm run build
  cd ..
fi

echo ""
echo "=========================================================="
echo "  🚀 Sellix Trace is READY!"
echo ""
echo "  Landing Page:   http://127.0.0.1:8000/"
echo "  Analyst App:    http://127.0.0.1:8000/app/"
echo "  API Docs:       http://127.0.0.1:8000/docs"
echo "=========================================================="
echo ""

# Try opening in browser on Mac
if command -v open >/dev/null 2>&1; then
  echo "[*] Opening in browser..."
  open "http://127.0.0.1:8000/" || true
fi

# 5. Start server
echo "[*] Launching server on http://127.0.0.1:8000 ..."
PYTHONPATH=. ./backend/venv/bin/python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
