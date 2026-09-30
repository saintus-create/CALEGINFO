#!/bin/sh
set -eu

/usr/local/bin/sandbox-api &

echo "Waiting for sandbox API..."
while ! nc -z 127.0.0.1 8080; do
  sleep 0.1
done
echo "Sandbox API ready"

cd /app

while true; do
  echo "Starting California Legislative Information server on 0.0.0.0:3000"
  pnpm exec next start -H 0.0.0.0 -p 3000
  echo "Server exited; restarting in 2s"
  sleep 2
done &

wait
