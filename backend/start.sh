#!/bin/bash
set -e

echo "Starting backend server via Gunicorn..."

exec gunicorn app.main:app \
  --worker-class uvicorn.workers.UvicornWorker \
  --workers ${WEB_CONCURRENCY:-1} \
  --bind 0.0.0.0:${PORT}
