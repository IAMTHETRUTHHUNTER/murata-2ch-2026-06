#!/bin/bash
set -e

echo "Initializing database and seeding sample data..."
python seed.py

echo "Starting uvicorn..."
exec uvicorn main:app --host 0.0.0.0 --port 8000
